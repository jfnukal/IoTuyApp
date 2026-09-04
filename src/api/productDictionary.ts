// src/api/productDictionary.ts
// Sdílená vrstva pro normalizaci, stop-slova a synonyma produktů.
// Slovník rozšiřujeme průběžně — je to startovní sada.

/** Malá písmena, bez diakritiky, oříznuté. Používat VŠUDE (aliasy i deals). */
export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/**
 * Stop-slova — předložky, spojky, jednotky a výplně.
 * Nikdy se nehledají ani neučí jako alias (to dělalo odpad typu "bez → maso").
 * Uloženo bez diakritiky.
 */
export const STOP_WORDS = new Set<string>([
  // předložky / spojky
  'bez', 's', 'se', 'na', 'do', 'v', 've', 'z', 'ze', 'za', 'o', 'u',
  'k', 'ke', 'pro', 'a', 'i', 'nebo', 'po', 'od', 'pri', 'pred', 'nad',
  'pod', 'mezi', 'the',
  // množství / výplně
  'kus', 'kusy', 'ks', 'celku', 'vcelku', 'cca', 'ca', 'asi', 'jako',
  'bal', 'baleni', 'plu',
  // jednotky
  'ml', 'dl', 'l', 'kg', 'g', 'dkg', 'mg',
]);

export const isStopWord = (word: string): boolean =>
  STOP_WORDS.has(normalizeText(word));

/**
 * Synonyma / varianty. canonical → varianty (vše bez diakritiky).
 * Slouží jako MĚKKÉ rozšíření hledání (nižší skóre než přímá shoda),
 * takže nepřebijí přesnou shodu, jen pomůžou když nic jiného nesedí.
 *
 * Tady jsou jen výrazy, které znamenají TOTÉŽ, a proto platí OBOUSMĚRNĚ:
 * „kafe" ↔ „káva", „toaleťák" ↔ „toaletní". Konkrétní značky a druhy patří
 * do `ZNACKY_A_DRUHY` níž — ty obousměrné být nesmějí.
 */
export const SYNONYMS: Record<string, string[]> = {
  mouka: ['hladka', 'polohruba', 'hruba', 'psenicna'],

  /* --- HOVOROVÁ ČEŠTINA (převzato z Family-Dashboard, 25. 8. 2026) ---
     Lidé si na seznam nepíšou „toaletní papír", ale „toaleťák". Dokud tady
     tyhle tvary nebyly, vracelo hledání NULA nálezů — změřeno na skutečných
     datech (`npm run test:ceny`). Sem patří jen běžná mluva, ne celé
     kategorie: „kafe → káva" ano, „maso → kuřecí" ne. */
  kava: ['kafe'],
  toaletni: ['toaletak', 'hajzlpapir'],
  majoneza: ['majolka'],
  brambory: ['bramboraky', 'bramburky'],
  /* Bez diakritiky! Tokeny se porovnávají po `normalizeText`, takže klíč
     s háčkem („vepřove") by se nikdy netrefil a „bůček" by nenašel nic. */
  veprove: ['bucek'],

  /* --- ZKRÁCENÉ TVARY (doplněno 4. 9. 2026) ---
     Nalezeno strojově: projelo se 131 běžných položek proti vzorku letáků
     a hledalo se, kde appka vrátí NULA nálezů, přestože nabídka ve vzorku je.
     Člověk napíše „minerálka", leták říká „Minerální voda" — kmenování to
     nespojí, protože se slova liší víc než koncovkou. */
  mineralni: ['mineralka'],
  tatarska: ['tatarka'],
  kapesnik: ['kapesniky', 'kapesnicky', 'kapesnicek'],
};

