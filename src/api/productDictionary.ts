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
 * POZOR: dávat sem jen skutečné varianty/značky, ne celé kategorie
 * (jinak "vepřová" začne nacházet "hovězí").
 */
export const SYNONYMS: Record<string, string[]> = {
  mouka: ['hladka', 'polohruba', 'hruba', 'psenicna'],
  pecivo: ['rohlik', 'houska', 'bageta'],
  // pivní značky
  pivo: [
    'radegast', 'gambrinus', 'pilsner', 'kozel', 'staropramen',
    'budvar', 'bernard', 'birell',
  ],
  // čajové značky
  caj: ['ahmad', 'pickwick', 'teekanne', 'jemca'],
  // kávové značky
  kava: ['jihlavanka', 'tchibo', 'nescafe', 'douwe', 'jacobs'],
  // kolové nápoje
  kola: ['cocacola', 'pepsi', 'kofola'],
};

// Reverzní mapa: varianta → canonical
const variantToCanonical: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    for (const v of variants) map[v] = canonical;
  }
  return map;
})();

/**
 * Vrátí příbuzné výrazy k tokenu (obousměrně):
 * - je-li token canonical → jeho varianty
 * - je-li token varianta → canonical + sourozenci
 */
export const relatedTerms = (token: string): string[] => {
  const out = new Set<string>();
  if (SYNONYMS[token]) SYNONYMS[token].forEach((v) => out.add(v));
  const canonical = variantToCanonical[token];
  if (canonical) {
    out.add(canonical);
    SYNONYMS[canonical].forEach((v) => out.add(v));
  }
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
  maso: ['maso', 'veprov', 'hovezi', 'kureci', 'kure', 'drubezi', 'slanina', 'klobasa', 'salam', 'sunka', 'sunkov', 'parek', 'parky', 'spekacky', 'vurt', 'krkovice', 'kotleta', 'sekana', 'rizek', 'plec', 'kyta', 'kridla', 'stehno', 'mlete', 'mleta', 'uzene', 'uzenina', 'uzeny', 'panceta', 'pastika', 'pate', 'jatra', 'tlacenka', 'jitrnice', 'jelito', 'reznik', 'debrecin', 'sadlo', 'ryba', 'rybi', 'losos', 'makrela', 'tunak', 'sled', 'filet', 'krevety', 'sardinky'],
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
