// tests/ceny/ocekavani.mjs
//
// Co má vyhledávání cen umět. Každý řádek je jeden dotaz tak, jak ho člověk
// napíše na nákupní seznam, a co se od výsledku čeká.
//
//   dotaz   co uživatel napsal
//   musi    na PRVNÍM místě musí být produkt, jehož název tomu odpovídá
//   nesmi   na prvním místě tohle být NESMÍ (typicky známý omyl)
//   aspon   nejmíň tolik nabídek (0 = smí být i prázdno)
//   nesmiNikde  tohle nesmí být NIKDE mezi výsledky (ani jako „další obchod")
//   jiny    true = první výsledek musí nést příznak „jiný výrobek" (cena patří
//           něčemu jinému a obrazovka to musí říct), false = nesmí ho nést
//   bez     tyhle nabídky z letáku odeber (co když tam JEN jiný výrobek je)
//   dnes    hledej k tomuto dni místo dne vzorku 25. 8. (prošlé akce, 30. 9. 2026)
//   proc    proč tenhle případ v seznamu je — ať se nesmaže omylem
//
// U KAŽDÉHO případu navíc platí: žádný výsledek nesmí být k danému dni
// PROŠLÝ (`validUntil` před dneškem) — ani jako „další obchod" v detailu.
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
    musi: /vejce z podest/i,
    nesmi: /pol[ée]vk|aspik/i,
    nesmiNikde: /pol[ée]vk|aspik/i,
    jiny: false,
    proc: 'V1 — vyhrávala „Instantní polévka Přidej vejce Maggi" za 12,90; 14-6 (29. 9. 2026) — pak „Vejce v aspiku" (Penny 22,90) před vejci za 34,90, a v Penny aspik schoval i vejce za 79,90. Do té doby tu stačilo slovo „vejce", takže aspik zkouškou prošel',
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
    musi: /vejce z podest/i,
    nesmi: /pol[ée]vk|aspik/i,
    jiny: false,
    proc: 'V2 + V1 zároveň (+ 14-6 aspik)',
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

  // --- V5: znacka NENI synonymum jine znacky ---
  {
    dotaz: 'Radegast 10',
    musi: /radegast/i,
    nesmi: /gambrinus|kozel|staropramen|kru[šs]ovice|bran[íi]k|zubr|zlatopramen|urquell/i,
    proc: 'V5 — vracelo Gambrinus 10, protoze byl o korunu levnejsi',
  },
  {
    dotaz: 'gambrinus',
    musi: /gambrinus/i,
    nesmi: /radegast|kozel|staropramen|kru[šs]ovice|bran[íi]k|zubr|zlatopramen|urquell/i,
    proc: 'V5 — vracelo Pivo svetle vycepni 10 Branik',
  },
  {
    dotaz: 'kofola',
    musi: /kofola/i,
    nesmi: /pepsi|coca|cola/i,
    proc: 'V5 — kolove napoje byly v SYNONYMS obousmerne, takze si byly zamenne',
  },

  // --- V6: obecny dotaz musi najit i konkretni druhy ---
  {
    dotaz: 'pečivo',
    musi: /rohl[íi]k|housk|baget|chl[ée]b/i,
    nesmi: /tyčink|ty[čc]ink/i,
    proc: 'V6 — vracelo „Pečivo tyčinka sýrová“, protoze mela slovo primo v nazvu; rohliky filtr odstupu zahodil',
  },

  // --- V7: zkracene tvary, ktere kmenovani nespoji ---
  {
    dotaz: 'minerálka',
    musi: /miner[áa]ln/i,
    proc: 'V7 — nula nalezu, prestoze ve vzorku je 13 mineralnich vod',
  },
  {
    dotaz: 'tatarka',
    musi: /tatarsk|tatark/i,
    nesmi: /biftek/i,
    proc: 'V7 — nula nalezu, prestoze ve vzorku jsou 4 tatarske omacky',
  },
  {
    dotaz: 'kapesníky',
    musi: /kapesn/i,
    proc: 'V7 — letak pise „kapesnicky“, clovek „kapesniky“; kmenovani to nespoji',
  },

  // --- V8: klic ve slovniku musi byt bez diakritiky ---
  {
    dotaz: 'bůček',
    musi: /vep[řr]ov/i,
    proc: 'V8 — klic ve slovniku byl psan „vepřove“ s hackem, takze se po normalizeText nikdy netrefil a „bucek“ vracel nulu',
  },

  // --- V9: vyrobek Z neceho neni totéž co ta surovina ---
  {
    dotaz: 'brambůrky',
    musi: /brambůrk|chips/i,
    nesmi: /brambory konzumn/i,
    proc: 'V9 — vracelo syrove „Brambory konzumní rané“ za 9,90; brambůrky ve vzorku jsou, ale nepropadly se do vysledku',
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

  // --- čisticí chemie se tváří jako potravina (6. 9. 2026) ---
  // `detectCategory` vrací PRVNÍ shodu a `trvanlive` (kde je 'ocet' a 'sul')
  // se testuje DŘÍV než `drogerie` (kde je 'cistic'). Obojí proto projde
  // `patriNaSeznam` jako potravina. Řeší se to v `isNonFood`, který běží
  // ještě PŘED zařazením do kategorie, takže tuhle past obchází.
  {
    dotaz: 'ocet',
    aspon: 0,
    nesmi: /[čc]isti[čc]/i,
    proc: 've vzorku je jediná položka se slovem „ocet“ — „Čistič bílý ocet Tierra Verde“ za 99,90. Dokud projde filtrem, je to JEDINÝ výsledek na dotaz „ocet“; správně nemá být žádný',
  },
  {
    dotaz: 'sůl',
    musi: /s[ůu]l kamenn|mo[řr]sk/i,
    nesmi: /my[čc]k/i,
    proc: 'PROTIVÁHA, ne důkaz opravy — tenhle případ procházel i PŘED ní, protože se řadí podle ceny a Gustito za 6,90 porazilo Somat za 59,90. Hlídá opačný směr: že kuchyňská sůl nezmizí, kdyby někdo přidal kmen „sul“ mezi nepotraviny. Že se „Sůl do myčky“ nedostane do databáze, dokazuje až případ v SLOVNIK.',
  },

  // --- 14-6: JINÝ VÝROBEK Z TÉŽE SUROVINY (29. 9. 2026) ---
  // Hlava názvu sedí, a přesto se kupuje něco jiného. Když je v letáku
  // opravdová věc, jiný výrobek se nenabízí vůbec (ani jako další obchod);
  // když je tam JEN jiný, ukáže se s příznakem a obrazovka to řekne.
  {
    dotaz: 'vejce',
    bez: /podest[ýy]lk/i,
    musi: /aspik/i,
    jiny: true,
    proc: '14-6 — v letáku JEN vejce v aspiku: cena se ukáže, ale nesmí se vydávat za cenu vajec (a nesmí ji převzít čokoládové vajíčko Kinder s 1 bodem — proto se jiný výrobek odděluje AŽ mezi srovnatelnými)',
  },
  {
    dotaz: 'ryba',
    musi: /ryb[íi] fil/i,
    nesmi: /sal[áa]t/i,
    jiny: false,
    proc: '14-6 — „Rybí salát s majonézou" za 18,90 schovával opravdové rybí filé',
  },
  {
    dotaz: 'česnek',
    musi: /[čc]esnek/i,
    jiny: true,
    proc: '14-6 — ve vzorku je jen Česneková pomazánka a Chléb česnekový; cenu česneku nemáme a obrazovka to musí říct',
  },
  {
    dotaz: 'švestky',
    musi: /p[áa]lenk/i,
    jiny: true,
    proc: '14-6 — jediná „švestka" ve vzorku je Pálenka Švestka Moravská za 129,90',
  },
  {
    dotaz: 'hořčice',
    jiny: true,
    proc: '14-6 — jediná hořčice ve vzorku je uvnitř Tapas dipu',
  },
  {
    dotaz: 'rozinky',
    musi: /rozink/i,
    nesmiNikde: /[čc]okol[áa]d/i,
    jiny: false,
    proc: '14-6 — „Rozinky v čokoládě" (Penny 19,90) se nabízely jako další obchod s rozinkami',
  },
  {
    dotaz: 'hovězí',
    nesmi: /burger/i,
    jiny: false,
    proc: '14-6 — vyhrával „Hovězí burger Penny To Go"',
  },
  {
    dotaz: 'sýr',
    musi: /s[ýy]r/i,
    nesmiNikde: /pomaz[áa]nk|\bdip\b/i,
    jiny: false,
    proc: '14-6 — sýrové pomazánky a dipy nejsou sýr',
  },
  {
    dotaz: 'pomazánka',
    musi: /pomaz[áa]nk/i,
    jiny: false,
    proc: '14-6 PROTIVÁHA — kdo pomazánku napíše, chce pomazánku; slovo ze seznamu jiných výrobků v dotazu neplatí',
  },

  // --- PROŠLÁ AKCE SE NEUKAZUJE (30. 9. 2026) ---
  // 26. 8. = den po konci letáků 19.–25. 8. (556 nabídek vzorku). Server je
  // v databázi drží ještě 3 dny a hledání je dřív bralo jako dnešní — Jarek
  // 30. 9. dostal „Doporučení: Billa … platí do 29. 9.". Doporučení samo
  // hlídá v Family-Dashboard `test:ceny-doporuceni` (část „prošlá akce") —
  // tady taková zkouška není.
  {
    dotaz: 'vejce',
    dnes: '2026-08-26',
    musi: /vejce z podest.* L Albert/i,
    nesmiNikde: /pol[ée]vk|aspik/i,
    jiny: false,
    proc: 'Albert: vejce M za 34,90 v letáku do 25. 8., vejce L za 39,90 od 26. 8. — stará verze 26. 8. ukázala levnější PROŠLOU cenu (i Penny 79,90 a Billa 84,90 z prošlých letáků)',
  },
  {
    dotaz: 'máslo',
    dnes: '2026-08-26',
    musi: /^m[áa]slo/i,
    nesmiNikde: /madeta/i,
    proc: 'máslo Madeta (Billa 32,90, Penny 34,90) bylo jen v letácích do 25. 8. — 26. 8. se nesmí nabízet ani jako „další obchod"',
  },
  {
    dotaz: 'vincentka',
    dnes: '2026-08-26',
    aspon: 0,
    nesmiNikde: /vincentka/i,
    proc: 'Vincentka byla jen v letáku Penny do 25. 8. — po konci akce se nesmí ukázat včerejší cena (cenovka má říct „nenalezeno")',
  },
];

