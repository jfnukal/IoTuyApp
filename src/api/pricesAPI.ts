// src/api/pricesAPI.ts
//
// Načítání letákových cen z Firestore a jejich cache. SAMOTNÉ HLEDÁNÍ tady
// není — sedí v `priceMatching.ts`, který nezná Firebase a jde proto vyzkoušet
// nasucho proti uloženému vzorku letáků (`npm run test:ceny`).
// Kdo mění chování vyhledávání, patří tam, ne sem.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { dnesniDatum } from '../hooks/useDnes';
import { findCanonical, learnAlias as naucAlias } from './aliasesAPI';
import {
  hledejVNabidkach,
  nabidniDruhy,
  type Druh,
  type PriceDeal,
  type PriceResult,
} from './priceMatching';

export type { PriceResult, Druh } from './priceMatching';

/**
 * CENY SE NEPODAŘILO NAČÍST (převzato z Family-Dashboard, prověrka 10-5).
 *
 * Dřív se výpadek databáze tvářil jako „nic nenalezeno": `loadDeals` vrátil
 * prázdné pole a ruční hledání pak tvrdilo „Pro mléko nebyla nalezena žádná
 * akce" — nepravda. `findAllDeals` teď tuhle chybu VYHODÍ a kdo ji volá,
 * řekne „ceny teď nejsou k dispozici" (text `TEXT_CENY_NEDOSTUPNE`).
 * Starší ceny z paměti se při výpadku použijí dál — ty jsou pořád pravda.
 */
export class CenyNedostupneError extends Error {
  constructor(pricina?: unknown) {
    super('Ceny z letáků se teď nepodařilo načíst.');
    this.name = 'CenyNedostupneError';
    if (pricina) console.error('[PricesAPI] Ceny nedostupné:', pricina);
  }
}

/** Věta pro hlášku, když se ceny nepodařilo načíst. */
export const TEXT_CENY_NEDOSTUPNE =
  'Ceny z letáků se teď nepodařilo načíst — nejspíš chvilkový výpadek nebo chybí internet. '
  + 'Zkus to prosím za chvíli znovu.';

// Cache pro deals - načteme jednou a pak hledáme lokálně
let cachedDeals: PriceDeal[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minut - data se mění max 1x týdně

// Cache pro výsledky hledání - aby se nevolalo znovu pro stejné položky
const searchCache = new Map<string, { offers: PriceResult[]; timestamp: number }>();
const SEARCH_CACHE_DURATION = 10 * 60 * 1000; // 10 minut

// Totéž pro nabídku druhů („cos myslel?"). Vlastní mapa, ať se nemíchá
// s cenami — obojí se počítá z týchž dat, ale odpovídá na jinou otázku.
const druhyCache = new Map<string, { druhy: Druh[]; timestamp: number }>();

/** Kterou dávku cen už tenhle prohlížeč jednou stáhl. */
const KLIC_VERZE = 'ceny-verze-davky';

const precti = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null; // soukromé okno, zaplněné úložiště…
  }
};
const zapis = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* nevadí — příště se stáhne znovu */
  }
};

/**
 * Načte letákové ceny.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PROČ TO NENÍ PROSTĚ `getDocs`
 * ══════════════════════════════════════════════════════════════════════════
 * Bylo. A byla to nejdražší věc v celé appce. Firestore neúčtuje dotazy, ale
 * PŘEČTENÉ DOKUMENTY — takže jeden řádek `getDocs(collection('priceDeals'))`
 * se počítá jako přes dva tisíce čtení. Při každém načtení stránky.
 *
 * Ceny se přitom mění DVAKRÁT TÝDNĚ (po běhu scraperu) a jsou pro všechny
 * stejné. Nově se proto čte nejdřív jeden titěrný dokument `priceIndex`
 * s verzí dávky (1 čtení). Když se verze nezměnila, vytáhnou se ceny
 * z OFFLINE PAMĚTI prohlížeče přes `getDocsFromCache` — a to Firestore
 * neúčtuje vůbec, protože na server vůbec nesáhne.
 *
 * Celá kolekce se tak stahuje jen po novém letáku, ne při každém startu.
 *
 * Když razítko chybí nebo offline paměť není k dispozici, spadne se na
 * původní chování — appka funguje jako dosud, jen dráž.
 */
