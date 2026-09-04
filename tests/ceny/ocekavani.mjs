// tests/ceny/ocekavani.mjs
//
// Co má vyhledávání cen umět. Každý řádek je jeden dotaz tak, jak ho člověk
// napíše na nákupní seznam, a co se od výsledku čeká.
//
//   dotaz   co uživatel napsal
//   musi    na PRVNÍM místě musí být produkt, jehož název tomu odpovídá
//   nesmi   na prvním místě tohle být NESMÍ (typicky známý omyl)
//   aspon   nejmíň tolik nabídek (0 = smí být i prázdno)
//   proc    proč tenhle případ v seznamu je — ať se nesmaže omylem
//
// Značky vad z NAVRH-ceny-letaky.md §4:
//   V1 řadí podle ceny → vyhraje levnější, ale jiný produkt
//   V2 čísla v položce rozbíjejí hledání
//   V3 hovorová čeština
//   V4 kolize ve slovníku kategorií

export const PRIPADY = [
  // --- běžné položky, tohle musí fungovat vždycky ---
  { dotaz: 'mléko', musi: /ml[ée]ko/i },
  { dotaz: 'máslo', musi: /m[áa]sl/i },
  { dotaz: 'chleba', musi: /chl[ée]b/i },
  { dotaz: 'rohlíky', musi: /rohl[íi]k/i },
  { dotaz: 'jogurt', musi: /jogurt/i },
  { dotaz: 'cukr', musi: /cukr/i },
  { dotaz: 'rýže', musi: /r[ýy][žz]e/i },
  { dotaz: 'těstoviny', musi: /t[ěe]stovin/i },
  { dotaz: 'olej', musi: /olej/i },
  { dotaz: 'kečup', musi: /ke[čc]up/i },
  { dotaz: 'šunka', musi: /[šs]unk/i },
  { dotaz: 'sýr eidam', musi: /eidam/i },
  { dotaz: 'okurka', musi: /okurk/i },
  { dotaz: 'jablka', musi: /jablk/i },
  { dotaz: 'brambory', musi: /brambor/i },
  { dotaz: 'cibule', musi: /cibul/i },
  { dotaz: 'toaletní papír', musi: /toaletn[íi] pap[íi]r/i },

  // --- V1: nesmí vyhrát levnější, ale jiný produkt ---
  {
    dotaz: 'vejce',
    musi: /vejce/i,
    nesmi: /pol[ée]vk/i,
    proc: 'V1 — vyhrávala „Instantní polévka Přidej vejce Maggi" za 12,90',
  },
  {
    dotaz: 'banány',
    musi: /ban[áa]n/i,
    nesmi: /ty[čc]ink|[čc]okol[áa]d|su[šs]en/i,
    proc: 'V1 — vyhrávala „Tyčinka Banány v čokoládě Orion"',
  },
  {
    dotaz: 'rajčata',
    musi: /raj[čc]/i,
    nesmi: /su[šs]en|sekan|protlak|ke[čc]up/i,
    proc: 'V1 — vyhrávala sušená a sekaná rajčata před čerstvými',
  },
  {
    dotaz: 'smetana ke šlehání',
    musi: /smetana ke [šs]leh[áa]n[íi]/i,
    proc: 'V1 — vyhrávala zakysaná smetana a tavený sýr Smetanito',
  },
  {
    dotaz: 'pribináček',
    musi: /pribin[áa][čc]ek/i,
    nesmi: /ty[čc]ink/i,
    proc: 'V1 — vyhrávala čokoládová tyčinka Pribináček',
  },

  // --- V2: množství v položce nesmí rozbít hledání ---
  {
    dotaz: '2x mléko',
    musi: /ml[ée]ko/i,
    nesmi: /n[áa]poj|ochucen|ty[čc]ink/i,
    proc: 'V2 — „2x" srazilo pravé mléko a vyhrál ochucený mléčný nápoj',
  },
  {
    dotaz: '3 rohlíky',
    musi: /rohl[íi]k/i,
    proc: 'V2 — totéž s počtem kusů',
  },
  {
    dotaz: 'vejce 10 ks',
    musi: /vejce/i,
    nesmi: /pol[ée]vk/i,
    proc: 'V2 + V1 zároveň',
  },

  // --- V3: hovorová čeština ---
  { dotaz: 'kafe', musi: /k[áa]v/i, proc: 'V3 — vracelo 0 nálezů' },
  { dotaz: 'toaleťák', musi: /toaletn[íi] pap[íi]r/i, proc: 'V3 — vracelo 0 nálezů' },

  // --- V4: kolize ve slovníku kategorií ---
  {
    dotaz: 'mletá hovězí',
    musi: /mlet|hov[ěe]z|burger/i,
    nesmi: /paprik|k[áa]v|gul[áa][šs]|konzerv/i,
    proc: 'V4 — „mleta" je v kategorii maso, takže vyhrála mletá paprika a mletá káva',
  },

  // --- V5: značka není synonymum jiné značky ---
  {
    dotaz: 'Radegast 10',
    musi: /radegast/i,
    nesmi: /gambrinus|kozel|staropramen|krušovice|braník|zubr|zlatopramen|urquell/i,
    proc: 'V5 — nejžádanější položka; vracela Gambrinus 10°, protože byl o korunu levnější',
  },
  {
    dotaz: 'gambrinus',
    musi: /gambrinus/i,
    nesmi: /braník|radegast|kozel|staropramen/i,
    proc: 'V5 — vracela Braník za 9,90, protože značky byly ve slovníku navzájem záměnné',
  },
  {
    dotaz: 'kofola',
    musi: /kofola/i,
    nesmi: /pepsi|coca[- ]?cola/i,
    proc: 'V5 — totéž u kolových nápojů',
  },

  // --- V6: obecný dotaz musí najít i konkrétní druhy ---
  {
    dotaz: 'pečivo',
    musi: /rohl[íi]k|housk|baget|chl[ée]b/i,
    nesmi: /ty[čc]ink/i,
    proc: 'V6 — vracelo „Pečivo tyčinka sýrová“, protože mělo slovo přímo v názvu; rohlíky filtr odstupu zahodil',
  },

  /* --- V7: zkrácené tvary, které kmenování nespojí ---
     Všechny tři našlo strojové projetí 131 běžných položek proti vzorku:
     hledání vracelo NULA nálezů, ačkoliv nabídka ve vzorku byla. */
  {
    dotaz: 'minerálka',
    musi: /miner[áa]ln/i,
    proc: 'V7 — 0 nálezů, přitom ve vzorku je 13 minerálních vod',
  },
  {
    dotaz: 'tatarka',
    musi: /tatarsk[áa] om[áa][čc]ka/i,
    nesmi: /biftek/i,
    proc: 'V7 — 0 nálezů; navíc nesmí vyhrát tatarský biftek',
  },
  {
    dotaz: 'kapesníky',
    musi: /kapesn[íčičc]/i,
    proc: 'V7 — 0 nálezů kvůli zdrobnělině „kapesníčky" v letáku',
  },

  // --- vyrobek Z neceho neni totez co ta surovina ---
  {
    dotaz: 'brambůrky',
    musi: /brambůrk|chips/i,
    nesmi: /brambory konzumn/i,
    proc: 'vracelo syrove „Brambory konzumní rané“ za 9,90; brambůrky ve vzorku jsou, ale nepropadly se do vysledku (nalezeno 4. 9. 2026 v Family-Dashboard)',
  },

  /* --- V8: čisticí chemie se vydává za potravinu ---
     Tatáž past jako u opalovacího mléka, jen na jiných slovech:
     `detectCategory` bere PRVNÍ shodu a `trvanlive` (kde je 'ocet' a 'sul')
     se testuje dřív než `drogerie` (kde je 'cistic'). */
  {
    dotaz: 'ocet',
    aspon: 0,
    nesmi: /čistič|cistic/i,
    proc: 'V8 — jediný výsledek byl „Čistič bílý ocet Tierra Verde" za 99,90',
  },
  {
    dotaz: 'sůl',
    musi: /sůl kamenná|mořská/i,
    nesmi: /myčk/i,
    proc: 'V8 — druhý výsledek byla „Sůl do myčky Somat" za 59,90',
  },

  // --- co se podle Jarkova rozhodnutí nesbírá vůbec ---
  {
    dotaz: 'granule pro psy',
    aspon: 0,
    nesmi: /./,
    proc: 'krmivo se od 25. 8. 2026 nesbírá — nesmí být na co narazit',
  },
  {
    dotaz: 'prášek na praní',
    aspon: 0,
    nesmi: /./,
    proc: 'prací prostředky jsou drogerie mimo povolený seznam (toaleťák, kapesníky, ubrousky, plenky)',
  },
];

