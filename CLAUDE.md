# ioTuyApp — rodinný smart-home dashboard

Vite + React + TypeScript + Firebase (projekt `iotuyapp`). Repo je **VEŘEJNÉ** (github.com/jfnukal/IoTuyApp) — nikdy necommitovat klíče ani osobní údaje rodiny.

## Deploy (nic ručního přes Cloud Shell!)
- **Web (hosting)**: `git push` → Netlify nasadí samo (~1–2 min). Ostrá adresa pro rodinu: **https://iottuyapp.netlify.app/** (`iotuyapp.web.app` je nepoužívaná Firebase kopie).
- **Cloud Functions**: lokálně `npx firebase-tools deploy --only functions --project iotuyapp` (uživatel je přihlášený; před deployem `npx tsc` ve složce `functions/`). Log: `npx firebase-tools functions:log --project iotuyapp`.
- **Firestore rules**: jsou v repu (`firestore.rules`) → `npx firebase-tools deploy --only firestore:rules --project iotuyapp`. Neupravovat ručně v konzoli.

## Letákové ceny (nákupní seznam)
Scraper kupi.cz na Apify **nepíše do Firestore přímo** (do 8/2026 to dělal generálním klíčem Firebase administrátora — ten je pryč). Posílá surová data POSTem funkci `prijmiLetaky` (`functions/src/letaky.ts`), která se prokazuje tajemstvím `SCRAPER_SECRET`, položky znormalizuje (`functions/src/normalizacePotravin.ts`) a uloží do `priceDeals` + razítko do `priceIndex/aktualni`.
- Scraper posílá do DVOU projektů: `family-dashboard-405db` (placený produkt, povinný cíl) a `iotuyapp` (tady, nepovinný cíl přes `IOTUYAPP_URL`/`IOTUYAPP_SECRET`). Každý má **vlastní, jiné** tajemství. Zdroják scraperu žije v repu Family-Dashboard (`scraper/src/main.js`) a do Apify se nahrává **ručně** — actor není napojený na git.
- `functions/src/letaky.ts` je kopie z Family-Dashboard. Vylepšení se mezi projekty nepřenášejí samy.
- Úklid starých nabídek dělá Firestore TTL nad polem `expiresAt` (Google Cloud konzole → Firestore → Time-to-live).

## Kontrola typů
`tsc --noEmit -p tsconfig.app.json` (spouštět přes `& "C:\Program Files\nodejs\node.exe" node_modules\typescript\bin\tsc` — npx tsc tu zlobí).

## Pozor
- Commit messages v PowerShellu psát JEDNOŘÁDKOVÉ `-m` (heredoc se láme na diakritice).
- Slovníky kategorií/stop-slov nákupního seznamu existují 2× — v klientovi (`src/api/productDictionary.ts`) a ve funkci (`functions/src/normalizacePotravin.ts`). Klient určuje kategorii HLEDANÉHO výrazu, funkce kategorii NABÍDKY, a `pricesAPI.ts` je porovnává (shoda +4 body, neshoda −4) → když se rozejdou, appka zahazuje správné nabídky. Při změně upravit obě strany. (Do 8/2026 byla druhá kopie v Apify scraperu; ten už normalizaci nedělá.)
- Widgety V2 jsou self-contained: vlastní data/subscriptions, žádné props od rodiče.
- Env klíče (Tuya, Gemini) jen v `.env` (gitignore) a Netlify UI.

## Známé otevřené problémy (neřešit znovu od nuly — viz paměť)
- Duplicitní push notifikace (řešeno opakovaně, zatím nedořešeno).
- Počasí z Tuya senzoru se občas přestane aktualizovat (visí na starých datech i 24 h+).
- Widget dopravy jede na mock datech (`VITE_USE_MOCK_TRANSPORT=true`); plán = GTFS data + Cloud Function, IDOS API není.
