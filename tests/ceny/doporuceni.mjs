// tests/ceny/doporuceni.mjs
//
// ZKOUŠKA: TIP DOPORUČENÍ OBCHODU NELŽE O ÚSPOŘE          (29. 9. 2026)
//   npm run test:ceny-doporuceni
//
// Pouští SKUTEČNÝ `src/api/shoppingAnalyzer.ts` nasucho: `findAllDeals` se
// podstrčí (esbuild místo `./pricesAPI` vloží náhradu), takže nejde o Firebase
// ani o dnešní letáky — jen o to, co tip z daných cen řekne.
//
// Proč vznikla: úspora se počítala proti NEJDRAŽŠÍMU obchodu, ale tip jmenoval
// obchod na druhém místě („V Penny ušetříš 28 Kč oproti Albert", proti Albertu
// přitom 4 Kč), a sčítala se přes RŮZNÉ zboží (stejný počet položek ≠ stejné
// položky). Pravidlo teď: jen proti jmenovanému obchodu, jen za zboží, které
// mají v aktuální akci oba, celé koruny.
//
// Kalibrace: `DOPORUCENI_SOUBOR=<jiná verze shoppingAnalyzer.ts>` přeloží místo
// ostrého souboru jinou verzi (např. starou z gitu) — musí propadnout.
//
// PROŠLÁ AKCE (30. 9. 2026): případy s `letaky` nejdou přes podstrčené ceny,
// ale přes SKUTEČNÉ hledání (`hledejVNabidkach` z `priceMatching.ts`) nad
// nabídkami tak, jak leží v databázi, k dni `dnes`. Jarek 30. 9. dostal
// „Doporučení: Billa — V Billa ušetříš 13 Kč oproti Kaufland, platí do 29. 9."
// Kalibrace hledání: `CENY_SOUBOR=<jiná verze priceMatching.ts>` (jako
// `test:ceny`) — stará verze musí zopakovat přesně Jarkovu větu.
//
// RODINNÁ NÁSTĚNKA: převzato z Family-Dashboard 0201f24 (30. 9. 2026) BEZ
// případu „obchody kolem nás" — tahle funkce tu není (`analyzeShoppingList`
// bere jen položky). Zbytek beze změny, ať jde další srovnání s FD přes diff.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const KDE = dirname(fileURLToPath(import.meta.url));
const KOREN = join(KDE, '..', '..');

/* Místo `./pricesAPI` (Firebase, cache, letáky) náhrada, která vrací ceny
   z právě běžícího případu. */
const podstrcCeny = {
  name: 'podstrc-ceny',
  setup(b) {
    b.onResolve({ filter: /(^|\/)pricesAPI$/ }, () => ({ path: 'pricesAPI', namespace: 'podstrc' }));
    b.onLoad({ filter: /.*/, namespace: 'podstrc' }, () => ({
      contents: 'export const findAllDeals = async (nazev, bez) => globalThis.__cenyZkousky(nazev, bez);',
      loader: 'js',
    }));
  },
};
const jinyZdroj = process.env.DOPORUCENI_SOUBOR;
const prelozeno = await build({
  ...(jinyZdroj
    ? { stdin: { contents: readFileSync(jinyZdroj, 'utf8'), resolveDir: join(KOREN, 'src', 'api'), loader: 'ts' } }
    : { entryPoints: [join(KOREN, 'src', 'api', 'shoppingAnalyzer.ts')] }),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
  plugins: [podstrcCeny],
});
if (jinyZdroj) console.log(`\n⚠️  KALIBRACE: doporučení přeloženo z ${jinyZdroj}`);
const { analyzeShoppingList } = await import(
  'data:text/javascript;base64,' + Buffer.from(prelozeno.outputFiles[0].text).toString('base64')
);