/**
 * Obecný pojem → jeho konkrétní značky a druhy. Platí JEN JEDNÍM SMĚREM:
 * „pivo" najde Radegast, ale „Radegast" NIKDY nenajde Gambrinus.
 *
 * PROČ ZVLÁŠŤ (3. 9. 2026): dokud tohle bylo v `SYNONYMS`, byly značky
 * navzájem záměnné — vazba fungovala i zpět a do stran. „Radegast 10"
 * proto dostalo Gambrinus 10° (o korunu levnější) a „gambrinus" vracelo
 * Braník za 9,90. Značka ale není synonymum jiné značky; kdo píše
 * „Radegast", chce Radegast, i kdyby byl dražší.
 *
 * NEROZŠIŘOVAT O POTRAVINÁŘSKÉ ZNAČKY. Zkoušeno a změřeno 4. 9. 2026:
 * značka smí být v tomhle seznamu, jen když dělá JEDEN DRUH výrobku (pivovar
 * dělá pivo). Olma, Madeta, Pilos nebo Orion vyrábějí napříč kategoriemi,
 * takže „mléko → Olma" by začalo nabízet Sýr Niva Madeta a „čokoláda → Orion"
 * Tyčinku Margot — přesně ty výrobky, které odsud pracně vyhazujeme.
 * U minerálek se to zkusilo i s bezpečnými značkami (Mattoni, Vincentka…)
 * a nezměnilo to ANI JEDEN výsledek — filtr odstupu je stejně odřízne.
 */
export const ZNACKY_A_DRUHY: Record<string, string[]> = {
  pecivo: ['rohlik', 'houska', 'bageta'],
  pivo: [
    'radegast', 'gambrinus', 'pilsner', 'kozel', 'staropramen',
    'budvar', 'bernard', 'birell',
  ],
  caj: ['ahmad', 'pickwick', 'teekanne', 'jemca'],
  kava: ['jihlavanka', 'tchibo', 'nescafe', 'douwe', 'jacobs'],
  kola: ['cocacola', 'pepsi', 'kofola'],
};

// Reverzní mapa: varianta → canonical. JEN ze `SYNONYMS` — u značek by
// zpětná vazba znamenala, že „radegast" je totéž co „pivo", tedy i jako
// každá jiná značka piva.
const variantToCanonical: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    for (const v of variants) map[v] = canonical;
  }
  return map;
})();

/**
 * Vrátí příbuzné výrazy k tokenu:
 * - synonyma OBOUSMĚRNĚ (canonical → varianty, varianta → canonical + sourozenci)
 * - značky a druhy JEN SHORA DOLŮ (obecný pojem → konkrétní, nikdy naopak)
 */
export const relatedTerms = (token: string): string[] => {
  const out = new Set<string>();

  if (SYNONYMS[token]) SYNONYMS[token].forEach((v) => out.add(v));
  const canonical = variantToCanonical[token];
  if (canonical) {
    out.add(canonical);
    SYNONYMS[canonical].forEach((v) => out.add(v));
  }

  // Jednosměrně dolů. Zpětná vazba tu schválně NENÍ.
  if (ZNACKY_A_DRUHY[token]) ZNACKY_A_DRUHY[token].forEach((v) => out.add(v));

  out.delete(token);
  return Array.from(out);
};

/**
 * Rozdělí text na smysluplné tokeny:
 * bez diakritiky, bez stop-slov, bez čistých čísel, min. 2 znaky.
 */
export const tokenize = (text: string): string[] =>
  normalizeText(text)
    .split(/[\s,./()]+/)
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));

