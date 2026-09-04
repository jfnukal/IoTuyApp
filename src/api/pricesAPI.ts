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
import { findCanonical } from './aliasesAPI';
import {
  hledejVNabidkach,
  type PriceDeal,
  type PriceResult,
} from './priceMatching';

export type { PriceResult } from './priceMatching';

// Cache pro deals - načteme jednou a pak hledáme lokálně
let cachedDeals: PriceDeal[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minut - data se mění max 1x týdně

// Cache pro výsledky hledání - aby se nevolalo znovu pro stejné položky
const searchCache = new Map<string, { offers: PriceResult[]; timestamp: number }>();
const SEARCH_CACHE_DURATION = 10 * 60 * 1000; // 10 minut

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
const loadDeals = async (): Promise<PriceDeal[]> => {
  const now = Date.now();

  if (cachedDeals && now - cacheTimestamp < CACHE_DURATION) {
    return cachedDeals;
  }

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

  try {
    const snapshot = await getDocs(dealsRef);
    cachedDeals = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as PriceDeal[];
    cacheTimestamp = now;
    if (verzeNaServeru) zapis(KLIC_VERZE, verzeNaServeru);
    return cachedDeals;
  } catch (error) {
    console.error('[PricesAPI] Chyba při načítání deals:', error);
    return cachedDeals || [];
  }
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

// Najde všechny nabídky pro produkt (ze všech obchodů)
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

    const dnes = new Date().toISOString().split('T')[0];
    const results = hledejVNabidkach(productName, deals, canonicals, dnes);

    // Uložit do cache
    searchCache.set(cacheKey, { offers: results, timestamp: Date.now() });

    return results;
  } catch (error) {
    console.error('[PricesAPI] Chyba při hledání deals:', error);
    return [];
  }
};

// Vymaže cache (užitečné po manuálním refreshi)
export const clearPriceCache = (): void => {
  cachedDeals = null;
  cacheTimestamp = 0;
  searchCache.clear();
  /* I zapamatovanou verzi — jinak by se ruční obnovení spokojilo s offline
     pamětí a člověk by dostal zase ta samá data, kvůli kterým obnovoval. */
  try {
    localStorage.removeItem(KLIC_VERZE);
  } catch {
    /* nevadí */
  }
};

// Re-export pro použití v komponentách
export { learnAlias } from './aliasesAPI';

/*
 * TODO: Přidat do SettingsPage možnost konfigurace:
 * - Preferované jednotky (např. jen 0.5l, 1l, 1.5l)
 * - Maximální počet variant na produkt
 * - Preferované obchody
 */