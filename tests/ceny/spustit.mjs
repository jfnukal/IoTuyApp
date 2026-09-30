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
import { PRIPADY, DRUHY, SLOVNIK, JINE } from './ocekavani.mjs';

const KDE = dirname(fileURLToPath(import.meta.url));
const KOREN = join(KDE, '..', '..');

// Přeložíme čistou logiku z TypeScriptu a naimportujeme ji rovnou z paměti.
// Bundle proto, že si `priceMatching` tahá slovník z `productDictionary`.
// KALIBRACE: `CENY_SOUBOR=<cesta>` přeloží místo ostrého souboru jinou verzi
// (např. starou z gitu) — se stejným slovníkem, nic se nepřepisuje.
const jinyZdroj = process.env.CENY_SOUBOR;
const prelozeno = await build({
  ...(jinyZdroj
    ? { stdin: { contents: readFileSync(jinyZdroj, 'utf8'), resolveDir: join(KOREN, 'src', 'api'), loader: 'ts' } }
    : { entryPoints: [join(KOREN, 'src', 'api', 'priceMatching.ts')] }),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
});
if (jinyZdroj) console.log(`\n⚠️  KALIBRACE: hledání přeloženo z ${jinyZdroj}`);
const kod = prelozeno.outputFiles[0].text;
const { hledejVNabidkach, nabidniDruhy, jeJinyVyrobek } = await import(
  'data:text/javascript;base64,' + Buffer.from(kod).toString('base64')
);

/* Slovník se překládá UŽ TADY, protože se jím musí prohnat vzorek (viz níž).
   Dřív stál až u své vlastní sekce a vzorek se načítal syrový. */