// === KATEGORIE — musí být SHODNÉ se scraperem (apify/src/main.js). Pořadí ROZHODUJE. ===
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  pecivo: ['chleb', 'chleba', 'rohlik', 'houska', 'housk', 'bageta', 'pecivo', 'peciv', 'veka', 'toustov', 'kolac', 'koblih', 'buchta', 'croissant', 'loupak', 'pletenka', 'vanocka', 'dalamanek', 'strudl', 'piskot', 'knacke'],
  maso: ['maso', 'veprov', 'hovezi', 'kureci', 'kure', 'drubezi', 'slanina', 'klobasa', 'salam', 'sunka', 'sunkov', 'parek', 'parky', 'spekacky', 'vurt', 'krkovice', 'kotleta', 'sekana', 'rizek', 'plec', 'kyta', 'kridla', 'stehno', 'uzene', 'uzenina', 'uzeny', 'panceta', 'pastika', 'pate', 'jatra', 'tlacenka', 'jitrnice', 'jelito', 'reznik', 'debrecin', 'sadlo', 'ryba', 'rybi', 'losos', 'makrela', 'tunak', 'sled', 'filet', 'krevety', 'sardinky'],
  mlecne: ['mleko', 'mlecny', 'maslo', 'jogurt', 'smetana', 'tvaroh', 'syr', 'syrov', 'eidam', 'gouda', 'hermelin', 'niva', 'mozzarella', 'mozarella', 'parenice', 'cottage', 'zakys', 'kefir', 'podmasli', 'skyr', 'termix', 'pribinacek', 'lucina', 'zervy', 'acidko', 'smetanov'],
  ovoce_zelenina: ['jablk', 'banan', 'pomeranc', 'hrusk', 'rajce', 'rajcat', 'paprik', 'okurk', 'cibul', 'cesnek', 'brambor', 'mrkev', 'salat', 'citron', 'limetk', 'hrozn', 'jahod', 'boruvk', 'malin', 'ovoce', 'ovocny', 'zelenina', 'zeleninov', 'meloun', 'ananas', 'kiwi', 'avokado', 'avocado', 'broskev', 'nektarink', 'svestk', 'merunk', 'tresn', 'kapust', 'zeli', 'kvetak', 'brokolic', 'spenat', 'redkev', 'celer', 'porek', 'dyne', 'cuketa', 'lilek', 'houby', 'zampion'],
  napoje: ['napoj', 'mineralk', 'mineralni', 'limonad', 'dzus', 'juice', 'stastn', 'pramenit', 'sodovk', 'malinovk', 'tonic', 'cola', 'kofola', 'pepsi', 'fanta', 'sprite', 'sirup', 'energetick', 'relax', 'magnesia', 'voda'],
  kava_caj: ['kava', 'kavov', 'zrnkov', 'cappuccino', 'presso', 'nescafe', 'jihlavanka', 'tchibo', 'jacobs', 'lavazza', 'segafredo', 'caj', 'ahmad', 'pickwick', 'teekanne', 'jemca'],
  alkohol: ['pivo', 'piv', 'vino', 'vin', 'sekt', 'prosecco', 'liker', 'becher', 'fernet', 'tuzemak', 'slivovice', 'myslivec', 'metaxa', 'aperol', 'frisco', 'bozkov', 'vodka', 'rum', 'whisky', 'whiskey', 'gin', 'vermut', 'campari', 'martini', 'plzen', 'svijany', 'krusovice', 'gambrinus', 'radegast', 'kozel', 'staropramen', 'budvar', 'bernard', 'birell', 'excelent', 'zubr', 'holba', 'litovel'],
  sladke: ['cokolad', 'bonbon', 'susenk', 'oplatk', 'keks', 'dezert', 'dort', 'kinder', 'orion', 'milka', 'lindt', 'nestle', 'tatranka', 'horalka', 'fidorka', 'wafle', 'pernik', 'marmelad', 'dzem', 'nutella', 'lentilky', 'haribo', 'tycink'],
  slane: ['chips', 'kreker', 'krekr', 'orisk', 'arasid', 'popcorn', 'nachos', 'tortilla', 'brambur', 'krupky', 'snack'],
  trvanlive: ['mouka', 'cukr', 'ryze', 'testovin', 'spagety', 'olej', 'ocet', 'sul', 'koreni', 'omack', 'maggi', 'vitana', 'protlak', 'kecup', 'majonez', 'tatark', 'dresink', 'lusteniny', 'cocka', 'fazole', 'hrach', 'kuskus', 'bulgur', 'vlocky', 'musli', 'granola', 'cerealie', 'knedlik', 'kase', 'polevk', 'bujon', 'vyvar', 'instantni', 'konzerva', 'pomazank'],
  mrazene: ['mrazen', 'zmrzlin', 'nanuk'],
  mazlicci: ['pro psy', 'pro kocky', 'pro kocic', 'granule', 'pamlsk', 'whiskas', 'kitekat', 'felix', 'pedigree', 'akinu', 'krmivo'],
  drogerie: ['sprchov', 'sampon', 'mydlo', 'zubni', 'deodorant', 'antiperspirant', 'cistic', 'praci prasek', 'praci gel', 'avivaz', 'toaletni', 'kapesnik', 'kapesnick', 'ubrousky', 'plenky', 'saponat', 'osvezovac', 'holici', 'na vlasy', 'nivea', 'cien'],
};

// Odhadne kategorii z názvu / hledaného textu (null = nezná)
export const detectCategory = (text: string): string | null => {
  const n = normalizeText(text);
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => n.includes(w))) return cat;
  }
  return null;
};