// ══════════════════════════════════════════════════════════════════════════
// NABÍDKA DRUHŮ — „cos vlastně myslel?"
// ══════════════════════════════════════════════════════════════════════════
// Kdo si napíše „káva", nemyslí „jakoukoli kávu, hlavně lacinou". Tyhle
// případy hlídají OBĚ strany: že se appka zeptá tam, kde má, a hlavně že
// MLČÍ všude jinde. První pokus se ptal u 59 z 79 běžných položek, což je
// horší než neptat se vůbec.
//
//   dotaz   co uživatel napsal
//   aspon   nejmíň tolik voleb
//   musi    pole vzorů; každý musí sedět na některou z voleb
//   nesmi   tenhle vzor nesmí sedět na žádnou volbu
//   zadne   true = nesmí se ptát vůbec
//   dnes    vybírej k tomuto dni místo dne vzorku 25. 8. (prošlé akce)
//   proc    proč tenhle případ v seznamu je

export const DRUHY = [
  // --- PTÁ SE: obecné slovo, pod kterým je vážně víc druhů ---
  {
    dotaz: 'káva',
    aspon: 3,
    musi: [/mlet/i, /instantn/i, /zrnkov/i],
    proc: 've vzorku je 55 různých káv od ledové za 14,90 po zrnkovou za 449',
  },
  {
    dotaz: 'sýr',
    aspon: 4,
    musi: [/eidam/i, /taven/i],
    proc: '99 výrobků — bez výběru z nich značka mlčky brala nejlevnější',
  },
  {
    dotaz: 'mléko',
    aspon: 3,
    musi: [/trvanliv/i, /cerstv|čerstv/i],
    nesmi: /opalov/i,
    proc: '„Mléko na opalování" má v názvu „mléko“ a padalo do kategorie mlecne',
  },
  // --- PTÁ SE, ale volby jsou ZNAČKY, ne druhy ---
  {
    dotaz: 'minerálka',
    aspon: 5,
    musi: [/vincentka/i, /magnesia/i],
    proc: 'šest značek sdílí slovo „voda“ — kdyby se bral jen nejlevnější z každé skupiny, zmizely by',
  },
  {
    dotaz: 'mouka',
    aspon: 3,
    musi: [/ramill/i],
    proc: 'značky: Ramill, Albert, Karlova Koruna, Zátkova',
  },

  // --- MLČÍ: člověk si už vybral sám ---
  {
    dotaz: 'mletá káva',
    zadne: true,
    proc: '„pokud není přímo zadavatelem specifikováno“ — dvouslovná položka je volba',
  },
  { dotaz: 'sýr eidam', zadne: true, proc: 'totéž' },

  {
    dotaz: 'káva',
    aliasy: ['mletá káva'],
    zadne: true,
    proc: 'už se jednou zeptalo a on odpověděl — výběr se uloží jako alias, ale položka na seznamu zůstane jednoslovná, takže bez téhle brzdy by se ptalo po každém načtení znovu',
  },

  // --- MLČÍ: vypadá to jako výběr, ale není ---
  {
    dotaz: 'brambory',
    zadne: true,
    proc: 'troje „Brambory konzumní rané“ od tří obchodů = jedna volba, a tedy žádná',
  },
  {
    dotaz: 'slanina',
    zadne: true,
    proc: '„Slanina pikantní Deli“ a „…delikátní“ je jedna slanina s jinak useknutým názvem',
  },
  {
    dotaz: 'sůl',
    zadne: true,
    nesmi: /my[čc]k/i,
    proc: 'první pokus nabízel Sůl do myčky — proto se druhy berou jen ze stejné kategorie',
  },

  // --- PROŠLÁ AKCE (30. 9. 2026): co je jen v prošlém letáku, není volba ---
  {
    dotaz: 'mouka',
    dnes: '2026-08-26',
    aspon: 0,
    nesmi: /ramill|karlova/i,
    proc: 'Mouka Ramill (Albert) a Karlova Koruna (Penny) byly jen v letácích do 25. 8. — 26. 8. se koupit nedají (zbudou dvě mouky, a to výběr není)',
  },
  {
    dotaz: 'minerálka',
    dnes: '2026-08-26',
    aspon: 0,
    nesmi: /vincentka/i,
    proc: 'Vincentka byla jen v letáku Penny do 25. 8.',
  },
  {
    dotaz: 'káva',
    dnes: '2026-08-26',
    aspon: 3,
    /* V Family-Dashboard přesně /^Mletá$/ atd. — tam mají volby háčky
       (`puvodniSlovo`, FD 5bf00ac), tady zatím ne („Mleta"). Proto obojí. */
    musi: [/^Mlet[áa]$/, /^Instantn[íi]$/, /^Zrnkov[áa]$/],
    proc: 'PROTIVÁHA — druhy, které v platných letácích jsou, se po vyřazení prošlých nabízet musí dál',
  },
];