const prelozenySlovnik = await build({
  entryPoints: [join(KOREN, 'functions', 'src', 'normalizacePotravin.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
});
const { detectCategory, isNonFood, patriNaSeznam, buildKeywords } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(prelozenySlovnik.outputFiles[0].text).toString('base64')
);

/* `vzorek.json` je SYROVÝ výstup scraperu z 25. 8. 2026 — jsou v něm i věci,
   které dnešní `prijmiLetaky` do databáze vůbec nepustí. Bez tohohle filtru
   by zkouška měřila obsah databáze, jaký byl loni, a oprava filtru
   nepotravin by se v ní NIKDY neprojevila (čistič by dál vyhrával „ocet“).
   Filtruje se přesně tak jako ve `functions/src/letaky.ts`. */
const SUROVY = JSON.parse(readFileSync(join(KDE, 'vzorek.json'), 'utf8'));
/* ⚠️ A KATEGORII I KLÍČOVÁ SLOVA PŘEPOČÍTAT jako server (29. 9. 2026, 14-6).
   `prijmiLetaky` ukládá `detectCategory(název)` a `buildKeywords(název)`, ne
   hodnoty ze scraperu — zkouška do té doby měřila scraperová data (vejce bez
   kategorie), tedy jinou databázi, než jakou appka čte. */
const NABIDKY = SUROVY.filter(
  (d) =>
    !isNonFood(d.productName) &&
    patriNaSeznam(d.productName, detectCategory(d.productName))
).map((d) => ({ ...d, category: detectCategory(d.productName), keywords: buildKeywords(d.productName) }));
const ZAHOZENO = SUROVY.length - NABIDKY.length;

// Datum vzorku, ne dnešek — jinak by po vypršení letáků spadlo úplně všechno
// a zkouška by přestala měřit hledání a začala měřit kalendář.
// Případ s `dnes` hledá k jinému dni (prošlé akce, 30. 9. 2026).
const DEN_VZORKU = '2026-08-25';

const barva = (t, c) => `[${c}m${t}[0m`;
const zeleny = (t) => barva(t, 32);
const cerveny = (t) => barva(t, 31);
const seda = (t) => barva(t, 90);

let prosly = 0;
const padly = [];

console.log(`\nZkouška vyhledávání cen — ${NABIDKY.length} nabídek, ${PRIPADY.length} případů\n`);
console.log(seda(`  (vzorek má ${SUROVY.length} položek; filtr nepotravin a seznamu jich zahodil ${ZAHOZENO})`));

for (const p of PRIPADY) {
  /* `bez` = tyhle nabídky v letáku nejsou (14-6: „co když jsou tam JEN vejce
     v aspiku"), ať se dá změřit i případ, který vzorek sám nemá. */
  const nabidky = p.bez ? NABIDKY.filter((d) => !p.bez.test(d.productName)) : NABIDKY;
  const den = p.dnes ?? DEN_VZORKU;
  const vysledky = hledejVNabidkach(p.dotaz, nabidky, [], den);
  const prvni = vysledky[0];
  const nazev = prvni?.productName ?? '';
  const potreba = p.aspon ?? 1;
  const popisDotazu = p.bez ? `${p.dotaz} (bez ${p.bez.source})` : p.dnes ? `${p.dotaz} (k ${p.dnes})` : p.dotaz;

  const chyby = [];
  if (vysledky.length < potreba) {
    chyby.push(`nalezeno ${vysledky.length}, čekáno aspoň ${potreba}`);
  }
  /* PROŠLÁ AKCE (30. 9. 2026) — hlídá se u KAŽDÉHO případu: nic z výsledků
     nesmí k danému dni už skončit, ani jako „další obchod" v detailu. */
  const prosla = vysledky.find((v) => v.validUntil && v.validUntil < den);
  if (prosla) {
    chyby.push(`mezi výsledky je PROŠLÁ akce „${prosla.productName}" (${prosla.store} ${prosla.price}, platila do ${prosla.validUntil}, hledáno k ${den})`);
  }
  if (p.musi && !(prvni && p.musi.test(nazev))) {
    chyby.push(`první je „${nazev || '(nic)'}", má odpovídat ${p.musi}`);
  }
  if (p.nesmi && prvni && p.nesmi.test(nazev)) {
    chyby.push(`první je „${nazev}", což je zakázané (${p.nesmi})`);
  }
  /* Ani v detailu jako „další obchod" (tam by aspik vedle vajec taky lhal). */
  const zakazany = p.nesmiNikde && vysledky.find((v) => p.nesmiNikde.test(v.productName ?? ''));
  if (zakazany) {
    chyby.push(`mezi výsledky je „${zakazany.productName}" (${zakazany.store}), což je zakázané (${p.nesmiNikde})`);
  }
  /* Příznak JINÝ VÝROBEK (14-6): true = obrazovka musí říct, že cena patří
     jinému výrobku; false = je to opravdu hledaná věc. */
  if (p.jiny !== undefined && prvni && (prvni.jinyVyrobek === true) !== p.jiny) {
    chyby.push(p.jiny
      ? `první „${nazev}" NENÍ označený jako jiný výrobek — obrazovka by ho vydávala za „${p.dotaz}"`
      : `první „${nazev}" je označený jako jiný výrobek, ale je to hledaná věc`);
  }

  if (chyby.length === 0) {
    prosly++;
    const znacka = prvni?.jinyVyrobek ? ' [jiný výrobek]' : '';
    console.log(`  ${zeleny('✓')} ${popisDotazu.padEnd(20)} ${seda((nazev + znacka).slice(0, 60))}`);
  } else {
    padly.push({ p: { ...p, dotaz: popisDotazu }, chyby, nazev, pocet: vysledky.length });
    console.log(`  ${cerveny('✗')} ${popisDotazu.padEnd(20)} ${cerveny(chyby[0])}`);
  }
}

// Mezisoučet za tuhle část; co padlo, se vypíše pohromadě až úplně dole.
console.log(`\n${prosly} z ${PRIPADY.length} v pořádku`);

/* ══════════════════════════════════════════════════════════════════════════
   NABÍDKA DRUHŮ — a hlavně: MLČÍ TAM, KDE MÁ
   ══════════════════════════════════════════════════════════════════════════
   Půlka případů schválně čeká PRÁZDNO. Feature, která se ptá pořád, je horší
   než žádná — první pokus se ptal u 59 z 79 běžných položek. */
console.log(`\nNabídka druhů — ${DRUHY.length} případů\n`);

for (const p of DRUHY) {
  const volby = nabidniDruhy(p.dotaz, NABIDKY, p.aliasy ?? [], p.dnes ?? DEN_VZORKU);
  const popisy = volby.map((v) => v.popis);
  const popisDotazu = p.dnes ? `${p.dotaz} (k ${p.dnes})` : p.dotaz;
  const chyby = [];

  if (p.zadne) {
    if (volby.length > 0) {
      chyby.push(`nemá se ptát, ale nabídlo ${volby.length}: ${popisy.join(' · ')}`);
    }
  } else {
    const potreba = p.aspon ?? 2;
    if (volby.length < potreba) {
      chyby.push(`nabídlo ${volby.length} voleb, čekáno aspoň ${potreba}`);
    }
    for (const vzor of p.musi ?? []) {
      if (!popisy.some((x) => vzor.test(x))) {
        chyby.push(`chybí volba odpovídající ${vzor} — je tam: ${popisy.join(' · ') || '(nic)'}`);
      }
    }
  }
  if (p.nesmi) {
    const spatna = popisy.find((x) => p.nesmi.test(x));
    if (spatna) chyby.push(`volba „${spatna}" je zakázaná (${p.nesmi})`);
  }

  if (chyby.length === 0) {
    prosly++;
    const shrnuti = p.zadne ? '— mlčí, správně' : popisy.join(' · ') || '— nic k výběru';
    console.log(`  ${zeleny('✓')} ${popisDotazu.padEnd(20)} ${seda(shrnuti.slice(0, 60))}`);
  } else {
    padly.push({ p: { ...p, dotaz: popisDotazu }, chyby });
    console.log(`  ${cerveny('✗')} ${popisDotazu.padEnd(20)} ${cerveny(chyby[0].slice(0, 70))}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   JINÝ VÝROBEK — slovo po slovu                      (prověrka 14-6, 29. 9. 2026)
   ══════════════════════════════════════════════════════════════════════════
   Hlídá OBĚ strany seznamu `JINE_VYROBKY` v priceMatching.ts: že aspik
   pozná, a že nechytí to, co je schválně venku (Pribináček, Milka, okurka
   salátová, polévkové nudle, sýr NA burger). */
console.log(`\nJiný výrobek — ${JINE.length} případů\n`);

for (const p of JINE) {
  /* Stará verze hledání (kalibrace) funkci vůbec nemá — to je taky nález. */
  const je = typeof jeJinyVyrobek === 'function' ? jeJinyVyrobek(p.hledane, p.nazev) : !p.jiny;
  const popis = `${p.hledane.join(' + ')} → ${p.nazev}`;
  if (je === p.jiny) {
    prosly++;
    console.log(`  ${zeleny('✓')} ${popis.slice(0, 58).padEnd(60)} ${seda(je ? 'jiný výrobek' : 'hledaná věc')}`);
  } else {
    padly.push({ p: { dotaz: popis, proc: p.proc }, chyby: [je ? 'označeno jako jiný výrobek, ale je to hledaná věc' : 'jiný výrobek NEPOZNÁN'] });
    console.log(`  ${cerveny('✗')} ${popis.slice(0, 58).padEnd(60)} ${cerveny(je ? 'planě: jiný výrobek' : 'nepoznáno')}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   SERVEROVÝ SLOVNÍK
   ══════════════════════════════════════════════════════════════════════════
   Kategorie a filtr nepotravin rozhodují o tom, co se vůbec dostane do
   databáze — a tím i o tom, co se smí objevit mezi druhy. Patří to sem,
   i když to bydlí ve `functions/`. */


console.log(`\nServerový slovník — ${SLOVNIK.length} případů\n`);

for (const p of SLOVNIK) {
  const chyby = [];
  if (p.nepotravina !== undefined) {
    const je = isNonFood(p.nazev);
    if (je !== p.nepotravina) {
      chyby.push(
        p.nepotravina
          ? 'projde jako potravina, ale nemá'
          : 'vyhozeno jako nepotravina, ale je to legitimní položka'
      );
    }
  }
  if (p.kategorie !== undefined) {
    const k = detectCategory(p.nazev);
    if (k !== p.kategorie) chyby.push(`kategorie je „${k}", má být „${p.kategorie}"`);
  }

  if (chyby.length === 0) {
    prosly++;
    console.log(`  ${zeleny('✓')} ${p.nazev.slice(0, 40).padEnd(42)} ${seda(p.nepotravina ? 'nepotravina' : p.kategorie || 'potravina')}`);
  } else {
    padly.push({ p: { dotaz: p.nazev, proc: p.proc }, chyby });
    console.log(`  ${cerveny('✗')} ${p.nazev.slice(0, 40).padEnd(42)} ${cerveny(chyby[0])}`);
  }
}

const celkem = PRIPADY.length + DRUHY.length + JINE.length + SLOVNIK.length;
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
