// src/api/pricesAPI.ts
//
// Načítání letákových cen z Firestore a jejich cache. SAMOTNÉ HLEDÁNÍ tady
// není — sedí v `priceMatching.ts`, který nezná Firebase a jde proto vyzkoušet
// nasucho proti uloženému vzorku letáků (`npm run test:ceny`).
// Kdo mění chování vyhledávání, patří tam, ne sem.
import { collection, getDocs } from 'firebase/firestore';
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

// Načte všechny deals z Firebase (s cache)
const loadDeals = async (): Promise<PriceDeal[]> => {
  const now = Date.now();
  
  // Použijeme cache pokud je čerstvá
  if (cachedDeals && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedDeals;
  }
  
  try {
    const dealsRef = collection(db, 'priceDeals');
    const snapshot = await getDocs(dealsRef);
    
    cachedDeals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PriceDeal[];
    
    cacheTimestamp = now;
    // console.log(`[PricesAPI] Načteno ${cachedDeals.length} deals z Firebase`);
    
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
};

// Re-export pro použití v komponentách
export { learnAlias } from './aliasesAPI';

/*
 * TODO: Přidat do SettingsPage možnost konfigurace:
 * - Preferované jednotky (např. jen 0.5l, 1l, 1.5l)
 * - Maximální počet variant na produkt
 * - Preferované obchody
 */