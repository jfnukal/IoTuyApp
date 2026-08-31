// functions/src/letaky.ts
//
// PŘÍJEM LETÁKOVÝCH CEN OD SCRAPERU.
//
// ══════════════════════════════════════════════════════════════════════════
// PROČ TOHLE VZNIKLO
// ══════════════════════════════════════════════════════════════════════════
// Scraper na Apify dosud zapisoval do Firestore PŘÍMO, a to servisním účtem
// `firebase-adminsdk-fbsvc@…`. To je výchozí administrátor Firebase — umí
// číst i mazat cokoli v celé databázi, sáhnout na úložiště a vydávat
// přihlašovací tokeny za libovolného uživatele. Generální klíč od domu ležel
// na cizí platformě jen proto, aby tam někdo mohl vysypat ceny rohlíků.
//
// Tahle funkce ten klíč nahrazuje SDÍLENÝM TAJEMSTVÍM, které umí přesně jednu
// věc: vložit letákové ceny. Nic jiného. Když unikne, útočník může zkazit
// ceny — ne přečíst kalendáře, děti a hesla k Bakalářům.
//
// ══════════════════════════════════════════════════════════════════════════
// CO SE TÍM JEŠTĚ SPRAVILO
// ══════════════════════════════════════════════════════════════════════════
// Normalizace (klíčová slova, kategorie, co patří na seznam) se přesunula
// SEM. Dosud ji dělal scraper a klient měl vlastní kopii slovníku — dvě
// kopie, které se musely ručně držet v souladu. Navíc: když se slovník
// vylepší, data jde teď PŘEPOČÍTAT ZPĚTNĚ, bez čekání na příští leták.
//
// Opraveny při tom dva nálezy ze zadání:
//   S1 — `docId` se dřív skládal z názvu S DIAKRITIKOU přes
//        `replace(/[^a-z0-9]/g,'-')`, takže „Švestky" → `--vestky` a produkty
//        se shodným rozložením diakritiky se navzájem přepisovaly.
//        Teď je to otisk z (oblast, obchod, název, začátek platnosti).
//   S2 — deduplikace slévala akce ze DVOU RŮZNÝCH LETÁKŮ (cena z jednoho
//        týdne, platnost z druhého), protože klíč neobsahoval platnost.
//        Teď ji obsahuje, takže se týdny nemíchají.
//
// ⚠️ TOHLE JE KOPIE PRO PROJEKT `iotuyapp` (rodinná appka ioTuyApp).
//   Originál žije v `Desktop/Family-Dashboard/functions/src/letaky.ts` a patří
//   placenému produktu. Oba projekty jsou schválně NEZÁVISLÉ: každý má vlastní
//   funkci, vlastní databázi a VLASTNÍ, JINÉ tajemství. Když jedno unikne nebo
//   jeden projekt spadne, druhého se to netýká. Scraper posílá do obou.
//   Když tady něco vylepšíš, zvaž ručně přenos do produktu (a naopak) —
//   automaticky se to nesynchronizuje.
//
// ⚠️ NASAZENÍ — bez tohohle deploy SELŽE:
//      npx firebase-tools functions:secrets:set SCRAPER_SECRET --project iotuyapp
//   Deklarace `secrets: [...]` níž se nesmí nasadit dřív, než tajemství
//   opravdu existuje (stejná past je popsaná v parseRecipeUrl.ts).
//
// ⚠️ ÚKLID STARÝCH CEN má dělat Firestore sám podle pole `expiresAt`, ale
//   zásadu TTL je potřeba v tomhle projektu JEDNORÁZOVĚ ZAPNOUT — jinak se
//   `priceDeals` bude jen nafukovat a nikdy nic nezmizí. Kde: NE ve Firebase
//   konzoli, ale v Google Cloud konzoli → Firestore → Time-to-live (TTL) →
//   kolekce `priceDeals`, pole `expiresAt`, offset 0 s.

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { createHash, timingSafeEqual } from 'crypto';
import {
  buildKeywords,
  detectCategory,
  isNonFood,
  normalizeWord,
  patriNaSeznam,
} from './normalizacePotravin';

const KOLEKCE = 'priceDeals';

/** Strop na jedno volání. Scraper posílá ~3 000; víc = něco je špatně. */
const MAX_POLOZEK = 20000;

/** Firestore dávka snese 500 zápisů; 400 je pohodlná rezerva. */
const VELIKOST_DAVKY = 400;

/** Kolik dní po konci platnosti nabídku držet, než ji Firestore smaže. */
const DNI_PO_VYPRSENI = 3;

/** Když leták neuvádí konec platnosti, ať se přesto někdy uklidí. */
const DNI_BEZ_PLATNOSTI = 21;

interface SurovaPolozka {
  productName?: unknown;
  price?: unknown;
  store?: unknown;
  unit?: unknown;
  pricePerUnit?: unknown;
  currency?: unknown;
  validFrom?: unknown;
  validUntil?: unknown;
  validityText?: unknown;
  productUrl?: unknown;
  leafletUrl?: unknown;
  leafletPage?: unknown;
  region?: unknown;
}

const jeDatum = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
};

/** Krátký, stabilní otisk — nahrazuje starý `obchod-nazev` s diakritikou. */
const otisk = (...casti: string[]): string =>
  createHash('sha1').update(casti.join('|')).digest('hex').slice(0, 24);

/** Porovnání tajemství bez úniku informace časem. */
const sedi = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
};

const zaDni = (od: Date, dni: number): Date =>
  new Date(od.getTime() + dni * 24 * 60 * 60 * 1000);

interface Pripravena {
  id: string;
  data: FirebaseFirestore.DocumentData;
  price: number;
}

