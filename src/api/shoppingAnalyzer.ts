// src/api/shoppingAnalyzer.ts
import { findAllDeals, type PriceResult } from './pricesAPI';

export interface StoreRecommendation {
  store: string;
  itemsFound: number; // v AKTUÁLNĚ platné akci
  itemsSoon: number; // bude v akci, ale leták ještě nezačal
  totalItems: number;
  totalPrice: number; // jen za aktuálně platné akce
  platiDo?: string; // dokdy platí leták, ze kterého se počítalo
  items: Array<{
    name: string;
    price: number;
    found: boolean;
    soon?: boolean; // cena existuje, ale platí až od příštího letáku
  }>;
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
    /* Jiný výrobek (prověrka 14-6) se do doporučení NEPOČÍTÁ — aspik není
       vejce, a obchod by se doporučoval podle zboží, které rodina nechce. */
    const deals = (await findAllDeals(item.name)).filter((d) => !d.jinyVyrobek);
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
      itemsSoon: 0,
      totalItems: activeItems.length,
      totalPrice: 0,
      items: [],
    });
  }

  /* Do doporučení se počítají JEN AKTUÁLNĚ PLATNÉ akce.
     Letáky se sbírají s předstihem, takže mezi nabídkami běžně leží i ty,
     které začnou až příští týden. Dřív se počítaly všechny — a člověk podle
     toho VYRAZIL DO OBCHODU, kde ty ceny ještě nebyly. To je horší než
     špatná cenovka na seznamu: špatná cenovka mate u stolu, špatné
     doporučení pošle autem do Alberta.
     Budoucí akce se ale nezahazují — počítají se zvlášť jako „od příštího
     letáku tam bude ještě N položek". */
  for (const [itemName, deals] of itemDeals) {
    const aktualniPodleObchodu = new Map<string, PriceResult>();
    const budouciPodleObchodu = new Map<string, PriceResult>();

    for (const deal of deals) {
      const kam = deal.isFuture ? budouciPodleObchodu : aktualniPodleObchodu;
      // Vezmeme první (nejlepší) nabídku pro každý obchod
      if (!kam.has(deal.store)) kam.set(deal.store, deal);
    }

    for (const store of stores) {
      const storeRec = storeMap.get(store)!;
      const aktualni = aktualniPodleObchodu.get(store);
      const budouci = budouciPodleObchodu.get(store);

      if (aktualni) {
        storeRec.itemsFound++;
        storeRec.totalPrice += aktualni.priceNum;
        storeRec.items.push({ name: itemName, price: aktualni.priceNum, found: true });
        // Dokdy leták platí — bereme nejbližší konec, ať tip nelže
        if (
          aktualni.validUntil &&
          (!storeRec.platiDo || aktualni.validUntil < storeRec.platiDo)
        ) {
          storeRec.platiDo = aktualni.validUntil;
        }
      } else if (budouci) {
        storeRec.itemsSoon++;
        storeRec.items.push({
          name: itemName,
          price: budouci.priceNum,
          found: false,
          soon: true,
        });
      } else {
        storeRec.items.push({ name: itemName, price: 0, found: false });
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

  const bestStore = allStores[0] || null;

  /* Tip musí říct DVĚ věci, které dřív chyběly: že jde o akci, která
     PRÁVĚ TEĎ platí, a dokdy. Bez toho nešlo poznat, jestli má cenu jet
     dneska, nebo počkat. */
  let tip: string | undefined;

  const dokdy = (s: StoreRecommendation) => {
    if (!s.platiDo) return '';
    const [, m, d] = s.platiDo.split('-');
    return `, platí do ${Number(d)}. ${Number(m)}.`;
  };

  if (bestStore && allStores.length > 1) {
    const secondBest = allStores[1];

    // Řazení je podle počtu, takže první má vždycky aspoň tolik jako druhý.
    if (bestStore.itemsFound > secondBest.itemsFound) {
      tip = `Jdi do ${bestStore.store} — ${bestStore.itemsFound} z ${bestStore.totalItems} položek v aktuální akci${dokdy(bestStore)}`;
    } else {
      /* ÚSPORA = kolik stojí TOTÉŽ ZBOŽÍ v obchodě, který tip jmenuje, navíc
         (převzato z Family-Dashboard 2d0747e, 29. 9. 2026). Dřív se počítala
         proti NEJDRAŽŠÍMU obchodu ze všech, ale věta jmenovala obchod na druhém
         místě: „V Penny ušetříš 28 Kč oproti Albert", přitom proti Albertu to
         byly 4 Kč. A sčítalo se přes RŮZNÉ zboží — stejný počet položek
         neznamená stejné položky (Penny mléko + rohlíky, Lidl mléko + jablka:
         rozdíl součtů je rozdíl mezi rohlíky a jablky, ne úspora). Proto jen
         proti jmenovanému obchodu a jen za položky, které mají v aktuální akci
         OBA; když nemají stejné všechny, věta to řekne. Celé koruny — ceny
         jsou orientační a „12.4 Kč" s tečkou nebyla čeština. */
      const vDruhem = new Map(
        secondBest.items.filter((i) => i.found).map((i) => [i.name, i.price])
      );
      const spolecne = bestStore.items.filter((i) => i.found && vDruhem.has(i.name));
      const uspora = Math.round(
        spolecne.reduce((suma, i) => suma + (vDruhem.get(i.name)! - i.price), 0)
      );
      if (spolecne.length > 0 && uspora > 10) {
        const totezZbozi = spolecne.length === bestStore.itemsFound;
        tip = `V ${bestStore.store} ušetříš ${uspora} Kč oproti ${secondBest.store}${totezZbozi ? '' : ' za zboží, které mají v akci oba'}${dokdy(bestStore)}`;
      }
    }
  } else if (bestStore) {
    tip = `${bestStore.store} má ${bestStore.itemsFound} z ${bestStore.totalItems} položek v aktuální akci${dokdy(bestStore)}`;
  }

  // Co teprve přijde — informace navíc, ne záměna za tu hlavní
  if (tip && bestStore && bestStore.itemsSoon > 0) {
    // „platí do 1. 9." už tečkou končí — jinak by vyšlo „1. 9.. V příštím…"
    tip += `${tip.endsWith('.') ? '' : '.'} V příštím letáku tam přibude dalších ${bestStore.itemsSoon}`;
  }

  return {
    bestStore,
    allStores,
    notFound,
    tip,
  };
};
