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
