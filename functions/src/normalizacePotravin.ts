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
// ⚠️ Přepočítá se ale až DALŠÍ DÁVKA, kterou scraper pošle. Nabídky, které
//   už v `priceDeals` leží, si nesou kategorii z doby příjmu.
//
// Zdroj: převzato 1:1 z `Family-Dashboard/functions/src/normalizacePotravin.ts`
// (31. 8. 2026, znovu srovnáno k FD commitu 5482c34 dne 29. 9. 2026), ať se
// nic neztratí překlepem při přepisování. Hlavička je jediný rozdíl.
//
// ⚠️ POŘÁD ZBÝVÁ JEDNA DVOJICE: `CATEGORY_KEYWORDS` níž musí zůstat SHODNÉ
// s klientským `src/api/productDictionary.ts`. Klient totiž určuje kategorii
// HLEDANÉHO VÝRAZU a `priceMatching.ts` ji porovnává s kategorií nabídky
// (shoda +4 body, neshoda −4). Když se slovníky rozejdou, appka začne správné
// nabídky zahazovat. Při každé změně upravit OBA soubory.

export const STOP_WORDS = new Set<string>([
    'bez', 'se', 'na', 'do', 've', 'ze', 'za', 'ke', 'pro', 'nebo', 'po',
    'od', 'pri', 'pred', 'nad', 'pod', 'mezi', 'the',
    'kus', 'kusy', 'celku', 'vcelku', 'cca', 'asi', 'jako', 'bal', 'baleni',
    'plu', 'akce', 'sleva', 'novy', 'nova', 'nove',
    'ml', 'dl', 'kg', 'dkg', 'mg',
])
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
    pecivo: ['chleb', 'chleba', 'rohlik', 'houska', 'housk', 'bageta', 'pecivo', 'peciv', 'veka', 'toustov', 'kolac', 'koblih', 'buchta', 'croissant', 'loupak', 'pletenka', 'vanocka', 'dalamanek', 'strudl', 'piskot', 'knacke', 'babovk', 'bochnik', 'preclik', 'pletenec', 'kynut', 'berani', 'krehk'],
    maso: ['maso', 'veprov', 'hovezi', 'kureci', 'kure', 'drubezi', 'slanina', 'klobasa', 'salam', 'sunka', 'sunkov', 'parek', 'parky', 'spekacky', 'vurt', 'krkovice', 'kotleta', 'sekana', 'rizek', 'plec', 'kyta', 'kridla', 'stehno', 'uzene', 'uzenina', 'uzeny', 'panceta', 'pastika', 'pate', 'jatra', 'tlacenka', 'jitrnice', 'jelito', 'reznik', 'debrecin', 'sadlo', 'ryba', 'rybi', 'losos', 'makrela', 'tunak', 'sled', 'filet', 'krevety', 'sardinky', 'pastik'],
    mlecne: ['mleko', 'mlecny', 'maslo', 'jogurt', 'smetana', 'tvaroh', 'syr', 'syrov', 'eidam', 'gouda', 'hermelin', 'niva', 'mozzarella', 'mozarella', 'parenice', 'cottage', 'zakys', 'kefir', 'podmasli', 'skyr', 'termix', 'pribinacek', 'lucina', 'zervy', 'acidko', 'smetanov', 'smetank'],
    ovoce_zelenina: ['jablk', 'banan', 'pomeranc', 'hrusk', 'rajce', 'rajcat', 'paprik', 'okurk', 'cibul', 'cesnek', 'brambor', 'mrkev', 'salat', 'citron', 'limetk', 'hrozn', 'jahod', 'boruvk', 'malin', 'ovoce', 'ovocny', 'zelenina', 'zeleninov', 'meloun', 'ananas', 'kiwi', 'avokado', 'avocado', 'broskev', 'nektarink', 'svestk', 'merunk', 'tresn', 'kapust', 'zeli', 'kvetak', 'brokolic', 'spenat', 'redkev', 'celer', 'porek', 'dyne', 'cuketa', 'lilek', 'houby', 'zampion', 'broskv'],
    napoje: ['napoj', 'mineralk', 'mineralni', 'limonad', 'dzus', 'juice', 'stastn', 'pramenit', 'sodovk', 'malinovk', 'tonic', 'cola', 'kofola', 'pepsi', 'fanta', 'sprite', 'sirup', 'energetick', 'relax', 'magnesia', 'voda', 'stava', 'nektar'],
    kava_caj: ['kava', 'kavov', 'zrnkov', 'cappuccino', 'presso', 'nescafe', 'jihlavanka', 'tchibo', 'jacobs', 'lavazza', 'segafredo', 'caj', 'ahmad', 'pickwick', 'teekanne', 'jemca'],
    alkohol: ['pivo', 'piv', 'vino', 'vina', 'sekt', 'prosecco', 'liker', 'becher', 'fernet', 'tuzemak', 'slivovice', 'myslivec', 'metaxa', 'aperol', 'frisco', 'bozkov', 'vodka', 'rum', 'whisky', 'whiskey', 'gin', 'vermut', 'campari', 'martini', 'plzen', 'svijany', 'krusovice', 'gambrinus', 'radegast', 'kozel', 'staropramen', 'budvar', 'bernard', 'birell', 'excelent', 'zubr', 'holba', 'litovel', 'lambrusco', 'elixir'],
    /* ⚠ 'vin' tu BYLO a chytalo „těstoVINy" — 20 balení těstovin a omáček
       na ně bylo zařazeno jako ALKOHOL, protože `detectCategory` porovnává
       PODŘETĚZCEM (ne začátkem slova) a alkohol se testuje dřív než
       `trvanlive`. Smazat ho ale nestačilo: množné číslo „vína" kmen
       'vino' nechytí a čtyři vína („Vína Vinselekt", „Vína Eminhof"…)
       by zůstala bez kategorie. Proto dvojice 'vino' + 'vina'. */
    sladke: ['cokolad', 'bonbon', 'susenk', 'oplatk', 'keks', 'dezert', 'dort', 'kinder', 'orion', 'milka', 'lindt', 'nestle', 'tatranka', 'horalka', 'fidorka', 'wafle', 'pernik', 'marmelad', 'dzem', 'nutella', 'lentilky', 'haribo', 'tycink', 'makronk', 'pendrek', 'zvykack', 'kakao'],
    slane: ['chips', 'kreker', 'krekr', 'orisk', 'arasid', 'popcorn', 'nachos', 'tortilla', 'brambur', 'krupky', 'snack', 'tortill'],
    trvanlive: ['mouka', 'cukr', 'ryze', 'testovin', 'spagety', 'olej', 'ocet', 'sul', 'koreni', 'omack', 'maggi', 'vitana', 'protlak', 'kecup', 'majonez', 'tatark', 'dresink', 'lusteniny', 'cocka', 'fazole', 'hrach', 'kuskus', 'bulgur', 'vlocky', 'musli', 'granola', 'cerealie', 'knedlik', 'kase', 'polevk', 'bujon', 'vyvar', 'instantni', 'konzerva', 'pomazank', 'hummus', 'strouhank', 'krupick', 'probiotik', 'kapsick', 'kojeneck'],
    /* Vejce mají VLASTNÍ kategorii, a schválně AŽ ZA `trvanlive`.
       `detectCategory` vrací PRVNÍ shodu, takže na pořadí záleží:
       „Instantní polévka Přidej vejce" tak zůstane u polévek (trvanlive)
       a jen skutečná vejce spadnou sem. Kdyby kategorie stála výš,
       ukradla by polévky — změřeno na vzorku, byly by to dvě. */
    vejce: ['vejce'],
    mrazene: ['mrazen', 'zmrzlin', 'nanuk', 'batatov'],
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
       spadlo do kategorie MLECNE a nabizelo se mezi druhy mleka. Stejna
       past jako u krmiva pro mazlicky. Na Jarkove seznamu povolene
       drogerie (toaletak, kapesniky, ubrousky, plenky) opalovani neni. */
    'opalov',

    /* Čisticí chemie (doplněno 6. 9. 2026). Tatáž past jako u opalovacího
       mléka, jen na jiných slovech: `detectCategory` vrací PRVNÍ shodu
       a `trvanlive` (kde je 'ocet' a 'sul') se testuje DŘÍV než `drogerie`
       (kde je 'cistic'). „Čistič bílý ocet Tierra Verde" proto skákal na
       dotaz „ocet" jako JEDINÝ výsledek a „Sůl do myčky Somat" se nabízela
       mezi kuchyňskými solemi. `isNonFood` běží PŘED zařazením do kategorie,
       takže tuhle past obchází.

       ⚠ 'sul' ani 'ocet' sem NEPATŘÍ — to jsou potraviny; rozlišuje až druhé
       slovo v názvu. Stejně tak 'holici' (viz výš). Kmeny se porovnávají
       na ZAČÁTEK SLOVA, takže víceslovné tvary („do myčky") nefungují.

       Změřeno proti vzorku, ne vymyšleno — zabraly tři kmeny:
       'cistic' vyhodil čistič a „Mléko pleťové čisticí Cien" (spadlo do
       MLECNE kvůli slovu „mléko"), 'myck' sůl do myčky, 'praci' osm pracích
       prostředků (Ariel, Persil, Lenor, Perwoll, Woolite), které měly
       kategorii null a procházely úplně bez odporu. Zbytek je preventivní.

       ⚠ POZOR: 'cistic', 'saponat' a 'avivaz' jsou ZÁROVEŇ klíčová slova
       kategorie DROGERIE (viz CATEGORY_KEYWORDS výš). Být v obou seznamech
       je správně a nutné — kategorie říká „co to je", tenhle seznam „nepatří
       na nákupní seznam". Bez zápisu i sem čistič projde jako potravina. */
    'cistic', 'saponat', 'avivaz',
    'myck', 'praci', 'odvapnov', 'odmast', 'dezinfek', 'desinfek', 'wc',

    /* Nepotraviny bez kategorie (doplněno 6. 9. 2026, krok 2 „vysušení díry").
       `patriNaSeznam` propouští všechno, čemu `detectCategory` vrátí null —
       ve vzorku to bylo 84 položek (6,4 %). Zavřít to natvrdo nejde: ve stejné
       hromadě leží vejce, hummus, tortilly i šlehačka. Proto se to vysušuje:
       nejdřív potravinové kmeny do CATEGORY_KEYWORDS, pak sem to, co zbylo.

       KAŽDÝ kmen níž byl napřed zkoušen proti vzorku a je tu jen tehdy,
       když nechytil ANI JEDNU potravinu. Čtyři neprošly a schválně je tu
       jejich seznam, ať je někdo nepřidá znovu:
         'papir'    chytil by TOALETNÍ papír (15 položek) — chtěná drogerie
         'box'      chytil by „Papírové kapesníčky 3vrstvé Paloma"
         'obal'     chytil by „Kuřecí nugetky OBALOVANÉ" (9 položek)
         'deko'     chytil by „Šunku s pepřovým DEKOREM"
         'kojeneck' kojenecká výživa i voda JSOU potraviny
       Vynechané jako zbytečně riskantní, i když ve vzorku neškodí:
         'sada', 'guma' (žvýkací; proto je tu značka 'maped'), 'micek' (mozzarella), 'desky' (dortové). */
    // papírnictví a kancelář
    'voskovk', 'kancelarsk', 'psani', 'pero', 'maped', 'kalkulack',
    'diar', 'kniha', 'korekcni', 'belitko',
    // domácnost a úklidové pomůcky
    'houbick', 'kartac', 'prachovk', 'uterk', 'davkovac', 'susak', 'ramink',
    'pytle', 'pracky', 'hodiny',
    // oblečení, hračky, zvířata, zahrada
    'dziny', 'nazouvak', 'odev', 'privesek', 'plysov', 'skakac',
    'voditko', 'zvirat', 'hnuj', 'autodopln',
    // řezané květiny a pokojovky (ke stávajícím 'kvetin', 'kytice')
    'lisianthus', 'vres', 'zamio',
    // hygiena mimo Jarkův seznam povolené drogerie
    'tampony',
    // domácí chemie a papírnictví (2. kolo, taktéž změřeno proti vzorku)
    'zuby', 'plastov', 'alibona', 'nadobi',
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
  const slova = norm.split(/[^a-z0-9]+/);
  /* TŘI KOLA OD NEJSILNĚJŠÍ SHODY K NEJSLABŠÍ. Dřív se hledal jen podřetězec
     kdekoli, a to zařadilo 20 balení těstovin jako ALKOHOL („těstoVINy“
     obsahuje 'vin'), olivový olej extra virGIN taky, a Savo oriGINal s ním.

     1) VÍCESLOVNÁ FRÁZE nese kontext, a proto rozhoduje první. „Prací prášek“
        je jednoznačnější než kterékoli z těch dvou slov zvlášť.
     2) CELÉ SLOVO (přesněji jeho začátek) — běžný případ.
     3) Teprve nakonec KUS UVNITŘ SLOVA, a jen u kmenů od 5 znaků. Díky tomu
        projdou „miniSALAMky“, „čokoPISKOTy“ a „nesPRESSO“, ale krátké 'gin',
        'rum' ani 'maso' se už doprostřed cizího slova nechytí.

     Mez 5 znaků je změřená, ne odhadnutá: při 4 zůstane „priMASOle“ masem,
     při 6 přijdou minisalámky o kategorii. */
  const fraze = (w: string) => w.includes(' ');
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS))
    if (words.some((w) => fraze(w) && norm.includes(w))) return category;
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS))
    if (words.some((w) => !fraze(w) && slova.some((s) => s.startsWith(w)))) return category;
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS))
    if (words.some((w) => !fraze(w) && w.length >= 5 && norm.includes(w))) return category;
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
