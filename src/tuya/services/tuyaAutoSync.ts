// src/tuya/services/tuyaAutoSync.ts
// Automatická synchronizace Tuya → Firestore. Běží JEDNA na celou stránku,
// ať useTuya() volá kolik komponent chce (dřív si každá spouštěla vlastní
// časovače = víc volání Tuya API).
//
// Proč ne setInterval od načtení stránky (tak to bylo do 9/2026):
// tablet v kuchyni po chvíli bez dotyku zhasne. Starý kód čekal celý interval
// (teploměry 15 min) NEPŘERUŠENÉHO běhu stránky, než se poprvé zeptal Tuya.
// Po rozsvícení se ale stránka obnoví, časovač jede od nuly a displej mezitím
// zase zhasne — venkovní teplota tak visela i 21 h (24. 9. 2026: ve Firestore
// 13,5 °C ze včerejška, senzor přitom v Tuya hlásil 12,0 °C).
//
// Teď rozhoduje STÁŘÍ DAT ve Firestore: kdykoli je stránka vidět a data
// zařízení jsou starší než jeho interval, stáhnou se hned — tedy pár sekund
// po rozsvícení tabletu. Se zhasnutým displejem se nestahuje nic (nikdo se
// nedívá, šetří se Tuya API). A protože se stáří čte z Firestore, tablet se
// Tuya neptá, když data před chvílí obnovil třeba telefon.
//
// Synchronizují se jen zařízení, která má někdo na obrazovce: hlavní
// obrazovka potřebuje jen venkovní teploměr, stránka Zařízení všechna.

import { deviceService } from '../../services/deviceService';
import { settingsService, type TuyaSyncSettings } from '../../services/settingsService';
import { tuyaService } from './tuyaService';
import type { TuyaDevice } from '../../types';

/** Která zařízení komponenta potřebuje mít čerstvá: 'all' = všechna, jinak jejich ID */
export type AutoSyncScope = 'all' | string[];

const TICK_MS = 30 * 1000; // jak často se kontroluje stáří dat (samo nic nestojí)
const START_DELAY_MS = 3 * 1000; // po načtení / rozsvícení počkat na Wi-Fi a čerstvá data z Firestore
const RETRY_MS = 10 * 1000; // po nepovedeném dotazu za 10 s, pak 20, 40 s… (Wi-Fi po probuzení)
const RETRY_MAX_MS = 15 * 60 * 1000;

const consumers = new Set<{ scope: AutoSyncScope }>();
let active: { uid: string; stop: () => void; checkSoon: (delayMs: number) => void } | null = null;

// Nejdřív kdy se na zařízení smí znovu sáhnout: za celý interval po dotazu,
// i když Tuya pro něj nic nevrátila. Jen v paměti — přežije přepnutí
// stránky, obnovení ne (pak rozhoduje lastChecked ve Firestore).
const nextAttemptAt = new Map<string, number>();
// Po nepovedeném dotazu (síť, Netlify) se chvíli nezkouší nic
let failuresInRow = 0;
let backoffUntil = 0;

/**
 * Přihlásí komponentu k automatické synchronizaci. První přihlášená ji
 * spustí, poslední odhlášená zastaví. Vrací funkci pro odhlášení.
 */
export function startTuyaAutoSync(uid: string, scope: AutoSyncScope): () => void {
  const consumer = { scope };
  consumers.add(consumer);

  if (active?.uid !== uid) {
    active?.stop();
    active = run(uid);
  } else {
    // Nová komponenta (třeba stránka Zařízení) může chtít další zařízení
    active.checkSoon(START_DELAY_MS);
  }

  return () => {
    if (!consumers.delete(consumer)) return;
    if (consumers.size === 0) {
      active?.stop();
      active = null;
    }
  };
}

