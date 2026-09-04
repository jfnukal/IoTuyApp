// functions/src/normalizacePotravin.ts
//
// Slovníky a normalizace produktů z letáků — NA SERVERU.
//
// Proč tady: dosud to dělal scraper na Apify a klient měl vlastní kopii
// (`src/api/productDictionary.ts`). Dvě kopie téhož, které se musely ručně
// držet v souladu — a rozešly se pokaždé, když na to někdo zapomněl.
// Scraper už do databáze nepíše přímo; posílá SUROVÁ data do `prijmiLetaky`,
// takže tenhle soubor je jediné místo, kde se rozhoduje, co je která kategorie
// a co na nákupní seznam vůbec patří.
//
// Hlavní výhoda: když se slovník vylepší, data se PŘEPOČÍTAJÍ ZPĚTNĚ.
// Ve scraperu to znamenalo čekat na příští leták.
//
// Zdroj: převzato 1:1 z `Family-Dashboard/functions/src/normalizacePotravin.ts`
// (31. 8. 2026), ať se nic neztratí překlepem při přepisování.
//
// ⚠️ POŘÁD ZBÝVÁ JEDNA DVOJICE: `CATEGORY_KEYWORDS` níž musí zůstat SHODNÉ
// s klientským `src/api/productDictionary.ts`. Klient totiž určuje kategorii
// HLEDANÉHO VÝRAZU a `pricesAPI.ts` ji porovnává s kategorií nabídky (shoda
// +4 body, neshoda −4). Když se slovníky rozejdou, appka začne správné
// nabídky zahazovat. Při každé změně upravit OBA soubory.

export const STOP_WORDS = new Set<string>([
    'bez', 'se', 'na', 'do', 've', 'ze', 'za', 'ke', 'pro', 'nebo', 'po',
    'od', 'pri', 'pred', 'nad', 'pod', 'mezi', 'the',
    'kus', 'kusy', 'celku', 'vcelku', 'cca', 'asi', 'jako', 'bal', 'baleni',
    'plu', 'akce', 'sleva', 'novy', 'nova', 'nove',
    'ml', 'dl', 'kg', 'dkg', 'mg',
])
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
export const NON_FOOD_KEYWORDS: string[] = [
    // květiny / zahrada
    'kytice', 'kvetin', 'kvetinac', 'muskat', 'tuje', 'zahrad', 'hnojiv',
    'substrat', 'semena', 'travni', 'mulcov', 'postrik',
    // oblečení / obuv
    'tricko', 'tricka', 'kalhot', 'ponozk', 'obleceni', 'bunda', 'mikina',
    'obuv', 'pyzamo', 'plavky', 'cepice', 'rukavice', 'zupan',
    // dům / nářadí
    'naradi', 'vrtack', 'sroubovak', 'zarovk', 'prodluzov', 'nabytek',
    'zidle', 'police', 'koberec', 'zaves', 'povleceni',
    // elektro
    'televiz', 'sluchatk', 'nabijeck', 'powerbank',
    // hračky
    'hracka', 'hracky', 'plysak', 'puzzle', 'lego',
    // značky nepotravin (Lidl/Kaufland)
    'parkside', 'silvercrest', 'esmara', 'livarno', 'cuisino', 'tronic',
    // ostatní nepotraviny
    'svicka', 'zapalovac', 'hrnek', 'pribor', 'kufr',

    /* --- doplneno 25. 8. 2026 podle skutečného vývozu 3 299 produktů ---
       Jarek měl obavu, že po 12. straně letáku už jsou "jen hračky
       a kosmetika". Změřeno: smetí jsou **3 %**, a skoro celé jsou to
       školní potřeby (konec srpna!) a řezané květiny. Stránkový strop
       je tedy ŠPATNÝ nástroj — jídlo a smetí se v letáku prolínají
       (u Albertu je na stranách 49–54 zase 96 % potravin). Filtruje se
       proto podle názvu.
       ⚠ PAST: do seznamu se NESMÍ 'polstar'. Chytal "Cereálie
       polštářky" i "Pamlsky pro kočky polštářky". Kmeny se porovnávají
       na ZAČÁTEK SLOVA, ne kdekoli v něm — i tak je třeba je zkoušet
       proti skutečným datům, ne je vymýšlet od stolu. */
    // školní potřeby
    'sesit', 'sesity', 'tuzka', 'tuzky', 'penal', 'skicak', 'zvyraznova',
    'temperov', 'stetec', 'stetce', 'lepidlo', 'lepidla', 'poradac',
    'pravitko', 'rysovac', 'pastelk', 'popisova', 'aktovk', 'batoh',
    'skolni', 'ucebnic',
    // řezané květiny a pokojovky
    'chryzantem', 'spathiphyllum', 'spatyfilium', 'nevadlec', 'celosie',
    'toulcovka', 'lopatkovec', 'orchide', 'dracena', 'sukulent', 'vresov',
    // domácnost
    'zehlic', 'zehlick', 'prkno', 'ubrus', 'vesak', 'ramecek', 'kbelik', 'baterk',
    /* přístroje. ⚠ 'holici' sem NEPATŘÍ — je to zároveň klíčové slovo
       kategorie DROGERIE, takže by vyhazovalo holící pěnu a gel, což je
       naprosto legitimní položka nákupního seznamu. Nasadil jsem ho tam
       25. 8. omylem a odhalilo se to až strojovým porovnáním obou seznamů. */
    'zastrihova', 'oneblade', 'epilator',
    /* Opalovaci kosmetika (doplneno 4. 9. 2026). „Mleko na opalovani" ma
       v nazvu slovo „mleko", a `detectCategory` bere PRVNI shodu, takze
       spadlo do kategorie MLECNE a nabizelo se mezi mlecnymi vyrobky.
       Stejna past jako u krmiva pro mazlicky. Na seznamu povolene drogerie
       (toaletak, kapesniky, ubrousky, plenky) opalovani neni. */
    'opalov',

    /* Čisticí chemie (doplněno 4. 9. 2026). Tatáž past jako u opalovacího
       mléka, jen na jiných slovech: `detectCategory` vrací PRVNÍ shodu
       a `trvanlive` (kde je 'ocet' a 'sul') se testuje DŘÍV než `drogerie`
       (kde je 'cistic'). „Čistič bílý ocet Tierra Verde" proto skákal na
       dotaz „ocet" jako JEDINÝ výsledek a „Sůl do myčky Somat" se nabízela
       mezi kuchyňskými solemi.

       ⚠ 'sul' ani 'ocet' sem NEPATŘÍ — to jsou potraviny; rozlišuje až druhé
       slovo v názvu. Každý kmen níž je zkoušený proti vzorku, ne vymyšlený:
       'cistic' vyhodí 2 položky (včetně „Mléko pleťové čisticí Cien", které
       kvůli slovu „mléko" sedělo v kategorii MLECNE), 'myck' jednu a 'praci'
       osm — všechny právem. Zbytek ve vzorku netrefí nic, je preventivní.
       Kmeny se porovnávají na ZAČÁTEK SLOVA, takže víceslovné tvary
       („do myčky", „wc gel") tady nefungují — musí to být jedno slovo. */
    'cistic', 'myck', 'praci', 'saponat', 'avivaz',
    'odvapnov', 'odmast', 'dezinfek', 'desinfek', 'wc',
];
export const CHTENA_DROGERIE: string[] = ['toaletni', 'kapesnik', 'kapesnick', 'ubrousky', 'plenky'];

