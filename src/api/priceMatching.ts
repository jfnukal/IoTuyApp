// src/api/priceMatching.ts
//
// ČISTÁ logika hledání cen — žádný Firebase, žádné načítání dat, žádná cache.
// Oddělené od `pricesAPI.ts` schválně: díky tomu jde pustit `npm run test:ceny`
// proti uloženému vzorku skutečných letáků a MĚŘIT, jestli se vyhledávání
// zlepšuje nebo kazí. Dokud to bylo zamotané do Firebase, nešlo to vyzkoušet
// jinak než ručním klikáním v appce.
//
// Kdo sem sáhne, ať pak pustí `npm run test:ceny`.

import {
  normalizeText,
  tokenize,
  relatedTerms,
  detectCategory,
} from './productDictionary';

export interface PriceDeal {
  id?: string;
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
  image?: string | null;
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

/* Český kmen — usečne koncovou samohlásku, aby „mléko/mléka“ nebo
   „mletá/mleté“ byly totéž slovo. Bez toho neshoda na POSLEDNÍM písmenu
   shodila celou shodu, protože původní porovnání pracovalo jen s předponou:
   „mleta“ a „mlete“ si navzájem předponou nejsou. */
const kmen = (w: string): string => {
  const k = w.replace(/[aeiouyáéíóúůýě]+$/, '');
  return k.length >= 3 ? k : w;
};

// Kmenová shoda dvou slov — jen když jsou OBĚ ≥4 znaky (jinak by "m" sedělo na "mouka")
const stemMatch = (a: string, b: string): boolean => {
  if (a.length < 4 || b.length < 4) return false;
  /* Předpona smí rozhodovat, jen když je kratší slovo aspoň pětipísmenné.
     Na čtyřech písmenech je to náhoda: „granule" se takhle trefilo do
     „Grana Padano". */
  if (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a))) {
    return true;
  }
  /* Kmeny se musí ROVNAT, ne jen začínat stejně. Předpona by stačila jen
     zdánlivě — změřeno: „granule" se pak trefilo do „Grana Padano"
     a „praní" do „Prantl". Rovnost pokryje ohýbání („mletá/mleté",
     „jablka/jablko") a nic dalšího nepustí. */
  return kmen(a) === kmen(b);
};

/* Ořížne množství, které si člověk připsal k položce — „2x mléko“,
   „3 rohlíky“, „vejce 10 ks“. Zůstane jen to, co popisuje PRODUKT.
   Bez toho brání počet kusů hledání: skóre dává −4 za každé číslo,
   které v názvu produktu nesedí, a „2x mléko“ tak vyhodilo pravé mléko.
   Gramáž uvnitř názvu („mléko 1,5 %“) se NEOŘEZÁVÁ — ta produkt popisuje. */
export const bezMnozstvi = (text: string): string => {
  const oriznuty = text
    .replace(/^\s*\d+\s*(x|ks|kusy?)?\s+/i, '')
    .replace(/\s+\d+\s*(x|ks|kusy?)\s*$/i, '')
    .trim();
  return oriznuty.length >= 3 ? oriznuty : text;
};

const matchTerm = (
  term: string,
  dealKeywords: string[],
  nameWords: string[]
): number => {
  if (dealKeywords.includes(term)) return 5;
  if (term.length >= 4 && dealKeywords.some((kw) => stemMatch(term, kw))) return 4;
  if (nameWords.includes(term)) return 3;
  if (term.length >= 4 && nameWords.some((w) => stemMatch(term, w))) return 2;
  return 0;
};