// ══════════════════════════════════════════════════════════════════════════
// SERVEROVÝ SLOVNÍK — co se vůbec nesmí dostat do databáze
// ══════════════════════════════════════════════════════════════════════════
// `functions/src/normalizacePotravin.ts`. Kategorie rozhoduje o tom, co se
// smí objevit mezi druhy, takže patří pod stejnou zkoušku jako hledání.

export const SLOVNIK = [
  {
    nazev: 'Mléko na opalování OF 20 Astrid Sun',
    nepotravina: true,
    proc: 'kosmetika. `detectCategory` bere PRVNÍ shodu, takže kvůli slovu „mléko“ spadla do kategorie mlecne a nabízela se mezi druhy mléka',
  },
  {
    nazev: 'Mletá káva Standard Jihlavanka',
    kategorie: 'kava_caj',
    proc: 've starém vzorku bylo 19 mletých káv označeno jako MASO — dokud to platilo, výběr druhů kávu „mletá“ vůbec nenabídl',
  },
  {
    nazev: 'Holicí pěna Nivea',
    nepotravina: false,
    proc: 'past z 25. 8.: „holici“ je zároveň klíčové slovo kategorie drogerie, takže by vyhazovalo legitimní položku',
  },
  {
    nazev: 'Cereálie polštářky',
    nepotravina: false,
    proc: 'past: kmen „polstar“ by chytil i tohle a pamlsky pro kočky',
  },

  // --- čisticí chemie (6. 9. 2026) ---
  {
    nazev: 'Čistič bílý ocet Tierra Verde',
    nepotravina: true,
    proc: 'kategorie vyšla `trvanlive` kvůli slovu „ocet“, takže to prošlo jako potravina a bylo to JEDINÝM výsledkem na dotaz „ocet“ za 99,90',
  },
  {
    nazev: 'Sůl do myčky Somat',
    nepotravina: true,
    proc: 'táž past na slově „sůl“ — nabízelo se mezi kuchyňskými solemi',
  },
  {
    nazev: 'Mléko pleťové čisticí Cien',
    nepotravina: true,
    proc: 'kosmetika, která kvůli slovu „mléko“ spadla do kategorie mlecne — stejně jako mléko na opalování',
  },
  // PROTIVÁHY: bez nich by se opravilo jedno a rozbilo druhé.
  // 'sul' ani 'ocet' proto do NON_FOOD_KEYWORDS NESMÍ — rozlišuje až druhé slovo.
  {
    nazev: 'Ocet kvasný lihový',
    nepotravina: false,
    proc: 'protiváha: ocet sám o sobě je potravina, vyhazuje se až čistič',
  },
  {
    nazev: 'Sůl kamenná s jodem Gustito',
    nepotravina: false,
    proc: 'protiváha: kuchyňská sůl musí projít, vyhazuje se až sůl do myčky',
  },

  // --- vysoušení díry v zařazování (6. 9. 2026) ---
  // Tyhle případy hlídají POŘADÍ kategorií. `detectCategory` vrací PRVNÍ shodu,
  // takže přesun kategorie výš nebo níž je tichá změna chování.
  {
    nazev: 'Vejce z podestýlky M Albert',
    kategorie: 'vejce',
    proc: 'vejce neměla vlastní kategorii, takže 6 balení propadlo bez zařazení',
  },
  {
    nazev: 'Instantní polévka Přidej vejce Maggi',
    kategorie: 'trvanlive',
    proc: 'PROTIVÁHA k pořadí: kategorie `vejce` stojí schválně AŽ ZA `trvanlive`. Kdyby ji někdo posunul výš, ukradne tuhle polévku',
  },
  {
    nazev: 'Kojenecká voda Aquila',
    kategorie: 'napoje',
    proc: 'PROTIVÁHA: kmen „kojeneck“ je v `trvanlive` kvůli kojenecké výživě, ale `napoje` stojí dřív, takže voda zůstane nápojem',
  },
  {
    nazev: 'Kakao holandské Kávoviny',
    kategorie: 'kava_caj',
    proc: 'PROTIVÁHA: kmen „kakao“ je v `sladke`, ale `kava_caj` stojí dřív — kávovina musí zůstat kávovinou',
  },
  {
    nazev: 'Dětské džíny Lupilu',
    nepotravina: true,
    proc: 'oblečení propadalo na nákupní seznam, protože slovník nezná kategorii a `patriNaSeznam` pouští všechno bez kategorie',
  },
  {
    nazev: 'Toaletní papír 3vrstvý Tento',
    nepotravina: false,
    proc: 'PROTIVÁHA: kmen „papir“ se do nepotravin NESMÍ přidat, vyhodil by 15 balení toaleťáku, který Jarek na seznamu chce',
  },

  // --- těstoviny jako alkohol (6. 9. 2026) ---
  // `detectCategory` porovnává PODŘETĚZCEM, ne začátkem slova, takže
  // „těstoVINy“ obsahovalo kmen 'vin' (víno) a alkohol se testuje dřív
  // než `trvanlive`. Postihovalo to 20 balení těstovin a omáček na ně.
  {
    nazev: 'Těstoviny vaječné Zátkovy',
    kategorie: 'trvanlive',
    proc: 'kvůli kmeni „vin“ uvnitř slova „těstoviny“ to bylo zařazené jako ALKOHOL',
  },
  {
    nazev: 'Omáčka na těstoviny Bio Combino',
    kategorie: 'trvanlive',
    proc: 'táž past — i omáčky na těstoviny padaly do alkoholu',
  },
  {
    nazev: 'Vína Vinselekt Michlovský - pozdní sběr',
    kategorie: 'alkohol',
    proc: 'PROTIVÁHA: proto se „vin“ nesmělo prostě smazat. Množné číslo „vína“ kmen „vino“ nechytí, a tahle čtyři vína by zůstala bez kategorie. Řeší to dvojice „vino“ + „vina“',
  },
  {
    nazev: 'Víno Cabernet Sauvignon Chile Cimarosa',
    kategorie: 'alkohol',
    proc: 'PROTIVÁHA: jednotné číslo musí projít taky',
  },

  // --- silná shoda má přednost před slabou (6. 9. 2026, Jarkův návrh) ---
  // `detectCategory` bere nejdřív kmeny, které sedí na ZAČÁTEK SLOVA, a teprve
  // když nic nenajde, hledá podřetězec uvnitř slov — a to jen u kmenů od
  // 5 znaků. Krátký kmen uvnitř cizího slova ('gin' v „oriGINal') byl zdroj
  // celé třídy omylů.
  {
    nazev: 'Olivový olej extra virgin ve spreji Fabio',
    kategorie: 'trvanlive',
    proc: 'bylo zařazeno jako ALKOHOL kvůli „virGIN“; teď vyhraje „olej“, protože sedí na začátek slova',
  },
  {
    nazev: 'Víno Primitivo Primasole Cielo',
    kategorie: 'alkohol',
    proc: 'bylo zařazeno jako MASO kvůli „priMASOle“; teď vyhraje „víno“ na začátku slova',
  },
  {
    nazev: 'Savo Original',
    kategorie: null,
    proc: 'čistič zařazený jako ALKOHOL kvůli „oriGINal“. Bez kategorie je správně — na nákupní seznam nepatří',
  },
  {
    nazev: 'Minisalámky Latin American Style',
    kategorie: 'maso',
    proc: 'PROTIVÁHA: „salam“ má 5 znaků, takže se smí najít i UVNITŘ slova. Kdyby se hledal jen začátek slova, minisalámky by kategorii ztratily',
  },
  {
    nazev: 'Kapsle Nespresso Starbucks',
    kategorie: 'kava_caj',
    proc: 'PROTIVÁHA: „presso“ uvnitř „Nespresso“ musí platit dál',
  },
  {
    nazev: 'Čokopiškoty Café time',
    kategorie: 'pecivo',
    proc: 'PROTIVÁHA: „piskot“ uvnitř „Čokopiškoty“ musí platit dál',
  },
];