/* Skutečné hledání cen a serverový slovník — pro případy s `letaky`. */
const nactiModul = async (volby) => {
  const vystup = await build({ ...volby, bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(vystup.outputFiles[0].text).toString('base64'));
};
const jineHledani = process.env.CENY_SOUBOR;
if (jineHledani) console.log(`⚠️  KALIBRACE: hledání přeloženo z ${jineHledani}`);
const { hledejVNabidkach } = await nactiModul(
  jineHledani
    ? { stdin: { contents: readFileSync(jineHledani, 'utf8'), resolveDir: join(KOREN, 'src', 'api'), loader: 'ts' } }
    : { entryPoints: [join(KOREN, 'src', 'api', 'priceMatching.ts')] },
);
const { buildKeywords, detectCategory } = await nactiModul({
  entryPoints: [join(KOREN, 'functions', 'src', 'normalizacePotravin.ts')],
});

/** Nabídka z letáku tak, jak leží v databázi: klíčová slova a kategorii
 *  počítá serverový slovník (jako `prijmiLetaky`), ne ruka. */
const letak = (store, validFrom, validUntil, productName, price) => ({
  productName,
  keywords: buildKeywords(productName),
  category: detectCategory(productName),
  store,
  price,
  unit: null,
  pricePerUnit: null,
  currency: 'CZK',
  validFrom,
  validUntil,
  validityText: null,
  productUrl: null,
});

/* Jarkův seznam 30. 9. 2026. Úterní dávka (29. 9.) nový leták Billy
   nepřinesla — všech 325 jejích nabídek v databázi končilo 29. 9. */
const LETAKY_30_9 = [
  letak('Billa', '2026-09-23', '2026-09-29', 'Pivo světlé výčepní 10° Staropramen', 10.9),
  letak('Billa', '2026-09-23', '2026-09-29', 'Máslo A7B', 22.9),
  letak('Kaufland', '2026-09-30', '2026-10-06', 'Pivo světlé výčepní Budweiser Budvar', 13.9),
  letak('Kaufland', '2026-09-30', '2026-10-06', 'Máslo Tatra', 32.9),
];

/** Nabídka tak, jak ji vrací `findAllDeals` (jen pole, která doporučení čte). */
const n = (store, cena, { budouci = false, jiny = false } = {}) => ({
  store,
  price: `${cena} Kč`,
  priceNum: cena,
  isFuture: budouci,
  validUntil: budouci ? '2026-10-10' : '2026-10-03',
  ...(jiny ? { jinyVyrobek: true } : {}),
});

const PRIPADY = [
  {
    nazev: 'zadání: druhý obchod není nejdražší, rozdíl 4 Kč',
    nabidky: {
      mléko: [n('Penny', 6.9), n('Albert', 9.9), n('Lidl', 19.9)],
      rohlíky: [n('Penny', 3.9), n('Albert', 4.9), n('Lidl', 18.9)],
    },
    tip: null,
    proc: 'Penny 10,80 × Albert 14,80 × Lidl 38,80 — tip tvrdil „ušetříš 28 Kč oproti Albert"; proti Albertu jsou to 4 Kč, tedy pod prahem 10 Kč',
  },
  {
    nazev: 'druhý není nejdražší, rozdíl nad 10 Kč',
    nabidky: {
      mléko: [n('Penny', 6.9), n('Albert', 18.9), n('Lidl', 19.9)],
      rohlíky: [n('Penny', 3.9), n('Albert', 4.9), n('Lidl', 18.9)],
    },
    tip: 'V Penny ušetříš 13 Kč oproti Albert, platí do 3. 10.',
    proc: 'částka patří k obchodu, který věta jmenuje (Albert 23,80 − Penny 10,80), ne k nejdražšímu Lidlu',
  },
  {
    nazev: 'stejný počet, jiné zboží — počítá se jen společné',
    nabidky: {
      mléko: [n('Penny', 6.9), n('Lidl', 19.9)],
      rohlíky: [n('Penny', 3.9)],
      jablka: [n('Lidl', 21.9)],
    },
    tip: 'V Penny ušetříš 13 Kč oproti Lidl za zboží, které mají v akci oba, platí do 3. 10.',
    proc: 'rozdíl součtů (31 Kč) je rozdíl mezi jablky a rohlíky, ne úspora — srovnatelné je jen mléko',
  },
  {
    nazev: 'stejný počet, nic společného — žádná úspora',
    nabidky: {
      rohlíky: [n('Penny', 3.9)],
      jablka: [n('Lidl', 21.9)],
    },
    tip: null,
    proc: 'tip tvrdil „ušetříš 18 Kč oproti Lidl" — za úplně jiné zboží',
  },
  {
    nazev: 'celé koruny, žádná desetinná tečka',
    nabidky: {
      mléko: [n('Penny', 6.9), n('Kaufland', 9.3)],
      máslo: [n('Penny', 39.9), n('Kaufland', 49.9)],
    },
    tip: 'V Penny ušetříš 12 Kč oproti Kaufland, platí do 3. 10.',
    proc: 'dřív „ušetříš 12.4 Kč" — s tečkou místo čárky',
  },
  {
    nazev: 'budoucí akce a jiný výrobek se nepočítají',
    nabidky: {
      mléko: [n('Penny', 6.9), n('Albert', 19.9)],
      rohlíky: [n('Penny', 3.9), n('Albert', 1.9, { budouci: true })],
      jogurt: [n('Albert', 9.9), n('Penny', 7.9, { budouci: true })],
      vejce: [n('Penny', 22.9, { jiny: true })],
    },
    tip: 'V Penny ušetříš 13 Kč oproti Albert za zboží, které mají v akci oba, platí do 3. 10. V příštím letáku tam přibude dalších 1',
    proc: 'rohlíky v Albertu začnou až příští týden — do srovnání nepatří; aspik místo vajec (jiný výrobek) se nepočítá vůbec; „3. 10." končí tečkou, druhá nepřibude',
  },
  {
    nazev: 'víc položek v akci rozhoduje (beze změny)',
    nabidky: {
      mléko: [n('Penny', 6.9), n('Albert', 5.9)],
      rohlíky: [n('Penny', 3.9), n('Albert', 2.9)],
      jablka: [n('Penny', 21.9)],
    },
    tip: 'Jdi do Penny — 3 z 3 položek v aktuální akci, platí do 3. 10.',
    proc: 'pojistka, že se neporušilo to, co fungovalo',
  },
  {
    nazev: 'jediný obchod (beze změny)',
    nabidky: {
      mléko: [n('Penny', 6.9)],
      chleba: [],
    },
    tip: 'Penny má 1 z 2 položek v aktuální akci, platí do 3. 10.',
    proc: 'pojistka, že se neporušilo to, co fungovalo',
  },
  /* ── PROŠLÁ AKCE — přes skutečné hledání (30. 9. 2026) ─────────────── */
  {
    nazev: 'prošlá akce: Billa skončila včera (Jarek 30. 9.)',
    letaky: LETAKY_30_9,
    dnes: '2026-09-30',
    polozky: ['Pivo', 'Máslo', 'Radek 10'],
    tip: 'Kaufland má 2 z 3 položek v aktuální akci, platí do 6. 10.',
    proc: 'Jarek 30. 9. na rodinnypanel.cz: „Doporučení: Billa — V Billa ušetříš 13 Kč oproti Kaufland, platí do 29. 9." — hledání bralo akci, která včera skončila, jako dnešní',
  },
  {
    nazev: 'prošlá akce: poslední den letáku se ještě počítá',
    letaky: LETAKY_30_9,
    dnes: '2026-09-29',
    polozky: ['Pivo', 'Máslo', 'Radek 10'],
    tip: 'Billa má 2 z 3 položek v aktuální akci, platí do 29. 9.',
    proc: 'PROTIVÁHA — „platí do 29. 9." platí i 29. 9. (prošlá je až den nato); Kaufland začíná 30. 9., takže se 29. 9. ještě nepočítá',
  },
];

const barva = (t, c) => `\x1b[${c}m${t}\x1b[0m`;
const zeleny = (t) => barva(t, 32);
const cerveny = (t) => barva(t, 31);
const seda = (t) => barva(t, 90);

console.log(`\nZkouška tipu doporučení obchodu — ${PRIPADY.length} případů\n`);
const padly = [];
for (const p of PRIPADY) {
  /* Náhrada vrací i nabídky z vypnutých obchodů — doporučení je nesmí použít —
     a zapisuje si, co dostala: vypnuté obchody musí dostat i hledání cen,
     jinak by cenovka u položky ukázala cenu z obchodu, který rodina nemá. */
  const predano = [];
  globalThis.__cenyZkousky = async (nazev, bez) => {
    predano.push(bez ?? null);
    return p.letaky
      ? hledejVNabidkach(nazev, p.letaky.filter((d) => !(bez ?? []).includes(d.store)), [], p.dnes)
      : p.nabidky[nazev] ?? [];
  };
  const polozky = (p.polozky ?? Object.keys(p.nabidky)).map((name) => ({ name, completed: false }));
  const { tip } = await analyzeShoppingList(polozky, p.bez ?? []);
  const ma = tip ?? null;
  const spatnePredano = p.bez && predano.find((b) => JSON.stringify(b) !== JSON.stringify(p.bez));
  if (spatnePredano !== undefined && spatnePredano !== false) {
    padly.push({ p, ma: `hledání cen dostalo vypnuté obchody ${JSON.stringify(spatnePredano)}, ne ${JSON.stringify(p.bez)}` });
    console.log(`  ${cerveny('✗')} ${p.nazev.padEnd(50)} ${cerveny('vypnuté obchody se hledání cen nepředaly')}`);
  } else if (ma === p.tip) {
    console.log(`  ${zeleny('✓')} ${p.nazev.padEnd(50)} ${seda(ma ?? '(bez tipu)')}`);
  } else {
    padly.push({ p, ma });
    console.log(`  ${cerveny('✗')} ${p.nazev.padEnd(50)} ${cerveny(ma ?? '(bez tipu)')}`);
  }
}

console.log(`\nCELKEM: ${PRIPADY.length - padly.length} z ${PRIPADY.length} v pořádku, ${padly.length} padlo\n`);
if (padly.length) {
  console.log('Co padlo a proč to v seznamu je:');
  for (const { p, ma } of padly) {
    console.log(`\n  ${cerveny(p.nazev)}`);
    console.log(`     tip:   ${ma ?? '(žádný)'}`);
    console.log(`     čekal: ${p.tip ?? '(žádný tip)'}`);
    console.log(`     ${seda('důvod: ' + p.proc)}`);
  }
  console.log('');
  process.exit(1);
}
