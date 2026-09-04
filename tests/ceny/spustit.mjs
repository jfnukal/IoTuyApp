// tests/ceny/spustit.mjs
//
// Zkouška vyhledávání cen. Pouští SKUTEČNÝ kód appky (`src/api/priceMatching.ts`)
// proti uloženému vzorku opravdových letáků — ne kopii logiky, která by se
// časem rozešla.
//
//   npm run test:ceny
//
// Vzorek `vzorek.json` je výřez ze skutečného běhu scraperu z 25. 8. 2026.
// Když se přidá nová vada, patří do `ocekavani.mjs`, ne sem.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';
import { PRIPADY, SLOVNIK } from './ocekavani.mjs';

const KDE = dirname(fileURLToPath(import.meta.url));
const KOREN = join(KDE, '..', '..');

// Přeložíme čistou logiku z TypeScriptu a naimportujeme ji rovnou z paměti.
// Bundle proto, že si `priceMatching` tahá slovník z `productDictionary`.
const prelozeno = await build({
  entryPoints: [join(KOREN, 'src', 'api', 'priceMatching.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
});
const kod = prelozeno.outputFiles[0].text;
const { hledejVNabidkach } = await import(
  'data:text/javascript;base64,' + Buffer.from(kod).toString('base64')
);

const NABIDKY = JSON.parse(readFileSync(join(KDE, 'vzorek.json'), 'utf8'));

// Datum vzorku, ne dnešek — jinak by po vypršení letáků spadlo úplně všechno
// a zkouška by přestala měřit hledání a začala měřit kalendář.
const DEN_VZORKU = '2026-08-25';

const barva = (t, c) => `[${c}m${t}[0m`;
const zeleny = (t) => barva(t, 32);
const cerveny = (t) => barva(t, 31);
const seda = (t) => barva(t, 90);

let prosly = 0;
const padly = [];

console.log(`\nZkouška vyhledávání cen — ${NABIDKY.length} nabídek, ${PRIPADY.length} případů\n`);

for (const p of PRIPADY) {
  const vysledky = hledejVNabidkach(p.dotaz, NABIDKY, [], DEN_VZORKU);
  const prvni = vysledky[0];
  const nazev = prvni?.productName ?? '';
  const potreba = p.aspon ?? 1;

  const chyby = [];
  if (vysledky.length < potreba) {
    chyby.push(`nalezeno ${vysledky.length}, čekáno aspoň ${potreba}`);
  }
  if (p.musi && !(prvni && p.musi.test(nazev))) {
    chyby.push(`první je „${nazev || '(nic)'}", má odpovídat ${p.musi}`);
  }
  if (p.nesmi && prvni && p.nesmi.test(nazev)) {
    chyby.push(`první je „${nazev}", což je zakázané (${p.nesmi})`);
  }

  if (chyby.length === 0) {
    prosly++;
    console.log(`  ${zeleny('✓')} ${p.dotaz.padEnd(20)} ${seda(nazev.slice(0, 46))}`);
  } else {
    padly.push({ p, chyby, nazev, pocet: vysledky.length });
    console.log(`  ${cerveny('✗')} ${p.dotaz.padEnd(20)} ${cerveny(chyby[0])}`);
  }
}

// Mezisoučet za tuhle část; co padlo, se vypíše pohromadě až úplně dole.
console.log(`\n${prosly} z ${PRIPADY.length} v pořádku`);

/* ══════════════════════════════════════════════════════════════════════════
   SERVEROVÝ SLOVNÍK
   ══════════════════════════════════════════════════════════════════════════
   Filtr nepotravin rozhoduje o tom, co se vůbec dostane do databáze. Patří
   to sem, i když to bydlí ve `functions/` — projeví se to totiž v nákupním
   seznamu, který tahle zkouška měří. */
const prelozenySlovnik = await build({
  entryPoints: [join(KOREN, 'functions', 'src', 'normalizacePotravin.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
});
const { isNonFood } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(prelozenySlovnik.outputFiles[0].text).toString('base64')
);

console.log(`\nServerový slovník — ${SLOVNIK.length} případů\n`);

for (const p of SLOVNIK) {
  const je = isNonFood(p.nazev);
  if (je === p.nepotravina) {
    prosly++;
    console.log(
      `  ${zeleny('✓')} ${p.nazev.slice(0, 40).padEnd(42)} ${seda(p.nepotravina ? 'nepotravina' : 'potravina')}`
    );
  } else {
    const chyba = p.nepotravina
      ? 'projde jako potravina, ale nemá'
      : 'vyhozeno jako nepotravina, ale je to legitimní položka';
    padly.push({ p: { dotaz: p.nazev, proc: p.proc }, chyby: [chyba] });
    console.log(`  ${cerveny('✗')} ${p.nazev.slice(0, 40).padEnd(42)} ${cerveny(chyba)}`);
  }
}

const celkem = PRIPADY.length + SLOVNIK.length;
console.log(`\nCELKEM: ${prosly} z ${celkem} v pořádku, ${padly.length} padlo\n`);

if (padly.length > 0) {
  console.log('Co padlo a proč to v seznamu je:');
  for (const { p, chyby } of padly) {
    console.log(`\n  ${cerveny(p.dotaz)}`);
    for (const ch of chyby) console.log(`     ${ch}`);
    if (p.proc) console.log(`     ${seda('důvod: ' + p.proc)}`);
  }
  console.log('');
}

process.exit(padly.length > 0 ? 1 : 0);