// ══════════════════════════════════════════════════════════════════════════
// JINÝ VÝROBEK — slovo po slovu (prověrka 14-6, 29. 9. 2026)
// ══════════════════════════════════════════════════════════════════════════
// `jeJinyVyrobek(hledane, nazev)` z priceMatching.ts. Názvy jsou skutečné
// položky ze vzorku. Druhá půlka jsou slova, která v seznamu schválně NEJSOU
// (změřeno — chytala by správné výrobky), ať je tam nikdo nepřidá od stolu.
export const JINE = [
  { hledane: ['vejce'], nazev: 'Vejce v aspiku', jiny: true },
  { hledane: ['česnek'], nazev: 'Česneková pomazánka se sýrem Gastro', jiny: true },
  { hledane: ['česnek'], nazev: 'Chléb česnekový', jiny: true },
  { hledane: ['ryba'], nazev: 'Rybí salát s majonézou Gran Mare', jiny: true },
  { hledane: ['brambory'], nazev: 'Bramborový salát Karlova Koruna', jiny: true },
  { hledane: ['knedlíky'], nazev: 'Knedlíky bramborové v prášku Srdce Domova', jiny: true },
  { hledane: ['švestky'], nazev: 'Pálenka Švestka Moravská Rudolf Jelínek', jiny: true },
  { hledane: ['hovězí'], nazev: 'Hovězí burger Penny To Go', jiny: true },
  { hledane: ['rozinky'], nazev: 'Rozinky v čokoládě Dr.Ensa', jiny: true },
  { hledane: ['müsli'], nazev: 'Müsli tyčinka Fit', jiny: true },
  { hledane: ['máslo'], nazev: 'Bageta s máslem', jiny: true },
  { hledane: ['dýně'], nazev: 'Polévka krémová z dýně a mrkviček Albert Fresh Bistro', jiny: true },
  // co člověk napsal sám (nebo si rodina naučila), je hledaná věc
  { hledane: ['vejce v aspiku'], nazev: 'Vejce v aspiku', jiny: false },
  { hledane: ['vejce', 'vejce v aspiku'], nazev: 'Vejce v aspiku', jiny: false, proc: 'naučený alias rodiny — vybrala si aspik' },
  { hledane: ['chleba'], nazev: 'Chléb žitný', jiny: false },
  { hledane: ['rozinky v čokoládě'], nazev: 'Rozinky v čokoládě Dr.Ensa', jiny: false },
  { hledane: ['pečivo'], nazev: 'Bageta s máslem', jiny: false, proc: 'bageta je pečivo (relatedTerms)' },
  // účel: „X na/do/pro Y" je pořád X
  { hledane: ['sýr'], nazev: "Sýr na burger Mike Mitchell's", jiny: false },
  { hledane: ['kuličky'], nazev: 'Kuličky do polévky Poex', jiny: false },
  { hledane: ['kuřecí hřbety'], nazev: 'Kuřecí hřbety na polévku', jiny: false },
  // schválně NE v seznamu — změřeno proti vzorku, chytala by správné výrobky
  { hledane: ['pribináček'], nazev: 'Dezert Pribináček', jiny: false, proc: '„dezert" by chytil Pribináček, Bobík i Lipánek' },
  { hledane: ['tatarka'], nazev: "Tatarská omáčka Hellmann's", jiny: false, proc: '„omáčka" by chytila tatarku' },
  { hledane: ['milka'], nazev: 'Čokoláda Milka', jiny: false, proc: '„čokoláda" by chytila Milku — proto jen fráze „v čokoládě"' },
  { hledane: ['nudle'], nazev: 'Polévkové nudle Zátkovy', jiny: false, proc: 'polévka jen jako podstatné jméno' },
  { hledane: ['okurka'], nazev: 'Okurka salátová - hadovka', jiny: false, proc: 'salát jen jako podstatné jméno' },
  { hledane: ['minerálka'], nazev: 'Minerální nápoj Dr. Witt', jiny: false, proc: '„nápoj" tu schválně není' },
];
