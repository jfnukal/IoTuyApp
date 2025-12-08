// src/api/shoppingAnalyzer.ts
import { findAllDeals, type PriceResult } from './pricesAPI';

export interface StoreRecommendation {
  store: string;
  itemsFound: number;
  totalItems: number;
  totalPrice: number;
  items: Array<{
    name: string;
    price: number;
    found: boolean;
  }>;
  savings?: number; // Oproti nejdražší variantě
}

export interface ShoppingAnalysis {
  bestStore: StoreRecommendation | null;
  allStores: StoreRecommendation[];
  notFound: string[]; // Položky bez akce
  tip?: string;
}

// Analyzuje nákupní seznam a doporučí nejlepší obchod
export const analyzeShoppingList = async (
  items: Array<{ name: string; completed: boolean }>
): Promise<ShoppingAnalysis> => {
  // Filtrujeme jen nekoupené položky
  const activeItems = items.filter((item) => !item.completed);

  if (activeItems.length === 0) {
    return {
      bestStore: null,
      allStores: [],
      notFound: [],
    };
  }

  // Pro každou položku najdeme nabídky
  const itemDeals: Map<string, PriceResult[]> = new Map();
  const notFound: string[] = [];

  for (const item of activeItems) {
    const deals = await findAllDeals(item.name);
    if (deals.length > 0) {
      itemDeals.set(item.name, deals);
    } else {
      notFound.push(item.name);
    }
  }

  // Agregujeme podle obchodů
  const storeMap: Map<string, StoreRecommendation> = new Map();
  const stores = ['Kaufland', 'Lidl', 'Albert', 'Penny', 'Billa'];

  // Inicializujeme všechny obchody
  for (const store of stores) {
    storeMap.set(store, {
      store,
      itemsFound: 0,
      totalItems: activeItems.length,
      totalPrice: 0,
      items: [],
    });
  }

  // Pro každou položku přidáme cenu do příslušného obchodu
  for (const [itemName, deals] of itemDeals) {
    // Seskupíme nabídky podle obchodu
    const dealsByStore = new Map<string, PriceResult>();

    for (const deal of deals) {
      // Vezmeme první (nejlepší) nabídku pro každý obchod
      if (!dealsByStore.has(deal.store)) {
        dealsByStore.set(deal.store, deal);
      }
    }

    // Přidáme do každého obchodu
    for (const store of stores) {
      const storeRec = storeMap.get(store)!;
      const deal = dealsByStore.get(store);

      if (deal) {
        storeRec.itemsFound++;
        storeRec.totalPrice += deal.priceNum;
        storeRec.items.push({
          name: itemName,
          price: deal.priceNum,
          found: true,
        });
      } else {
        storeRec.items.push({
          name: itemName,
          price: 0,
          found: false,
        });
      }
    }
  }

  // Přidáme položky bez akce
  for (const itemName of notFound) {
    for (const store of stores) {
      const storeRec = storeMap.get(store)!;
      storeRec.items.push({
        name: itemName,
        price: 0,
        found: false,
      });
    }
  }

  // Seřadíme obchody podle počtu nalezených položek, pak podle ceny
  const allStores = Array.from(storeMap.values())
    .filter((s) => s.itemsFound > 0)
    .sort((a, b) => {
      // Nejdřív podle počtu nalezených (sestupně)
      if (b.itemsFound !== a.itemsFound) {
        return b.itemsFound - a.itemsFound;
      }
      // Pak podle ceny (vzestupně)
      return a.totalPrice - b.totalPrice;
    });

  // Vypočítáme úspory oproti nejdražšímu
  if (allStores.length > 1) {
    const maxPrice = Math.max(...allStores.map((s) => s.totalPrice));
    for (const store of allStores) {
      store.savings = Math.round((maxPrice - store.totalPrice) * 10) / 10;
    }
  }

  const bestStore = allStores[0] || null;

  // Vytvoříme tip
  let tip: string | undefined;

  if (bestStore && allStores.length > 1) {
    const secondBest = allStores[1];

    if (
      bestStore.itemsFound === secondBest.itemsFound &&
      bestStore.savings &&
      bestStore.savings > 10
    ) {
      tip = `V ${bestStore.store} ušetříš ${bestStore.savings} Kč oproti ${secondBest.store}`;
    } else if (bestStore.itemsFound > secondBest.itemsFound) {
      tip = `${bestStore.store} má ${bestStore.itemsFound} z ${bestStore.totalItems} položek v akci`;
    }
  } else if (bestStore) {
    tip = `${bestStore.store} má ${bestStore.itemsFound} položek v akci`;
  }

  return {
    bestStore,
    allStores,
    notFound,
    tip,
  };
};