/**
 * Ověří a znormalizuje jednu položku.
 * Vrací `null`, když se má zahodit (nevalidní / nepotravina / mimo seznam).
 */
function pripravPolozku(
  s: SurovaPolozka,
  duvody: Record<string, number>
): Pripravena | null {
  const productName = text(s.productName, 200);
  const store = text(s.store, 40);
  const price = typeof s.price === 'number' ? s.price : Number(s.price);

  if (!productName || !store) {
    duvody.nevalidni++;
    return null;
  }
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
    duvody.nevalidni++;
    return null;
  }

  if (isNonFood(productName)) {
    duvody.nepotravina++;
    return null;
  }

  const category = detectCategory(productName);
  if (!patriNaSeznam(productName, category)) {
    duvody.mimoSeznam++;
    return null;
  }

  const validFrom = jeDatum(s.validFrom) ? s.validFrom : null;
  const validUntil = jeDatum(s.validUntil) ? s.validUntil : null;
  const region = text(s.region, 40) || 'CZ';

  // Kdy to Firestore smí sám smazat
  const konec = validUntil
    ? zaDni(new Date(`${validUntil}T23:59:59Z`), DNI_PO_VYPRSENI)
    : zaDni(new Date(), DNI_BEZ_PLATNOSTI);

  return {
    id: otisk(region, store, normalizeWord(productName), validFrom || ''),
    price,
    data: {
      productName,
      keywords: buildKeywords(productName),
      category,
      store,
      region,
      price,
      unit: text(s.unit, 40),
      pricePerUnit: text(s.pricePerUnit, 40),
      currency: text(s.currency, 8) || 'CZK',
      validFrom,
      validUntil,
      validityText: text(s.validityText, 120),
      productUrl: text(s.productUrl, 500),
      leafletUrl: text(s.leafletUrl, 500),
      leafletPage: typeof s.leafletPage === 'number' ? s.leafletPage : null,
      expiresAt: admin.firestore.Timestamp.fromDate(konec),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  };
}

export const prijmiLetaky = onRequest(
  { region: 'europe-west1', timeoutSeconds: 300, memory: '512MiB', secrets: ['SCRAPER_SECRET'] },
  async (req, res) => {
    // Není to volání z prohlížeče — žádné CORS, žádné OPTIONS.
    if (req.method !== 'POST') {
      res.status(405).json({ chyba: 'Jen POST' });
      return;
    }

    const ocekavane = process.env.SCRAPER_SECRET;
    if (!ocekavane) {
      console.error('❌ SCRAPER_SECRET není nastavené — příjem letáků je zavřený.');
      res.status(503).json({ chyba: 'Příjem není nastavený' });
      return;
    }

    const poslane = req.get('x-scraper-secret') || '';
    if (!sedi(poslane, ocekavane)) {
      // Schválně bez podrobností — kdo nezná tajemství, ať se nic nedozví.
      console.warn('⚠️ Odmítnuto volání prijmiLetaky bez platného tajemství.');
      res.status(401).json({ chyba: 'Neplatné tajemství' });
      return;
    }

    const telo = req.body as { polozky?: unknown; bezi?: unknown } | undefined;
    const polozky = telo?.polozky;
    if (!Array.isArray(polozky)) {
      res.status(400).json({ chyba: 'Chybí pole „polozky"' });
      return;
    }
    if (polozky.length > MAX_POLOZEK) {
      res.status(413).json({ chyba: `Nejvýš ${MAX_POLOZEK} položek na volání` });
      return;
    }

    const bezi = text(telo?.bezi, 80) || '(neuvedeno)';
    const duvody = { nevalidni: 0, nepotravina: 0, mimoSeznam: 0 };

    /* Deduplikace v rámci jedné dávky. Klíč UŽ OBSAHUJE PLATNOST, takže se
       akce z různých týdnů nesloučí do jedné (nález S2). Při shodě vyhrává
       nižší cena — tentýž leták občas uvádí produkt na víc stranách. */
    const podleId = new Map<string, Pripravena>();
    for (const s of polozky) {
      const p = pripravPolozku(s as SurovaPolozka, duvody);
      if (!p) continue;
      const stavajici = podleId.get(p.id);
      if (!stavajici || p.price < stavajici.price) podleId.set(p.id, p);
    }

    const db = admin.firestore();
    let ulozeno = 0;
    let davka = db.batch();
    let vDavce = 0;

    for (const p of podleId.values()) {
      davka.set(db.collection(KOLEKCE).doc(p.id), p.data, { merge: true });
      vDavce++;
      if (vDavce >= VELIKOST_DAVKY) {
        await davka.commit();
        ulozeno += vDavce;
        davka = db.batch();
        vDavce = 0;
      }
    }
    if (vDavce > 0) {
      await davka.commit();
      ulozeno += vDavce;
    }

    /* RAZÍTKO DÁVKY — tenhle jeden titěrný dokument ušetří statisíce čtení.
       Klient si při startu přečte JEN JEJ (1 čtení) a podle verze pozná,
       jestli už ceny má v offline paměti prohlížeče. Celá kolekce se stahuje
       jen tehdy, když se verze změnila — tedy dvakrát týdně po běhu scraperu,
       ne při každém otevření appky. */
    await db.collection('priceIndex').doc('aktualni').set(
      {
        verze: bezi,
        pocet: admin.firestore.FieldValue.increment(ulozeno),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const souhrn = {
      bezi,
      prijato: polozky.length,
      ulozeno,
      zahozeno: duvody,
      poDeduplikaci: podleId.size,
    };
    console.log('📥 prijmiLetaky:', JSON.stringify(souhrn));
    res.status(200).json({ ok: true, ...souhrn });
  });