/** Bez diakritiky, malá písmena. */
export const normalizeWord = (w: string): string =>
  w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Klíčová slova z názvu — bez diakritiky, bez stop-slov, min. 3 znaky. */
export const buildKeywords = (name: string): string[] =>
  normalizeWord(name)
    .split(/[\s,./()]+/)
    .filter((w) => w.length > 2 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));

/** Kategorie podle klíčových slov v názvu. POŘADÍ VE SLOVNÍKU ROZHODUJE. */
export const detectCategory = (name: string): string | null => {
  const norm = normalizeWord(name);
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => norm.includes(w))) return category;
  }
  return null;
};

/** True = nepotravina (vrtačky, hračky, květiny, školní potřeby…). */
export const isNonFood = (name: string): boolean => {
  const tokens = normalizeWord(name).split(/[\s,./()]+/);
  return tokens.some((t) => NON_FOOD_KEYWORDS.some((stem) => t.startsWith(stem)));
};

/* Krmivo pro zvířata. NESMÍ se poznávat jen podle kategorie — `detectCategory`
   vrací PRVNÍ shodu v pořadí slovníku a `mazlicci` jsou až předposlední, takže
   dřívější kategorie krmivo ukradnou („Konzerva pro kočky" → trvanlive kvůli
   slovu konzerva). Změřeno 25. 8. 2026: takhle procházelo 23 z 86 krmiv. */
const KRMIVO = CATEGORY_KEYWORDS.mazlicci;

/**
 * Patří produkt na nákupní seznam?
 *
 * Rozhodl Jarek 25. 8. 2026: „chceme jen potraviny, pití a něco z drogerie,
 * ale ne vše… a na základě požadavků uživatelů klidně přidávejme položky,
 * ale ne hned vše."
 *
 * ⚠ Rozhoduje KATEGORIE, ne název. Produkty, kterým slovník kategorii nepozná
 * — a to je každý pátý — procházejí dál. Kdyby se filtrovalo podle názvu,
 * vyhodil by se s Persilem i hummus a tortilly.
 */
export const patriNaSeznam = (name: string, category: string | null): boolean => {
  const n = normalizeWord(name);
  if (category === 'mazlicci' || KRMIVO.some((w) => n.includes(w))) return false;
  if (category === 'drogerie') return CHTENA_DROGERIE.some((w) => n.includes(w));
  return true;
};
