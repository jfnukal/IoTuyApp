// src/api/pricesAPI.ts
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { findCanonical } from './aliasesAPI';

interface PriceDeal {
  id: string;
  productName: string;
  keywords: string[];
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
    console.log(`[PricesAPI] Načteno ${cachedDeals.length} deals z Firebase`);
    
    return cachedDeals;
  } catch (error) {
    console.error('[PricesAPI] Chyba při načítání deals:', error);
    return cachedDeals || [];
  }
};

// Normalizuje text pro porovnání (bez diakritiky, malá písmena)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Fuzzy matching - hledá shodu klíčových slov s kontrolou čísel
const calculateMatchScore = (searchText: string, deal: PriceDeal): number => {
  const normalizedSearch = normalizeText(searchText);
  const normalizedName = normalizeText(deal.productName);
  
  // Rozdělíme na slova a čísla
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 1 && !/^\d+$/.test(w));
  const searchNumbers = searchText.match(/\d+/g) || [];
  
  if (searchWords.length === 0 && searchNumbers.length === 0) return 0;
  
  let score = 0;
  let matchedWords = 0;
  
  // 1. Hlavní slova (ne čísla) - MUSÍ se shodovat alespoň jedno
  for (const searchWord of searchWords) {
    // Přesná shoda v keywords
    if (deal.keywords?.some(kw => kw === searchWord)) {
      score += 5;
      matchedWords++;
    }
    // Částečná shoda v keywords
    else if (deal.keywords?.some(kw => kw.includes(searchWord) || searchWord.includes(kw))) {
      score += 3;
      matchedWords++;
    }
    // Shoda v názvu produktu
    else if (normalizedName.includes(searchWord)) {
      score += 2;
      matchedWords++;
    }
  }
  
  // Pokud máme hledaná slova a žádné se neshoduje, vracíme 0
  if (searchWords.length > 0 && matchedWords === 0) {
    return 0;
  }
  
  // BONUS: Čím více slov se shoduje, tím lepší skóre
  // Pokud hledáme 2 slova a obě se shodují = bonus
  if (searchWords.length > 1 && matchedWords === searchWords.length) {
    score += 10; // Velký bonus za úplnou shodu
  } else if (searchWords.length > 1 && matchedWords < searchWords.length) {
    // Penalizace za částečnou shodu (matchuje jen některá slova)
    score -= (searchWords.length - matchedWords) * 3;
  }
  
  // 2. Kontrola čísel - pouze pokud hlavní slovo sedí
  if (searchNumbers.length > 0 && matchedWords > 0) {
    const productNumbersMatch = deal.productName.match(/\d+/g);
    const productNumbers: string[] = productNumbersMatch ? productNumbersMatch : [];
    
    for (const searchNum of searchNumbers) {
      if (productNumbers.includes(searchNum)) {
        // Číslo se shoduje - bonus
        score += 3;
      } else if (productNumbers.length > 0) {
        // Produkt má jiné číslo - penalizace
        score -= 5;
      }
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
    
    // Získáme kanonické názvy z aliasů
    const canonicals = await findCanonical(productName);
    
    // Rozšířený hledaný text (originál + aliasy)
    const searchTerms = [productName];
    if (canonicals.length > 0) {
      // Přidáme verzi s nahrazenými aliasy
      let expandedSearch = productName.toLowerCase();
      const words = expandedSearch.split(/\s+/);
      
      for (const canonical of canonicals) {
        // Najdeme které slovo nahradit
        for (const word of words) {
          const aliases = await findCanonical(word);
          if (aliases.includes(canonical)) {
            expandedSearch = expandedSearch.replace(word, canonical);
          }
        }
      }
      
      if (expandedSearch !== productName.toLowerCase()) {
        searchTerms.push(expandedSearch);
        console.log(`[PricesAPI] Rozšířeno hledání: "${productName}" → "${expandedSearch}"`);
      }
    }
    
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
        matches.push({ deal, score: bestScore });
        
        // Debug: log prvních 5 shod
        if (matches.length <= 5) {
          console.log(`[PricesAPI] Match: "${deal.productName}" (score: ${bestScore}, keywords: ${deal.keywords?.join(', ')})`);
        }
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
 * 
 * TODO: Přidat AI matching pro lidské názvy:
 * - "Plzeň" → "Pilsner Urquell"
 * - "Radek" → "Radegast"
 * - "Kofča" → "Kofola"
 * Implementovat jako learning system, který se učí z uživatelských voleb.
 */