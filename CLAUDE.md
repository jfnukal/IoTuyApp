# ioTuyApp — rodinný smart-home dashboard

Vite + React + TypeScript + Firebase (projekt `iotuyapp`). Repo je **VEŘEJNÉ** (github.com/jfnukal/IoTuyApp) — nikdy necommitovat klíče ani osobní údaje rodiny.

## Deploy (nic ručního přes Cloud Shell!)
- **Web (hosting)**: `git push` → Netlify nasadí samo (~1–2 min). Ostrá adresa pro rodinu: **https://iottuyapp.netlify.app/** (`iotuyapp.web.app` je nepoužívaná Firebase kopie).
- **Cloud Functions**: lokálně `npx firebase-tools deploy --only functions --project iotuyapp` (uživatel je přihlášený; před deployem `npx tsc` ve složce `functions/`). Log: `npx firebase-tools functions:log --project iotuyapp`.
- **Firestore rules**: jsou v repu (`firestore.rules`) → `npx firebase-tools deploy --only firestore:rules --project iotuyapp`. Neupravovat ručně v konzoli.

## Kontrola typů
`tsc --noEmit -p tsconfig.app.json` (spouštět přes `& "C:\Program Files\nodejs\node.exe" node_modules\typescript\bin\tsc` — npx tsc tu zlobí).

## Pozor
- Commit messages v PowerShellu psát JEDNOŘÁDKOVÉ `-m` (heredoc se láme na diakritice).
- Slovníky kategorií/stop-slov nákupního seznamu existují 2× — tady v klientovi a v Apify scraperu (`Desktop/apify`). Při změně synchronizovat obě strany.
- Widgety V2 jsou self-contained: vlastní data/subscriptions, žádné props od rodiče.
- Env klíče (Tuya, Gemini) jen v `.env` (gitignore) a Netlify UI.

## Známé otevřené problémy (neřešit znovu od nuly — viz paměť)
- Duplicitní push notifikace (řešeno opakovaně, zatím nedořešeno).
- Počasí z Tuya senzoru se občas přestane aktualizovat (visí na starých datech i 24 h+).
- Widget dopravy jede na mock datech (`VITE_USE_MOCK_TRANSPORT=true`); plán = GTFS data + Cloud Function, IDOS API není.