/** Fuzzy shoda hledaného textu s jednou nabídkou. Vyšší číslo = lepší shoda. */
export const calculateMatchScore = (
  searchText: string,
  deal: PriceDeal
): number => {
  const tokens = tokenize(searchText);
  const searchNumbers = searchText.match(/\d+/g) || [];

  if (tokens.length === 0 && searchNumbers.length === 0) return 0;

  const dealKeywords = (deal.keywords || []).map(normalizeText);
  const nameWords = normalizeText(deal.productName).split(/\s+/);

  let score = 0;
  let matched = 0;

  for (const token of tokens) {
    let best = matchTerm(token, dealKeywords, nameWords);
    /* Když přímá shoda selže, zkusíme synonyma. Strop 4 (přímá shoda dává 5),
       aby synonymum nikdy nepřebilo přesnou shodu, ale zároveň samo o sobě
       přelezlo práh 3 — jinak jednoslovný hovorový dotaz („kafe", „toaleťák")
       nemohl uspět NIKDY a vracel nula nálezů. */
    if (best === 0) {
      for (const rel of relatedTerms(token)) {
        const s = matchTerm(rel, dealKeywords, nameWords);
        if (s > 0) {
          best = Math.min(4, s);
          break;
        }
      }
    }
    if (best > 0) {
      score += best;
      matched++;
    }
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

  /* JE TEN PRODUKT O TOM, CO HLEDÁM? — přidáno 25. 8. 2026
     Dokud se při shodném skóre rozhodovalo podle CENY, vyhrával pravidelně
     levnější, ale úplně jiný produkt: „vejce" → Instantní polévka Přidej
     vejce Maggi (12,90) před vejci (39,90), „banány" → Tyčinka Banány
     v čokoládě, „máslo" → Sušenky máslové.
     Rozdíl mezi nimi je v tom, ČEHO SE NÁZEV TÝKÁ. U správného produktu je
     hledané slovo jeho hlavou; u toho špatného je zahrabané uprostřed
     dlouhého názvu o něčem jiném. Měříme to dvěma čísly: */
  const nazevTokeny = tokenize(deal.productName);
  if (nazevTokeny.length > 0) {
    /* Do posuzování patří i KONKRETIZACE dotazu, ne jen slova, která člověk
       napsal. Bez toho platilo, že „pečivo" uzná za svoje jen výrobek, který
       má slovo „pečivo" přímo v názvu — takže vyhrála „Pečivo tyčinka sýrová"
       (15 bodů) a rohlíky s houskami (8 bodů) filtr odstupu zahodil, přestože
       jsou to přesně ty výrobky, které člověk myslel.
       `relatedTerms` je jednosměrné: „pečivo" sem přidá rohlík a housku,
       ale „radegast" nepřidá gambrinus. */
    const pokryto = new Set<string>(tokens);
    for (const t of tokens) {
      for (const r of relatedTerms(t)) pokryto.add(r);
    }
    const sedi = (n: string) =>
      pokryto.has(n) || [...pokryto].some((t) => stemMatch(t, n));

    // 1) hlava názvu — první smysluplné slovo. „Vejce z podestýlky" ano,
    //    „Instantní polévka…" ne.
    if (sedi(nazevTokeny[0])) score += 5;

    // 2) pokrytí — kolik slov názvu dotaz vůbec vysvětlí. Krátký, přesný
    //    název dostane víc než dlouhý o něčem jiném.
    const vysvetleno = nazevTokeny.filter(sedi).length;
    score += Math.round((3 * vysvetleno) / nazevTokeny.length);
  }

  return score;
};

/**
 * Najde nejlepší nabídky pro hledaný text.
 *
 * @param searchText  co uživatel napsal na seznam
 * @param deals       všechny známé nabídky
 * @param canonicals  kanonické názvy z naučených aliasů (může být prázdné)
 * @param dnes        dnešní datum ve tvaru YYYY-MM-DD (kvůli `isFuture`)
 */
export const hledejVNabidkach = (
  searchText: string,
  deals: PriceDeal[],
  canonicals: string[],
  dnes: string
): PriceResult[] => {
  if (!searchText || searchText.length < 3) return [];
  if (deals.length === 0) return [];

  // Počet kusů pryč — hledá se produkt, ne „2x"
  const dotaz = bezMnozstvi(searchText);

  // Hledáme originál + kanonické názvy (každý jako samostatný výraz)
  const searchTerms = [dotaz, ...canonicals];

  // Kategorie hledané položky — pro upřednostnění akcí ze stejné kategorie
  const queryCategory = detectCategory(dotaz);

  const matches: Array<{ deal: PriceDeal; score: number }> = [];

  for (const deal of deals) {
    let bestScore = 0;
    for (const term of searchTerms) {
      const score = calculateMatchScore(term, deal);
      if (score > bestScore) bestScore = score;
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
    if (b.score !== a.score) return b.score - a.score;
    return a.deal.price - b.deal.price;
  });

  // Deduplikace — pro každý obchod jen jedna nabídka, a to ta NEJPODOBNĚJŠÍ.
  // (Dřív se v rámci obchodu vybírala nejlevnější, takže jedno „vejce"
  //  klidně vystřídala polévka s vejcem v názvu.)
  const seenStores = new Map<string, { r: PriceResult; score: number }>();

  for (const m of matches) {
    const deal = m.deal;
    const isFuture = deal.validFrom ? deal.validFrom > dnes : false;
    const existing = seenStores.get(deal.store);

    if (existing) {
      const stavajiciJeLepsi =
        existing.score > m.score ||
        (existing.score === m.score &&
          ((!existing.r.isFuture && isFuture) ||
            (existing.r.isFuture === isFuture && existing.r.priceNum <= deal.price)));
      if (stavajiciJeLepsi) continue;
    }

    seenStores.set(deal.store, {
      score: m.score,
      r: {
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
        isFuture,
      },
    });
  }

  const vsechny = Array.from(seenStores.values());
  if (vsechny.length === 0) return [];

  /* JÁDRO VADY V1 — tady se to lámalo.
     Seznam obchodů se nakonec řadil ČISTĚ PODLE CENY, což je u srovnávače
     cen správně... ale jen když všechny řádky mluví o TÉMŽE produktu.
     Když jeden obchod nabízel vejce za 39,90 a druhý „Instantní polévku
     Přidej vejce" za 12,90, vyhrála polévka — přestože měla o polovinu
     nižší skóre podobnosti.
     Proto se nejdřív zahodí nabídky, které jsou o něčem znatelně jiném než
     ta nejlepší, a teprve ze zbytku se vybírá nejlevnější obchod. */
  const nejlepsiSkore = Math.max(...vsechny.map((x) => x.score));
  const ROZUMNY_ODSTUP = 4;
  const srovnatelne = vsechny.filter(
    (x) => x.score >= nejlepsiSkore - ROZUMNY_ODSTUP
  );

  // Aktuální akce první, pak podle ceny
  return srovnatelne
    .map((x) => x.r)
    .sort((a, b) => {
      if (a.isFuture !== b.isFuture) return a.isFuture ? 1 : -1;
      return a.priceNum - b.priceNum;
    });
};