/* ⚠️ JEDNO NAČÍTÁNÍ NAJEDNOU (převzato z Family-Dashboard, 19. 9. 2026).
   Každá cenovka v seznamu se ptá sama a všechny se zeptají ve stejnou chvíli
   (po vteřině od vykreslení). Dokud první nedoběhla, cache byla prázdná —
   a každá si tak stáhla celou kolekci znovu: seznam s deseti položkami =
   deset stažení po dvou tisících čteních. Teď čekají všechny na TOTÉŽ. */
let probihaNacitani: Promise<PriceDeal[]> | null = null;

const loadDeals = (): Promise<PriceDeal[]> => {
  if (cachedDeals && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return Promise.resolve(cachedDeals);
  }
  if (!probihaNacitani) {
    probihaNacitani = nactiDeals().finally(() => { probihaNacitani = null; });
  }
  return probihaNacitani;
};

const nactiDeals = async (): Promise<PriceDeal[]> => {
  const now = Date.now();

  // 1 čtení: jaká je nejnovější dávka cen?
  let verzeNaServeru: string | null = null;
  try {
    const razitko = await getDoc(doc(db, 'priceIndex', 'aktualni'));
    verzeNaServeru = (razitko.data()?.verze as string | undefined) ?? null;
  } catch {
    /* razítko není povinné — jede se dál po starém */
  }

  const dealsRef = collection(db, 'priceDeals');

  // Verze sedí → ceny už v prohlížeči jsou. Na server se vůbec nesahá.
  if (verzeNaServeru && verzeNaServeru === precti(KLIC_VERZE)) {
    try {
      const zPameti = await getDocsFromCache(dealsRef);
      if (!zPameti.empty) {
        cachedDeals = zPameti.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as PriceDeal[];
        cacheTimestamp = now;
        return cachedDeals;
      }
    } catch {
      /* offline paměť není k dispozici → stáhneme ze serveru */
    }
  }

  let snapshot;
  try {
    snapshot = await getDocs(dealsRef);
  } catch (error) {
    /* Starší ceny z paměti jsou pořád pravda — ty se použijí. Bez nich
       je to VÝPADEK, ne „žádná akce". */
    if (cachedDeals) return cachedDeals;
    throw new CenyNedostupneError(error);
  }
  /* Bez internetu `getDocs` nespadne, ale vrátí jen to, co je v offline
     paměti — a ta může být prázdná. Prázdno „z paměti" není „žádné akce". */
  if (snapshot.empty && snapshot.metadata?.fromCache) {
    if (cachedDeals) return cachedDeals;
    throw new CenyNedostupneError('offline, v paměti nic není');
  }
  cachedDeals = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as PriceDeal[];
  cacheTimestamp = now;
  if (verzeNaServeru) zapis(KLIC_VERZE, verzeNaServeru);
  return cachedDeals;
};

// Hlavní funkce - hledá nejlepší cenu pro produkt
export const checkProductPrice = async (productName: string): Promise<PriceResult | null> => {
  try {
    if (!productName || productName.length < 3) return null;

    const results = await findAllDeals(productName);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('[PricesAPI] Chyba při hledání ceny:', error);
    return null;
  }
};

/**
 * Najde všechny nabídky pro produkt (ze všech obchodů).
 *
 * ⚠️ Když se ceny nepodařilo načíst, VYHODÍ `CenyNedostupneError` —
 * prázdné pole znamená jen „opravdu žádná akce". Kdo volá, musí chybu
 * chytit a říct ji (`TEXT_CENY_NEDOSTUPNE`).
 */
