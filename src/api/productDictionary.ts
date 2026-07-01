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
