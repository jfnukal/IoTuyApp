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

/** „24,90 Kč" / „25 Kč" — česky s čárkou (19. 9. 2026; dřív „24.9 Kč"). */
export function cenaCesky(cena: number): string {
  if (!Number.isFinite(cena)) return '';
  return Number.isInteger(cena)
    ? `${cena} Kč`
    : `${cena.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
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
  /** V letácích není přímo to, co člověk hledá — cena patří JINÉMU výrobku
   *  z téže suroviny („vejce" → Vejce v aspiku). Musí to říct i obrazovka. */
  jinyVyrobek?: boolean;
}

/* ══════════════════════════════════════════════════════════════════════════
   PROŠLÁ AKCE SE NEUKAZUJE                                    (30. 9. 2026)
   ══════════════════════════════════════════════════════════════════════════
   Server drží nabídku v databázi ještě 3 dny po konci letáku (`expiresAt`
   ve `functions/src/letaky.ts`) a prohlížeč si ji podle verze dávky pamatuje
   i déle. Hledání přitom hlídalo jen „ještě nezačala" (`isFuture`) — akce,
   která VČERA skončila, tak platila dál jako dnešní. Jarek 30. 9.: „Doporučení:
   Billa — V Billa ušetříš 13 Kč oproti Kaufland, platí do 29. 9." (úterní
   dávka nový leták Billy nepřinesla; všech 325 jejích nabídek končilo 29. 9.).
   Vyřazuje se UŽ PŘED hledáním, ne až z výsledků: prošlá opravdová vejce by
   jinak dál schovávala dnešní aspik a „jiný výrobek" i výběr druhu by se
   řídily letákem, který neplatí.
   Nabídka BEZ konce platnosti zůstává (leták ho neuvedl, server ji uklidí
   za 21 dní). Obě data jsou `YYYY-MM-DD` (jiný tvar server nepustí), takže
   se porovnávají jako text. `dnes` je MÍSTNÍ den (`klicDne`), nikdy
   `toISOString` — to je do dvou ráno ještě včerejšek. */
export const jeProslaAkce = (deal: Pick<PriceDeal, 'validUntil'>, dnes: string): boolean =>
  typeof deal.validUntil === 'string'
  && /^\d{4}-\d{2}-\d{2}/.test(deal.validUntil)
  && deal.validUntil.slice(0, 10) < dnes;

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

/* ══════════════════════════════════════════════════════════════════════════
   JINÝ VÝROBEK Z TÉŽE SUROVINY                       (prověrka 14-6, 29. 9. 2026)
   ══════════════════════════════════════════════════════════════════════════
   Hlava názvu sedí, a přesto se kupuje něco jiného: „vejce" → Vejce v aspiku
   (Penny 22,90 vyhrávalo před vejci za 34,90), „česnek" → Česneková pomazánka,
   „ryba" → Rybí salát, „švestky" → Pálenka Švestka, „knedlíky" → Knedlíky
   v prášku. Skóre to nerozliší (hlava i klíčové slovo sedí) a mezi
   srovnatelnými pak rozhoduje cena — hotové jídlo bývá levnější.
   Slovo ze seznamu v názvu = JINÝ VÝROBEK, ledaže ho napsal i člověk
   („vaječná pomazánka" chce pomazánku) nebo před ním stojí účel („Sýr NA
   burger" je sýr, „Kuličky DO polévky" nejsou polévka).
   ⚠️ KAŽDÉ SLOVO JE ZMĚŘENÉ proti vzorku letáků (1 278 nabídek) — ve vzorku
   chytilo jen opravdu jiné výrobky. Schválně tu NENÍ (měřeno, chytalo správné):
     'dezert'     „Dezert Pribináček" JE pribináček (i Bobík, Lipánek),
     'omack'      „Tatarská omáčka" JE tatarka,
     'cokolad'    „Čokoláda Milka" JE milka (proto jen „v čokoládě"),
     'napoj'      „Minerální nápoj" chce ten, kdo píše minerálku,
     'polevkov…'  „Polévkové nudle" JSOU nudle (proto jen podstatné jméno),
     'salatov…'   „Okurka salátová" JE okurka (proto jen podstatné jméno).
   Hlídá `npm run test:ceny` (případy s `jiny:`). */
const JINE_VYROBKY: ReadonlyArray<readonly [string, RegExp]> = [
  ['aspik', /^aspik/],
  ['pomazanka', /^pomazank/],
  ['palenka', /^palenk/],
  ['liker', /^liker/],
  ['burger', /^burger/],
  ['tycinka', /^tycink/],
  ['salat', /^salat(u|y|em)?$/],
  ['prasek', /^pras(ek|ku|kem)$/],
  ['dip', /^dip(y|u|em)?$/],
  ['chleb', /^chleb(a|u|em|ik|iky|icek|icky|icku)?$/],
  ['bageta', /^baget(a|y|u|ou)$/],
  ['polevka', /^polev(ka|ky|ku|kou)$/],
];
/** Obalené — „Rozinky v čokoládě" nejsou rozinky, „Kešu v čokoládě" nejsou kešu. */
const JINE_VYROBKY_FRAZE = ['v cokolade'];
/** Účel: „X na/do/pro Y" je pořád X. */
const UCEL = new Set(['na', 'do', 'pro']);

const slovaTextu = (text: string): string[] =>
  normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);

const druhJinehoVyrobku = (slovo: string): string | null =>
  JINE_VYROBKY.find(([, vzor]) => vzor.test(slovo))?.[0] ?? null;

/**
 * Je nabídka JINÝ VÝROBEK, než jaký hledané výrazy myslí?
 * @param hledane  co člověk napsal + naučené aliasy rodiny (`canonicals`)
 */
export const jeJinyVyrobek = (hledane: string[], nazev: string): boolean => {
  const vysvetleno = new Set<string>();
  const frazeHledani: string[] = [];
  for (const h of hledane) {
    frazeHledani.push(slovaTextu(h).join(' '));
    for (const w of slovaTextu(h)) {
      vysvetleno.add(w);
      for (const r of relatedTerms(w)) vysvetleno.add(r);
    }
  }
  const druhyHledani = new Set([...vysvetleno].map(druhJinehoVyrobku).filter(Boolean));

  const slova = slovaTextu(nazev);
  for (let i = 0; i < slova.length; i++) {
    const druh = druhJinehoVyrobku(slova[i]);
    if (!druh || druhyHledani.has(druh)) continue;
    if (i > 0 && UCEL.has(slova[i - 1])) continue;
    return true;
  }
  const cely = slova.join(' ');
  return JINE_VYROBKY_FRAZE.some((f) => cely.includes(f) && !frazeHledani.some((h) => h.includes(f)));
};

/* O kolik smí být nabídka horší než ta nejlepší, aby se ještě počítala za
   „týž produkt“. Sdílí ho hledání cen i nabídka druhů — kdyby měla každá
   svoje číslo, ukazovala by nabídka druhů něco jiného než cena pod ní. */
const ROZUMNY_ODSTUP = 4;

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
       napsal. Bez toho platilo, že „pečivo“ uzná za svoje jen výrobek, který
       má slovo „pečivo“ přímo v názvu — takže vyhrála „Pečivo tyčinka sýrová“
       (15 bodů) a rohlíky s houskami (8 bodů) filtr odstupu zahodil, přestože
       jsou to přesně ty výrobky, které člověk myslel.
       `relatedTerms` je po opravě značek jednosměrné: „pečivo“ sem přidá
       rohlík a housku, ale „radegast“ nepřidá gambrinus. */
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
 * @param dnes        místní dnešek `YYYY-MM-DD` (`klicDne`) — rozhoduje, co už
 *                    skončilo (`jeProslaAkce`) a co ještě nezačalo (`isFuture`)
 */
export const hledejVNabidkach = (
  searchText: string,
  vsechnyNabidky: PriceDeal[],
  canonicals: string[],
  dnes: string
): PriceResult[] => {
  if (!searchText || searchText.length < 3) return [];
  // Prošlé akce pryč dřív, než se začne porovnávat (viz `jeProslaAkce`).
  const deals = vsechnyNabidky.filter((d) => !jeProslaAkce(d, dnes));
  if (deals.length === 0) return [];

  // Počet kusů pryč — hledá se produkt, ne „2x"
  const dotaz = bezMnozstvi(searchText);

  // Hledáme originál + kanonické názvy (každý jako samostatný výraz)
  const searchTerms = [dotaz, ...canonicals];

  // Kategorie hledané položky — pro upřednostnění akcí ze stejné kategorie
  const queryCategory = detectCategory(dotaz);

  const vsechnyShody: Array<{ deal: PriceDeal; score: number; jiny: boolean }> = [];

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
      vsechnyShody.push({ deal, score: bestScore, jiny: jeJinyVyrobek(searchTerms, deal.productName) });
    }
  }

  /* SUROVINA PŘED JINÝM VÝROBKEM — ještě PŘED řazením podle ceny (14-6).
     Nejdřív se vezme, co je podle skóre srovnatelně dobré (stejný odstup
     jako níž), a teprve MEZI TÍM se oddělí opravdový výrobek od jiného.
     Obráceně by jiný výrobek s vysokým skóre uvolnil místo čemukoli
     „přesnému" s mizerným skóre — bez vajec v letáku by pak cenu vajec
     dalo čokoládové vajíčko Kinder (1 bod proti 16 u aspiku).
     Je-li mezi srovnatelnými aspoň jeden opravdový výrobek, jiné se vůbec
     nenabízí (ani v detailu jako „další obchod"). Když jsou tam JEN jiné,
     ukážou se — ale s příznakem, aby obrazovka neřekla, že je to cena vajec. */
  const nejlepsiVubec = Math.max(0, ...vsechnyShody.map((m) => m.score));
  const srovnatelneShody = vsechnyShody.filter((m) => m.score >= nejlepsiVubec - ROZUMNY_ODSTUP);
  const presne = srovnatelneShody.filter((m) => !m.jiny);
  const jenJine = presne.length === 0;
  const matches = jenJine ? srovnatelneShody : presne;

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
        price: cenaCesky(deal.price),
        priceNum: deal.price,
        unit: deal.unit || undefined,
        pricePerUnit: deal.pricePerUnit || undefined,
        productName: deal.productName,
        productUrl: deal.productUrl || undefined,
        validFrom: deal.validFrom || undefined,
        validUntil: deal.validUntil || undefined,
        validityText: deal.validityText || undefined,
        isFuture,
        ...(jenJine ? { jinyVyrobek: true } : {}),
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

/* ══════════════════════════════════════════════════════════════════════════
   NABÍDKA DRUHŮ — „co jsi vlastně myslel?"            (přidáno 4. 9. 2026)
   ══════════════════════════════════════════════════════════════════════════
   `hledejVNabidkach` odpovídá na otázku „KDE to koupit nejlevněji" — proto
   nechává jednu nabídku na obchod, tedy nejvýš pět řádků. Jenže když si člověk
   napíše „káva", takřka nikdy nemyslí „jakoukoli kávu, hlavně lacinou": ve
   vzorku letáků na to slovo sedí 55 různých výrobků, od ledové kávy za 14,90
   po zrnkovou za 449. Vybrat z nich „nejlevnější" je odpověď na otázku,
   kterou nikdo nepoložil.
   Tahle funkce se ptá na to druhé: Z ČEHO se vlastně vybírá. Deduplikuje
   proto podle VÝROBKU, ne podle obchodu.

   ── JEDEN MECHANISMUS, DVĚ PODOBY ────────────────────────────────────────
   Výrobky se třídí po dvou různých osách a napřed to vypadalo na dvě různá
   pravidla (změřeno na vzorku 1 331 nabídek):
     káva (55 výrobků)  → podle DRUHU:   instantní · zrnková · mletá · ledová
     sýr  (99 výrobků)  → podle DRUHU:   eidam · tavený · gouda · cheddar
     minerálka (8)      → podle ZNAČKY:  Gemerka · Vincentka · Magnesia…
     mouka (5)          → podle ZNAČKY:  Ramill · Zátkova · Karlova Koruna
   Ve skutečnosti je to jedna a tatáž věc: u každého výrobku se najde PRVNÍ
   SLOVO, KTERÉ DOTAZ NEVYSVĚTLUJE („Mletá káva Jacobs" → mletá, „Mouka
   Ramill" → Ramill). Když těch slov pár opakuje víc výrobků, jsou to druhy;
   když je každé jiné, jsou to značky. Hádat se nemusí nic.

   ── PROČ TAK PŘÍSNÉ PODMÍNKY ─────────────────────────────────────────────
   První pokus se ptal u 59 z 79 běžných položek, tedy skoro pořád, a nabízel
   nesmysly: u „soli" nabídl Sůl do myčky, u „mléka" Mléko na opalování,
   u „česneku" chléb česnekový (skutečný česnek ve vzorku nebyl) a u „slaniny"
   dvakrát tutéž slaninu s jinak useknutým názvem. Odtud tři brzdy níž. */

/** Kolik různých voleb musí vyjít, aby to byl výběr a ne jen dva řádky. */
const NEJMENE_VOLEB = 3;

/** Víc voleb už není výběr, ale další seznam k prohledání. */
const MAX_VOLEB = 8;

export interface Druh {
  /** Co se člověku ukáže jako volba — „Mletá" / „Minerální voda Vincentka". */
  popis: string;
  /** Čím se má hledat, když si tohle vybere. */
  dotaz: string;
  /** Kolik různých výrobků do téhle volby spadá (1 = konkrétní výrobek). */
  pocet: number;
  /** Nejnižší cena ve volbě — aby to nebyl jen holý nápis. */
  odCeny: number;
  obchod: string;
}

/** Hlavička pro zobrazení: první písmeno velké, zbytek jak je. */
const sVelkym = (s: string): string =>
  s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);

/**
 * Vrátí volby „cos myslel?" pro obecný dotaz. Prázdné pole = není z čeho
 * vybírat a má se rovnou ukázat cena — tak to dopadne u většiny položek.
 *
 * Volá se STEJNÉ skórování jako u hledání cen. Kdyby mělo vlastní, rozešlo
 * by se to a nabídka druhů by ukazovala něco jiného než cena pod ní.
 *
 * @param dnes  místní dnešek `YYYY-MM-DD` — druh, který je jen v prošlém
 *              letáku, se koupit nedá, a nabízet se proto nesmí (30. 9. 2026)
 */
export const nabidniDruhy = (
  searchText: string,
  vsechnyNabidky: PriceDeal[],
  canonicals: string[],
  dnes: string
): Druh[] => {
  if (!searchText || searchText.length < 3) return [];
  // Stejně jako u cen: prošlé akce pryč dřív, než se začne vybírat.
  const deals = vsechnyNabidky.filter((d) => !jeProslaAkce(d, dnes));
  if (deals.length === 0) return [];

  const dotaz = bezMnozstvi(searchText);
  const dotazTokeny = tokenize(dotaz);

  /* BRZDA 1 — „pokud není přímo zadavatelem specifikováno".
     Kdo napsal „mletá káva" nebo „sýr eidam", už si vybral; ptát se ho
     podruhé je otravné. Nabídka druhů patří jen k JEDNOSLOVNÉ položce. */
  if (dotazTokeny.length !== 1) return [];

  /* BRZDA 1b — UŽ SE JEDNOU ZEPTALO a on odpověděl.
     Výběr druhu se ukládá jako naučený alias („káva" → „mletá káva"), jenže
     položka na seznamu zůstane pořád jednoslovná — bez tohohle by brzda 1
     nezabrala a appka by se ptala po každém načtení znovu. */
  if (canonicals.length > 0) return [];

  const searchTerms = [dotaz, ...canonicals];
  const queryCategory = detectCategory(dotaz);

  const matches: Array<{ deal: PriceDeal; score: number }> = [];
  for (const deal of deals) {
    /* BRZDA 2 — jen zboží ze STEJNÉ kategorie. U cen stačí, že se jiná
       kategorie penalizuje čtyřmi body, protože tam jde o jeden nejlepší
       výsledek. Tady se vypisuje víc řádků najednou, takže se to protlačí:
       u „soli" nabízelo Sůl do myčky, u „mléka" Mléko na opalování. */
    if (queryCategory && deal.category && deal.category !== queryCategory) continue;

    let bestScore = 0;
    for (const term of searchTerms) {
      const score = calculateMatchScore(term, deal);
      if (score > bestScore) bestScore = score;
    }
    if (bestScore < 3) continue;
    matches.push({ deal, score: bestScore });
  }
  if (matches.length === 0) return [];

  /* Stejný odstup jako u cen — co je o něčem znatelně jiném, není „druh",
     ale omyl. Bez toho by se mezi volby u „kávy" dostaly smetánky do kávy. */
  const nejlepsi = Math.max(...matches.map((x) => x.score));
  /* Jiný výrobek (14-6) není druh — pomazánka není druh česneku. Vyřazuje se
     AŽ ZA odstupem, stejně jako u cen, ať nabídka druhů neukazuje něco jiného
     než cena pod ní. Když zbudou jen jiné výrobky, nenabízí se nic a cena
     s příznakem to řekne sama. */
  const blizko = matches.filter(
    (x) => x.score >= nejlepsi - ROZUMNY_ODSTUP && !jeJinyVyrobek(searchTerms, x.deal.productName)
  );
  if (blizko.length === 0) return [];

  // Jeden řádek na VÝROBEK (ne na obchod); při shodě názvu vyhrává lacinější.
  const podleVyrobku = new Map<string, PriceDeal>();
  for (const x of blizko) {
    const klic = normalizeText(x.deal.productName);
    const ma = podleVyrobku.get(klic);
    if (!ma || x.deal.price < ma.price) podleVyrobku.set(klic, x.deal);
  }

  /* Rozlišující slovo = první slovo názvu, které dotaz nevysvětluje.
     Klíčem je jeho KMEN, jinak by se „Pivo světlý ležák" a „Pivo světlé
     výčepní" rozpadly na dvě skupiny téhož (změřeno: 35 + 12 řádků). */
  const vysvetleno = new Set<string>(dotazTokeny);
  for (const t of dotazTokeny) {
    for (const r of relatedTerms(t)) vysvetleno.add(r);
  }

  const skupiny = new Map<string, { popis: string; kusy: PriceDeal[] }>();
  for (const deal of podleVyrobku.values()) {
    const rozlisujici = tokenize(deal.productName).find((w) => !vysvetleno.has(w));
    if (!rozlisujici) continue; // název neříká nic nad rámec dotazu
    const klic = kmen(rozlisujici);
    const ma = skupiny.get(klic);
    if (ma) ma.kusy.push(deal);
    else skupiny.set(klic, { popis: rozlisujici, kusy: [deal] });
  }

  const nejlevnejsi = (kusy: PriceDeal[]) =>
    kusy.reduce((a, b) => (a.price <= b.price ? a : b));

  /* ── PODOBA A: DRUHY ──────────────────────────────────────────────────
     Rozlišující slovo sdílí víc výrobků → je to druh, ne jméno.
     „káva" → mletá · instantní · zrnková · ledová */
  const druhy = Array.from(skupiny.values()).filter((g) => g.kusy.length >= 2);
  if (druhy.length >= 2) {
    return druhy
      .sort((a, b) => b.kusy.length - a.kusy.length)
      .slice(0, MAX_VOLEB)
      .map((g) => {
        const nej = nejlevnejsi(g.kusy);
        return {
          popis: sVelkym(g.popis),
          dotaz: `${g.popis} ${dotaz}`,
          pocet: g.kusy.length,
          odCeny: nej.price,
          obchod: nej.store,
        };
      });
  }

  /* ── PODOBA B: ZNAČKY ─────────────────────────────────────────────────
     Každý výrobek má rozlišující slovo sám pro sebe → jsou to jména.
     „mouka" → Ramill · Albert · Karlova Koruna · Zátkova

     BRZDA 3 — musí jich být aspoň NEJMENE_VOLEB. Dvě položky nejsou výběr
     a bývají to dvě podoby téhož: „Slanina pikantní Deli" a „Slanina
     pikantní delikátní" se liší jen tím, kde leták usekl název. Počítají
     se SKUPINY, ne výrobky — troje „Brambory konzumní rané" od tří obchodů
     mají totéž rozlišující slovo, takže je to jedna volba, a tedy žádná.

     Vypisují se ale VÝROBKY, ne skupiny: u „minerálky" spadne šest značek pod
     společné slovo „voda", a kdyby se z každé skupiny brala jen nejlevnější,
     zmizely by Vincentka, Magnesia i Mattoni — tedy právě to, z čeho se má
     vybírat.

     PROČ U DRUHŮ STAČÍ DVĚ a tady je potřeba tři: dva skutečné druhy jsou
     pořádná otázka („cukr: krystal, nebo krupice?"), kdežto dva výrobky bývají
     dvě podoby téhož. */
  if (skupiny.size < NEJMENE_VOLEB) return [];

  return Array.from(skupiny.values())
    .flatMap((g) => g.kusy)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_VOLEB)
    .map((deal) => ({
      popis: deal.productName,
      dotaz: deal.productName,
      pocet: 1,
      odCeny: deal.price,
      obchod: deal.store,
    }));
};
