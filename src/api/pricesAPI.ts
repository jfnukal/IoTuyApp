// src/api/pricesAPI.ts
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { findCanonical } from './aliasesAPI';
import { normalizeText, tokenize, relatedTerms, detectCategory } from './productDictionary';

interface PriceDeal {
  id: string;
  productName: string;
  keywords: string[];
  category?: string | null;
  store: string;
  price: number;
  unit: string | null;
  pricePerUnit: string | null;
  currency: string;
  validFrom: string | null;
  validUntil: string | null;
  validityText: string | null;
  image: string | null;
  productUrl: string | null;
}

export interface PriceResult {
  store: string;
  price: string;
  priceNum: number;
  unit?: string;
  pricePerUnit?: string;
  productName?: string;
  productUrl?: string;
  validFrom?: string;
  validUntil?: string;
  validityText?: string;
  isFuture?: boolean; // true pokud leták ještě neplatí
}

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

// Normalizuje text pro porovnání (bez diakritiky, malá písmena)
const matchTerm = (term: string, dealKeywords: string[], nameWords: string[]): number => {
  if (dealKeywords.includes(term)) return 5;
  if (term.length >= 4 && dealKeywords.some(kw => kw.startsWith(term) || term.startsWith(kw))) return 4;
  if (nameWords.includes(term)) return 3;
  if (term.length >= 4 && nameWords.some(w => w.startsWith(term) || term.startsWith(w))) return 2;
  return 0;
};

// Fuzzy matching - hledá shodu klíčových slov s kontrolou čísel
const calculateMatchScore = (searchText: string, deal: PriceDeal): number => {
  const tokens = tokenize(searchText);
  const searchNumbers = searchText.match(/\d+/g) || [];

  if (tokens.length === 0 && searchNumbers.length === 0) return 0;

  const dealKeywords = (deal.keywords || []).map(normalizeText);
  const nameWords = normalizeText(deal.productName).split(/\s+/);

  let score = 0;
  let matched = 0;

  for (const token of tokens) {
    let best = matchTerm(token, dealKeywords, nameWords);
    // Když přímá shoda selže, zkusíme synonyma (měkčí — max 2 body)
    if (best === 0) {
      for (const rel of relatedTerms(token)) {
        const s = matchTerm(rel, dealKeywords, nameWords);
        if (s > 0) { best = Math.min(2, s); break; }
      }
    }
    if (best > 0) { score += best; matched++; }
  }

  // Žádné smysluplné slovo nesedí → není to shoda
  if (matched === 0) return 0;

  // Frázový bonus/penalizace podle poměru shody
  if (tokens.length > 1) {
    if (matched === tokens.length) score += 6;
    else score -= (tokens.length - matched) * 2;
  }

  // Kontrola čísel (gramáž) — jen pokud hlavní slovo sedí
  if (searchNumbers.length > 0 && matched > 0) {
    const productNumbers: string[] = deal.productName.match(/\d+/g) || [];
    for (const searchNum of searchNumbers) {
      if (productNumbers.includes(searchNum)) score += 3;
      else if (productNumbers.length > 0) score -= 4;
    }
  }

  return score;
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
    
    // Hledáme originál + kanonické názvy z naučených aliasů (každý jako samostatný výraz)
    const canonicals = await findCanonical(productName);
    const searchTerms = [productName, ...canonicals];

    if (canonicals.length > 0) {
      console.log(`[PricesAPI] "${productName}" → aliasy: ${canonicals.join(', ')}`);
    }

    // Kategorie hledané položky — pro upřednostnění akcí ze stejné kategorie
    const queryCategory = detectCategory(productName);

    const matches: Array<{ deal: PriceDeal; score: number }> = [];

    for (const deal of deals) {
      // Zkusíme všechny varianty hledání a vezmeme nejlepší skóre
      let bestScore = 0;

      for (const searchTerm of searchTerms) {
        const score = calculateMatchScore(searchTerm, deal);
        if (score > bestScore) {
          bestScore = score;
        }
      }

      // Požadujeme alespoň skóre 3 pro shodu
      if (bestScore >= 3) {
        // Bonus/penalizace podle kategorie (jen když ji známe u obou)
        if (queryCategory && deal.category) {
          bestScore += queryCategory === deal.category ? 4 : -4;
        }
        matches.push({ deal, score: bestScore });
      }
    }
    
    // Seřadíme podle skóre (nejlepší shoda), pak podle ceny (nejlevnější)
    matches.sort((a, b) => {
      // Nejdřív podle skóre (sestupně)
      if (b.score !== a.score) return b.score - a.score;
      // Pak podle ceny (vzestupně)
      return a.deal.price - b.deal.price;
    });
    
    // Dnešní datum pro porovnání
    const today = new Date().toISOString().split('T')[0];
    
    // Deduplikace - pro každý obchod jen jedna nabídka (nejlevnější aktuální)
    const seenStores = new Map<string, PriceResult>();
    
    for (const m of matches) {
      const deal = m.deal;
      const isFuture = deal.validFrom ? deal.validFrom > today : false;
      
      // Klíč jen podle obchodu (chceme max 1 nabídku na obchod)
      const storeKey = deal.store;
      
      const existing = seenStores.get(storeKey);
      
      // Přeskočíme pokud už máme lepší nabídku:
      // - Aktuální nabídka má přednost před budoucí
      // - Při stejném typu (obě aktuální nebo obě budoucí) - levnější vyhrává
      if (existing) {
        const existingIsBetter = 
          (!existing.isFuture && isFuture) || // existující je aktuální, nová je budoucí
          (existing.isFuture === isFuture && existing.priceNum <= deal.price); // stejný typ, existující je levnější
        
        if (existingIsBetter) continue;
      }
      
      seenStores.set(storeKey, {
        store: deal.store,
        price: `${deal.price} Kč`,
        priceNum: deal.price,
        unit: deal.unit || undefined,
        pricePerUnit: deal.pricePerUnit || undefined,
        productName: deal.productName,
        productUrl: deal.productUrl || undefined,
        validFrom: deal.validFrom || undefined,
        validUntil: deal.validUntil || undefined,
        validityText: deal.validityText || undefined,
        isFuture
      });
    }
    
    // Převedeme na pole a seřadíme: aktuální první, pak podle ceny
    const results = Array.from(seenStores.values())
      .sort((a, b) => {
        // Aktuální před budoucími
        if (a.isFuture !== b.isFuture) return a.isFuture ? 1 : -1;
        // Pak podle ceny
        return a.priceNum - b.priceNum;
      });
    
    // Uložit do cache
    searchCache.set(cacheKey, { offers: results, timestamp: Date.now() });

    if (results.length > 0) {
      console.log(`[PricesAPI] "${productName}" → ${results.length} nabídek, nejlepší: "${results[0].productName}" (${results[0].store} ${results[0].price})`);
    } else {
      console.log(`[PricesAPI] "${productName}" → nic nenalezeno`);
    }

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