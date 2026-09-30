# ioTuyApp — rodinný smart-home dashboard

Vite + React + TypeScript + Firebase (projekt `iotuyapp`). Repo je **VEŘEJNÉ** (github.com/jfnukal/IoTuyApp) — nikdy necommitovat klíče ani osobní údaje rodiny.

## Deploy (nic ručního přes Cloud Shell!)
- **Web (hosting)**: `git push` → Netlify nasadí samo (~1–2 min). Ostrá adresa pro rodinu: **https://iottuyapp.netlify.app/** (`iotuyapp.web.app` je nepoužívaná Firebase kopie).
- **Cloud Functions**: `firebase.json` NEMÁ predeploy hook, takže se musí ručně přeložit a pak nasadit s delším limitem na načtení kódu (jinak spadne na „Cannot determine backend specification. Timeout after 10000"):
  ```
  cd functions && "C:/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc -p tsconfig.json && cd ..
  FUNCTIONS_DISCOVERY_TIMEOUT=120 npx firebase-tools deploy --only functions --project iotuyapp
  ```
  Log: `npx firebase-tools functions:log --project iotuyapp`.
- **Python funkce `sync-strava-meals`** (`functions-python/`) do `firebase deploy` NEPATŘÍ — nasazuje se přes `gcloud`, viz její README.
- **Firestore rules**: jsou v repu (`firestore.rules`) → `npx firebase-tools deploy --only firestore:rules --project iotuyapp`. Neupravovat ručně v konzoli.

## Verze runtime a knihoven ve funkcích (stav 31. 8. 2026)
- Runtime **Node.js 22** (`functions/package.json` → `engines.node`). Node 20 byl zrušen k 30. 10. 2026, nešlo by už nasazovat.
- **firebase-functions 7.x**. Pozor: od verze 6 ukazuje kořen balíčku na API v2, takže staré funkce (`functions.region(...).pubsub.schedule(...)`, `.https.onCall`, `.firestore.document(...)`) musí importovat z **`firebase-functions/v1`** — jinak `functions.region is not a function`. Verze 7 navíc úplně zrušila `functions.config()` (tenhle projekt ho nepoužívá, tajemství jdou přes `secrets:` / Secret Manager).
- **firebase-admin ZÁMĚRNĚ zůstává na 13.x.** Verze 14 zrušila celý starý namespace, takže `admin.firestore()`, `admin.messaging()` ani `admin.firestore.FieldValue` by nefungovaly a všechny soubory by se musely přepsat na modulární importy (`getFirestore()`, `getMessaging()`, `FieldValue` z `firebase-admin/firestore`). Až na to dojde, je to mechanická, ale plošná změna — dělat ji samostatně a ověřit push notifikace.

## Letákové ceny (nákupní seznam)
Scraper kupi.cz na Apify **nepíše do Firestore přímo** (do 8/2026 to dělal generálním klíčem Firebase administrátora — ten je pryč). Posílá surová data POSTem funkci `prijmiLetaky` (`functions/src/letaky.ts`), která se prokazuje tajemstvím `SCRAPER_SECRET`, položky znormalizuje (`functions/src/normalizacePotravin.ts`) a uloží do `priceDeals` + razítko do `priceIndex/aktualni`.
- Scraper posílá do DVOU projektů: `family-dashboard-405db` (placený produkt, povinný cíl) a `iotuyapp` (tady, nepovinný cíl přes `IOTUYAPP_URL`/`IOTUYAPP_SECRET`). Každý má **vlastní, jiné** tajemství. Zdroják scraperu žije v repu Family-Dashboard (`scraper/src/main.js`) a do Apify se nahrává **ručně** — actor není napojený na git.
- `functions/src/letaky.ts` je kopie z Family-Dashboard. Vylepšení se mezi projekty nepřenášejí samy.
- Úklid starých nabídek dělá Firestore TTL nad polem `expiresAt` (Google Cloud konzole → Firestore → Time-to-live). **Zapnutý a funguje** (ověřeno čtením 30. 9. 2026: `npx firebase-tools firestore:indexes --project iotuyapp` → `priceDeals.expiresAt "ttl": true`, žádná nabídka s `expiresAt` starším než 24 h). ALE **1 958 nabídek ze starého přímého zápisu scraperu** (25.–29. 8., ID ve tvaru `Obchod--nazev`, konce 30. 8.–6. 9.) pole `expiresAt` nemá → úklid je nesmaže NIKDY. Hledání je vyřazuje jako prošlé, v databázi ale leží a stahují se s každou dávkou (~35 % kolekce). Smazat je jde jen zápisem do ostré databáze → jen s Jarkovým svolením.

### PROŠLÁ AKCE SE NEUKAZUJE (30. 9. 2026, z FD 0201f24)
- `jeProslaAkce` v `priceMatching.ts`: `hledejVNabidkach` i `nabidniDruhy` (4. parametr `dnes`) vyřadí nabídky s `validUntil` před dneškem UŽ PŘED hledáním, ne až z výsledků (prošlá opravdová vejce by jinak schovávala dnešní aspik a výběr druhu by se řídil neplatným letákem). Nabídka bez `validUntil` zůstává, poslední den letáku ještě platí. `dnes` = MÍSTNÍ den `dnesniDatum()` (`src/hooks/useDnes.ts`; v komentářích převzatých z FD se jmenuje `klicDne`), nikdy `toISOString`.
- Paměť hledání v `pricesAPI.ts` platí jen ten den (`hlidejDen` + den v `klicHledani`). `PriceBadge` a `ShoppingRecommendation` mají `useDnes()` v závislostech efektu → hledají znovu do minuty po půlnoci a hned po rozsvícení displeje. **Každé nové místo, které hledá nebo ukazuje letákové ceny, musí brát `dnes` stejně.**
- Proč: FD 30. 9. ukázal „V Billa ušetříš 13 Kč oproti Kaufland, platí do 29. 9." — server drží nabídky 3 dny po konci letáku (`DNI_PO_VYPRSENI`), úterní dávka nový leták Billy nepřinesla a hledání hlídalo jen `isFuture`. Tady hledání do té doby bralo jako platné i ty staré nabídky bez `expiresAt` (výš, konce už 30. 8.–6. 9.).

### Hledání cen je srovnané s Family-Dashboard k commitu **0201f24** (30. 9. 2026)
- **1:1 s FD** (při dalším srovnání jen přenést, co v FD přibylo po 0201f24): `src/api/productDictionary.ts`, `tests/ceny/spustit.mjs` + `vzorek.json`. `functions/src/normalizacePotravin.ts` se liší jen hlavičkou, `letaky.ts` jen komentáři (v FD beze změny od 31. 8.).
- **Skoro 1:1** — chybí jen háčky ve volbách druhů z FD 5bf00ac (Jarek zatím nerozhodl): `src/api/priceMatching.ts` (bez `puvodniSlovo`, druhy se ukazují „Instantni", „Mleta") a `tests/ceny/ocekavani.mjs` (bez 2 případů „VOLBY S HÁČKY", káva k 26. 8. bere `/^Mlet[áa]$/`…, poznámka, že zkouška doporučení tu není).
  `git -C C:/Users/jfnuk/Desktop/Family-Dashboard log --oneline 0201f24.. -- src/api/priceMatching.ts src/api/productDictionary.ts src/api/pricesAPI.ts src/api/shoppingAnalyzer.ts src/components/Widgets/ShoppingList tests/ceny functions/src/normalizacePotravin.ts functions/src/letaky.ts`
- **V FD po 5482c34 navíc, sem NEPŘENESENO** (čeká na Jarka): 5bf00ac háčky ve volbách druhů (zbytek 5bf00ac je převzatý odsud); 2d0747e úspora v tipu doporučení proti obchodu, který věta jmenuje, a jen za zboží, které mají v akci oba (tady se pořád počítá proti nejdražšímu); c8874d0 „Obchody kolem nás" (vypínání řetězců); e39663a čitelnost okna ve vzhledech FD (tady barvy natvrdo — netýká se).
- **Upraveno pro jednu rodinu** (bez tarifů/vypínače cen, šablon, telemetrie, `households/{hid}` a ukázky `?simulace=ceny`): `pricesAPI.ts`, `shoppingAnalyzer.ts`, `PriceBadge.tsx`, `PriceDetailModal.tsx`, `DruhChooserModal.tsx`, `ShoppingRecommendation.tsx`, `ShoppingListModal.css`. Hlášky přes `alert()` (tady není `useDialog`), barvy natvrdo místo `--s-modal-*`.
- **Záměrně jinak než FD:** ruční hledání lupou se NEUČÍ alias (učí jen výběr druhu a výběr jiného nálezu po „✕ Špatný"); `DruhChooserModal` má `rezim="jine"` s poctivým tlačítkem „napíšu sám" a stačí mu 1 volba (v FD se po „Špatný" s jedinou další nabídkou neukáže nic — týká se 15 ze 71 běžných položek); `findCanonical`/`deleteAliasBySearch` berou i celou víceslovnou položku; „✕ Špatný" nemaže stažené ceny (`zapomenHledani`, v FD to stojí nové stažení celé kolekce); tip doporučení bez dvojité tečky. `aliasesAPI.ts` je bez `ensureResetOnce` (stejně jako FD — mazal aliasy v každém novém prohlížeči).
- Zkouška `npm run test:ceny`: **118/118** (stará logika před 29. 9. na téže sadě 41/50 — „vejce" vracelo Vejce v aspiku). Prošlá akce: 6 případů k 26. 8. + u KAŽDÉHO případu kontrola, že žádný výsledek není prošlý; kalibrace `CENY_SOUBOR=<stará verze>`: kód před 30. 9. propadne 5×, vyřazení až z výsledků 3×, bez vyřazení ve výběru druhu 2×, „poslední den už neplatí" 7×. Půlnoc ověřena dočasnou stránkou (skutečná cenovka + doporučení nad falešnou databází, hodiny 29. 9. 23:59 → 0:00:26: nový kód přepne na Kaufland, paměť bez dne i starý kód dál „Billa … platí do 29. 9."). Zkoušky `test:ceny-doporuceni` a `test:ceny-obrazovka` z FD tu NEJSOU — zakládat jen s Jarkovým souhlasem.
- Nový serverový slovník platí až pro DALŠÍ dávku ze scraperu. Mezidobí (nový web, v databázi staré kategorie) je změřené: všech 50 hledání projde.

## Kontrola typů
`tsc --noEmit -p tsconfig.app.json` (spouštět přes `& "C:\Program Files\nodejs\node.exe" node_modules\typescript\bin\tsc` — npx tsc tu zlobí).

## Pozor
- Commit messages v PowerShellu psát JEDNOŘÁDKOVÉ `-m` (heredoc se láme na diakritice).
- Slovníky kategorií/stop-slov nákupního seznamu existují 2× — v klientovi (`src/api/productDictionary.ts`) a ve funkci (`functions/src/normalizacePotravin.ts`). Klient určuje kategorii HLEDANÉHO výrazu, funkce kategorii NABÍDKY, a `priceMatching.ts` je porovnává (shoda +4 body, neshoda −4) → když se rozejdou, appka zahazuje správné nabídky. Při změně upravit obě strany. Scraper (FD `scraper/src/main.js`) pořád nese vlastní STARŠÍ kopii, ale jen jako předfiltr nepotravin před odesláním — kategorie počítá server; změřeno 29. 9. 2026 na 2 935 názvech, že nezahodí nic, co by server pustil. `Desktop/apify/source-code` je zastaralá kopie z 25. 8. (ještě zápis přímo do Firestore), z ní se nenasazuje.
- Widgety V2 jsou self-contained: vlastní data/subscriptions, žádné props od rodiče.
- Env klíče (Tuya, Gemini) jen v `.env` (gitignore) a Netlify UI.
- Netlify funkce (`netlify/functions/`) pouští jen přihlášenou rodinu: klient posílá Firebase ID token (`tuyaService.callFunction`), funkce ho ověří v `netlify/lib/familyAuth.cjs` (podpis klíči Google + zkušební čtení `appSettings/main` → rozhodnou Firestore pravidla `isFamily()`, žádné env proměnné). Nová funkce = `exports.handler = protect(handler, { methods })`. Pravidlo pro `appSettings` musí zůstat jen pro rodinu.
- Plná synchronizace (tlačítko Synchronizovat → `deviceService.saveUserDevices`) maže zařízení chybějící v Tuya jen podle úplného seznamu (`method: 'automatic'`) a nejvýš max(3, 10 %) naráz — jinak je nechá a stránka Zařízení ukáže hlášení. `get-device-list` při výpadku vrací 502, žádný „nouzový" seznam (ten dřív hrozil smazáním skoro všech zařízení i s místnostmi a nastavením karet).

## Známé otevřené problémy (neřešit znovu od nuly — viz paměť)
- Duplicitní push notifikace (řešeno opakovaně, zatím nedořešeno).
- Venkovní teplota z Tuya senzoru visela na starých datech i 24 h+ (auto-sync čekal 15 min nepřerušeného běhu stránky, tablet mezitím zhasne). Oprava dd86bb5 (9/2026) čeká na nasazení a pár dní ověření — synchronizace teď jede podle stáří dat, jen při zapnutém displeji a jen pro to, co je vidět (`src/tuya/services/tuyaAutoSync.ts`, `useTuya({ autoSync })`).
- Widget dopravy jede na mock datech (`VITE_USE_MOCK_TRANSPORT=true`); plán = GTFS data + Cloud Function, IDOS API není.