export const findAllDeals = async (productName: string): Promise<PriceResult[]> => {
  try {
    if (!productName || productName.length < 3) return [];

    // Kontrola cache pro toto hledání
    const cacheKey = productName.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < SEARCH_CACHE_DURATION) {
      return cached.offers;
    }

    const deals = await loadDeals();
    if (deals.length === 0) return [];

    // Naučené aliasy rodiny (např. „žervé → lučina")
    const canonicals = await findCanonical(productName);

    /* Dnešek MÍSTNĚ, ne v UTC (převzato z Family-Dashboard): `toISOString`
       je do dvou ráno ještě včerejšek, takže akce končící včera svítila
       jako platná a akce od dneška jako budoucí. */
    const dnes = dnesniDatum();
    const results = hledejVNabidkach(productName, deals, canonicals, dnes);

    // Uložit do cache
    searchCache.set(cacheKey, { offers: results, timestamp: Date.now() });

    return results;
  } catch (error) {
    if (error instanceof CenyNedostupneError) throw error;
    throw new CenyNedostupneError(error);
  }
};

/**
 * „Cos vlastně myslel?" — volby pro obecnou položku typu „káva" nebo
 * „minerálka". Prázdné pole = není z čeho vybírat, ukaž rovnou cenu.
 *
 * Čte z TÝCHŽ načtených dat jako `findAllDeals`, takže to nestojí ani jedno
 * čtení navíc z databáze — jen se na ně kouká jinou optikou.
 */
export const findDruhy = async (productName: string): Promise<Druh[]> => {
  try {
    if (!productName || productName.length < 3) return [];

    const cacheKey = productName.toLowerCase().trim();
    const cached = druhyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
      return cached.druhy;
    }

    const deals = await loadDeals();
    if (deals.length === 0) return [];

    const canonicals = await findCanonical(productName);
    const druhy = nabidniDruhy(productName, deals, canonicals);

    druhyCache.set(cacheKey, { druhy, timestamp: Date.now() });
    return druhy;
  } catch (error) {
    console.error('[PricesAPI] Chyba při hledání druhů:', error);
    return [];
  }
};

// Vymaže cache (užitečné po manuálním refreshi)
export const clearPriceCache = (): void => {
  cachedDeals = null;
  cacheTimestamp = 0;
  searchCache.clear();
  druhyCache.clear();
  /* I zapamatovanou verzi — jinak by se ruční obnovení spokojilo s offline
     pamětí a člověk by dostal zase ta samá data, kvůli kterým obnovoval. */
  try {
    localStorage.removeItem(KLIC_VERZE);
  } catch {
    /* nevadí */
  }
};

/**
 * Zapomene SPOČÍTANÁ HLEDÁNÍ, stažené ceny nechá. Po změně aliasů stačí
 * tohle — `clearPriceCache` by kvůli tomu znovu stáhl celou kolekci
 * `priceDeals` (přes tisíc čtení) pokaždé, když někdo klikne „✕ Špatný".
 */
export const zapomenHledani = (): void => {
  searchCache.clear();
  druhyCache.clear();
};

/**
 * Zapamatuje volbu z cenovky jako alias („káva" → „mletá káva") a zahodí
 * hledání spočítaná BEZ ní. Jinak by cenovka, která se do deseti minut
 * vykreslí znovu (třeba po otevření celého seznamu), vzala výsledek z cache
 * a ptala se na druh podruhé.
 */
export const learnAlias = async (alias: string, canonical: string): Promise<void> => {
  await naucAlias(alias, canonical);
  zapomenHledani();
};

/*
 * TODO: Přidat do SettingsPage možnost konfigurace:
 * - Preferované jednotky (např. jen 0.5l, 1l, 1.5l)
 * - Maximální počet variant na produkt
 * - Preferované obchody
 */