// ══════════════════════════════════════════════════════════════════════════
// SERVEROVÝ SLOVNÍK — co se vůbec nesmí dostat do databáze
// ══════════════════════════════════════════════════════════════════════════
// `functions/src/normalizacePotravin.ts`. Kategorie a filtr nepotravin
// rozhodují o tom, co se v nákupním seznamu vůbec může objevit, takže patří
// pod stejnou zkoušku jako hledání.

export const SLOVNIK = [
  {
    nazev: 'Mléko na opalování OF 20 Astrid Sun',
    nepotravina: true,
    proc: 'kosmetika. `detectCategory` bere PRVNÍ shodu, takže kvůli slovu „mléko“ spadla do kategorie mlecne a nabízela se mezi mléčnými výrobky (nalezeno 4. 9. 2026 v Family-Dashboard)',
  },
  {
    nazev: 'Holicí pěna Nivea',
    nepotravina: false,
    proc: 'past z 25. 8.: „holici“ je zároveň klíčové slovo kategorie drogerie, takže by vyhazovalo legitimní položku',
  },
  {
    nazev: 'Čistič bílý ocet Tierra Verde',
    nepotravina: true,
    proc: 'V8 — kvůli slovu „ocet" spadl do kategorie trvanlive a byl JEDINÝ výsledek dotazu „ocet"',
  },
  {
    nazev: 'Sůl do myčky Somat',
    nepotravina: true,
    proc: 'V8 — kvůli slovu „sůl" spadla do kategorie trvanlive',
  },
  {
    nazev: 'Ocet kvasný lihový',
    nepotravina: false,
    proc: 'protiváha k čističi: samotný ocet je potravina a vyhazovat se NESMÍ',
  },
  {
    nazev: 'Sůl kamenná s jodem Gustito',
    nepotravina: false,
    proc: 'protiváha k soli do myčky: kuchyňská sůl je potravina',
  },
  {
    nazev: 'Cereálie polštářky',
    nepotravina: false,
    proc: 'past: kmen „polstar“ by chytil i tohle a pamlsky pro kočky',
  },
];