function run(uid: string) {
  let stopped = false;
  let devices: TuyaDevice[] = [];
  let settings: TuyaSyncSettings | null = null;
  let settingsLoading: Promise<TuyaSyncSettings | null> | null = null;
  let checking = false;
  let firstSnapshot = true;
  let checkTimer: ReturnType<typeof setTimeout> | null = null;
  let discoveryTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribeDevices: (() => void) | null = null;

  // Když se nastavení nenačte (tablet ještě bez Wi-Fi), zkusí se znovu při
  // další kontrole — dřív to spadlo na výchozí „vypnuto" až do obnovení stránky
  const loadSettings = () => {
    settingsLoading ??= settingsService.loadTuyaSyncSettings().then((loaded) => {
      settingsLoading = null;
      if (loaded && !stopped) {
        settings = loaded;
        startDiscovery(loaded);
      }
      return settings;
    });
    return settingsLoading;
  };

  // Plná synchronizace (hledání nových zařízení) beze změny: poběží, jen
  // když stránka vydrží běžet celý interval (výchozí týden)
  const startDiscovery = (s: TuyaSyncSettings) => {
    if (discoveryTimer || !s.enabled || !(s.intervals.discovery > 0)) return;
    discoveryTimer = setInterval(() => {
      tuyaService.syncToFirestore(uid).catch((err) => {
        console.error('❌ Discovery sync selhal:', err);
      });
    }, s.intervals.discovery * 60 * 1000);
  };

  const check = async () => {
    if (stopped || checking) return;
    // Zhasnutý displej / schovaná záložka: nikdo se nedívá → Tuya nechat být
    if (document.visibilityState !== 'visible') return;
    if (!navigator.onLine) return;

    const s = settings ?? (await loadSettings());
    if (stopped || !s?.enabled) return;

    // Časy „z budoucnosti" se berou jen v rozumné míře — kdyby hodiny tabletu
    // skočily pozpátku (nebo telefon, který data zapsal, měl hodiny napřed),
    // nesmí to synchronizaci zablokovat na hodiny
    const now = Date.now();
    if (now < backoffUntil && backoffUntil - now <= RETRY_MAX_MS) return;

    const due = wantedDevices(devices)
      .flatMap((device) => {
        const interval = syncInterval(device, s, now);
        if (interval === null) return [];
        const notBefore = nextAttemptAt.get(device.id) ?? 0;
        if (now < notBefore && notBefore - now <= interval) return [];
        const lastSync = Math.max(device.lastUpdated ?? 0, device.lastChecked ?? 0);
        const age = lastSync - now > interval ? Infinity : now - lastSync;
        return age >= interval ? [{ device, interval }] : [];
      })
      // Nejkratší interval (teploměry) napřed — dostanou se do první dávky
      .sort((a, b) => a.interval - b.interval);

    if (due.length === 0 || checking) return;

    checking = true;
    try {
      console.log(`🔄 Tuya auto-sync: ${due.length} zařízení se starými daty`);
      await tuyaService.syncDevicesStatus(due.map(({ device }) => device));
      failuresInRow = 0;
      due.forEach(({ device, interval }) => nextAttemptAt.set(device.id, now + interval));
    } catch (error) {
      failuresInRow++;
      const wait = Math.min(RETRY_MS * 2 ** (failuresInRow - 1), RETRY_MAX_MS);
      console.warn(`⚠️ Tuya auto-sync selhal, další pokus za ${Math.round(wait / 1000)} s:`, error);
      backoffUntil = Date.now() + wait;
      checkSoon(wait + 100);
    } finally {
      checking = false;
    }
  };

  const checkSoon = (delayMs: number) => {
    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      checkTimer = null;
      check();
    }, delayMs);
  };

  // Rozsvícení displeje / návrat na záložku → hned zkontrolovat stáří dat
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') checkSoon(START_DELAY_MS);
  };
  // Síť je zpátky → nečekat, až vyprší pauza po nepovedeném dotazu
  const onOnline = () => {
    backoffUntil = 0;
    checkSoon(START_DELAY_MS);
  };

  deviceService
    .subscribeToUserDevices(uid, (list) => {
      devices = list;
      if (firstSnapshot) {
        firstSnapshot = false;
        checkSoon(START_DELAY_MS);
      }
    })
    .then((unsubscribe) => {
      if (stopped) unsubscribe();
      else unsubscribeDevices = unsubscribe;
    })
    .catch((err) => {
      console.error('❌ Tuya auto-sync: nepodařilo se načíst zařízení', err);
    });

  loadSettings();
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('online', onOnline);
  const tick = setInterval(check, TICK_MS);

  return {
    uid,
    checkSoon,
    stop: () => {
      stopped = true;
      unsubscribeDevices?.();
      if (checkTimer) clearTimeout(checkTimer);
      if (discoveryTimer) clearInterval(discoveryTimer);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    },
  };
}

/** Zařízení, která má teď někdo na obrazovce */
function wantedDevices(all: TuyaDevice[]): TuyaDevice[] {
  const scopes = [...consumers].map((c) => c.scope);
  if (scopes.includes('all')) return all;
  const ids = new Set(scopes.flat());
  return all.filter((d) => ids.has(d.id));
}

/** Jak stará smí data zařízení být (ms); null = nesynchronizovat */
function syncInterval(device: TuyaDevice, s: TuyaSyncSettings, now: number): number | null {
  const { critical, standard, passive } = s.intervals;
  let minutes = s.criticalCategories.includes(device.category)
    ? critical
    : s.standardCategories.includes(device.category)
      ? standard
      : passive;

  // Offline zařízení se s „jen online" nepřeskakuje navždy (dřív se na něj
  // už nikdy nesáhlo, dokud někdo nespustil plnou synchronizaci) — jen se
  // méně často zkusí, jestli zase nenaskočilo
  if (!device.online && s.syncOnlyOnline) minutes = Math.max(minutes, passive);

  if (!(minutes > 0)) return null;
  return minutes * 60 * 1000 * (isNight(s, now) ? 2 : 1);
}

/** Noční režim — intervaly se zdvojnásobí */
function isNight(s: TuyaSyncSettings, now: number): boolean {
  if (!s.nightModeEnabled) return false;
  const hour = new Date(now).getHours();
  return s.nightModeStart > s.nightModeEnd
    ? hour >= s.nightModeStart || hour < s.nightModeEnd
    : hour >= s.nightModeStart && hour < s.nightModeEnd;
}
