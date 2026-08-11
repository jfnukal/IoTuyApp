# sync-strava-meals

Cloud Function (Python 3.12, gen2), která stáhne objednaná jídla ze **strava.cz**
a uloží je do Firestore `mealOrders/johanka`. Volá ji tlačítko 🍽️ ve widgetu rozvrhu.

**Tento zdroják byl do repa zachráněn 11. 8. 2026 z Cloud Storage** — do té doby existoval
jen jako nasazená funkce v Google Cloudu a nikde jinde nebyl (kdyby ho bylo potřeba upravit,
nebylo z čeho vycházet).

Podrobný popis fungování: [`docs/ROZVRH-A-STRAVA.md`](../../docs/ROZVRH-A-STRAVA.md).

## Parametry nasazené verze

| | |
|---|---|
| region | europe-west1 |
| entry point | `sync_strava_meals` |
| runtime | python312 |
| timeout / paměť | 60 s / 256 MB |
| URL | `https://europe-west1-iotuyapp.cloudfunctions.net/sync-strava-meals` |

Přihlašovací údaje čte z Firestore `appConfig/apiKeys`
(`strava_username`, `strava_password`, `strava_canteen`) — **nejsou a nesmí být v kódu**.

## Nasazení

Tahle funkce **není** součástí `firebase deploy --only functions` (ten nasazuje jen Node.js
funkce ze složky `functions/`). Nasazuje se samostatně přes gcloud:

```bash
gcloud functions deploy sync-strava-meals \
  --gen2 --runtime=python312 --region=europe-west1 \
  --source=. --entry-point=sync_strava_meals \
  --trigger-http --allow-unauthenticated \
  --project=iotuyapp
```

> ⚠️ `--allow-unauthenticated` je současný (zděděný) stav a je to bezpečnostní slabina:
> endpoint vrací jídelníček i zůstatek na kontě komukoli, kdo zná URL, a ta je ve veřejném repu.
> Při příští úpravě přidat ověření Firebase ID tokenu.
