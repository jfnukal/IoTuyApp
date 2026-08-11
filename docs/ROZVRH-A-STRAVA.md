# Rozvrh hodin a školní strava — jak to funguje

Technický popis dvou propojených částí dashboardu: **rozvrhu hodin obou dětí** a **jídelníčku ze strava.cz**.
Psáno jako podklad pro práci v jiné session — popisuje stav k srpnu 2026.

> ⚠️ Repo je veřejné. V tomto dokumentu nejsou žádné přihlašovací údaje, čísla jídelny ani jména škol —
> jen názvy polí, kde tyto hodnoty leží (skutečné hodnoty jsou ve Firestore `appConfig/apiKeys`).

---

## Rychlá orientace — tři nezávislé zdroje dat

| Co | Zdroj | Kdo to spouští | Kde se to uloží |
|---|---|---|---|
| Rozvrh Johanky | Bakaláři REST API (z prohlížeče) | ruční tlačítko 🔄 | `schedules/johanka` + localStorage |
| Rozvrh Jaroslava | ručně vyplněný formulář | ruční editace v modalu | `schedules/jarecek` |
| Jídelníček (Johanka) | strava.cz přes Python Cloud Function | ruční tlačítko 🍽️ | `mealOrders/johanka` |

**Klíčové zjištění: nic z toho se neaktualizuje samo.** Neexistuje žádná naplánovaná úloha —
všechno běží jen tehdy, když někdo klikne na tlačítko ve widgetu.

---

# ČÁST 1 — Rozvrh hodin

## 1.1 Datový model

Společný pro obě děti (`src/types/index.ts`):

```ts
interface TimetableLesson {
  subjecttext: string;   // plný název předmětu, např. "Matematika"
  teacher: string;       // zkratka učitele
  room: string;          // zkratka místnosti
  begintime: string;     // "08:30"
  endtime: string;       // "09:15"
  theme?: string; notice?: string; change?: string;  // z Bakalářů, zatím nevyužito
}

interface TimetableDay {
  date: string;          // u Bakalářů ISO datum, u ručního rozvrhu datum vytvoření (!)
  dayOfWeek: number;
  dayDescription: string; // "Pondělí"
  lessons: TimetableLesson[];
}
```

Ve Firestore leží jako dokument `schedules/{johanka|jarecek}` ve tvaru:
```
{ days: TimetableDay[], lastUpdated: Date }
```
Čte/zapisuje `firestoreService.getSchedule(id)` / `saveSchedule(id, days)`
(`src/services/firestoreService.ts`, kolem řádku 308).

**Pozor:** ID `johanka` a `jarecek` jsou natvrdo v kódu widgetu, nejsou navázaná na `familyMembers`.

## 1.2 Johanka — Bakaláři API

Soubor: `src/api/bakalariAPI.ts` (třída `BakalariAPI`, singleton `bakalariAPI`).

**Běží v prohlížeči, ne na serveru** — dítě/rodič musí mít otevřený dashboard.

### Přihlášení
1. `loadConfig()` si z Firestore (`appConfig/apiKeys` přes `configService`) vytáhne
   `bakalari_server`, `bakalari_username`, `bakalari_password`.
2. `login()` pošle `POST {server}/api/login` s `client_id=ANDR`, `grant_type=password`
   (OAuth password flow oficiálního Android klienta Bakalářů).
3. Uloží si `access_token` a `tokenExpiry` **jen do paměti** — po refreshi stránky se přihlašuje znovu.
4. `ensureValidToken()` obnovuje token 60 s před vypršením.

### Stažení rozvrhu
`getTimetable(forceRefresh = false)`:
1. Když je v konfiguraci `features.useMockData`, vrátí `MOCK_TIMETABLE` z `bakalariMockData.ts`.
2. Bez `forceRefresh` zkusí **cache v localStorage** (`bakalari_timetable`) — platí jen v rámci
   dnešního dne (porovnává `cachedAt` s dnešním datem).
3. Jinak `GET {server}/api/3/timetable/actual` s Bearer tokenem.
4. `parseTimetable()` složí odpověď: Bakaláři vracejí zvlášť číselníky `Hours`, `Subjects`,
   `Teachers`, `Rooms` a zvlášť `Days[].Atoms[]` s odkazy přes ID. Parser si udělá mapy
   a spáruje je; hodiny bez záznamu v `Hours` zahazuje. Lekce řadí podle času začátku.
5. Výsledek uloží do localStorage cache.

### Co ukládá do Firestore
Samotné `getTimetable()` do Firestore **nezapisuje**. Zápis dělá až widget po ručním refreshi:
`bakalariAPI.getTimetable(true)` → `firestoreService.saveSchedule('johanka', data)`.

### Chování při chybě
Selhání loginu i stažení jen zaloguje do konzole a vrátí `[]` — widget pak ukáže prázdný rozvrh
a uživatel dostane `alert('Nepodařilo se načíst data z Bakalářů.')`.

## 1.3 Jaroslav — ruční rozvrh

Soubor: `src/components/Widgets/SchoolSchedule/SchoolScheduleModal.tsx`.

Bakaláři pro něj nejsou (jiná škola / nemá přístup), takže rozvrh se vyplňuje ručně:
- Mřížka **5 dní × 5 hodin** s **pevnými časy**: 07:30, 08:30, 09:30, 10:25, 11:20
  (konstanta `HOURS` v modalu — změna zvonění = nutná úprava kódu).
- Vyplňuje se **jen název předmětu**, učitel ani místnost se nezadávají.
- Uloží `firestoreService.saveSchedule('jarecek', ...)` po seřazení lekcí podle času.
- Modal se otevře kliknutím na buňku se jménem „JAR" v hlavičkovém widgetu.
- Prázdné předměty zůstávají jako lekce s prázdným `subjecttext` (widget je pak kreslí jako `--`).

## 1.4 Zobrazení — dva různé widgety

**A) `SchoolScheduleHeaderWidget.tsx`** — kompaktní, na hlavní stránce (`DashboardV2.tsx`).
Tohle je ten hlavní, který rodina vidí denně.

- **Tabulka na šířku:** dva bloky pod sebou (Jaroslav nahoře, Johanka dole), každý má vlastní
  řádek s časy — protože děti mají různé zvonění.
- **Výběr dne:** taby Po–Pá. Výchozí den určuje `getTargetDayIndex(14)`: dnešní den, ale
  **po 14:00 přeskočí na zítřek** (odpoledne už rodinu zajímá další den). O víkendu spadne na pondělí.
- **Předměty se zobrazují jako emoji + zkratka** — mapy `SUBJECT_EMOJI` a `SUBJECT_ABBREV`
  natvrdo v souboru, klíčem je přesný název předmětu. Neznámý předmět dostane 📚 a první tři písmena.
  *(Při změně názvu předmětu v Bakalářích je nutné doplnit mapu.)*
- Klik na buňku ukáže tooltip s plným názvem předmětu.
- **Dvě tlačítka refresh:** 🔄 rozvrh z Bakalářů, 🍽️ jídelníček ze strava.cz. Obě s `window.confirm`.
- **Prázdninový režim:** `holidayMode.ts` obsahuje konstantu `SUMMER_BREAK_UNTIL`
  (aktuálně `2026-08-25`). Dokud je dnešek dřív, místo rozvrhu se vykreslí `HolidayOverlay`.
  Datum se musí každý rok ručně posunout.

**B) `SchoolScheduleWidget.tsx`** — plná verze na podstránce „Více" (`MorePage.tsx`).

**Data se načítají jen jednou při mountu** (`useEffect` s prázdným polem závislostí) —
žádná Firestore subskripce, takže změna rozvrhu z jiného zařízení se neprojeví bez reloadu.

---

# ČÁST 2 — Školní strava (strava.cz)

## 2.1 Zásadní věc: kód je (byl) mimo repozitář

Synchronizaci dělá **Cloud Function `sync-strava-meals`**, která je napsaná v **Pythonu 3.12**
(zbytek projektu je Node.js) a **nebyla v gitu** — existovala jen nasazená na Googlu.
Zdroják jsem stáhl z Cloud Storage a uložil do `functions-python/sync-strava-meals/`.

| Parametr | Hodnota |
|---|---|
| Název | `sync-strava-meals` (gen2 / Cloud Run) |
| Runtime | python312, entry point `sync_strava_meals` |
| Region | europe-west1 |
| Volá se přes | `https://europe-west1-iotuyapp.cloudfunctions.net/sync-strava-meals` |
| Timeout / paměť | 60 s / 256 MB |
| Poslední nasazení | 9. 2. 2026 |
| Deploy | **ne** přes `firebase deploy` — nasazovala se samostatně (gcloud / konzole) |

## 2.2 Jak synchronizace probíhá

Soubor: `functions-python/sync-strava-meals/main.py`

1. **Přihlašovací údaje** – `get_credentials()` čte Firestore `appConfig/apiKeys`:
   `strava_username`, `strava_password`, `strava_canteen` (číslo jídelny).
2. **Login** – `POST https://app.strava.cz/api/login` s JSON tělem
   `{cislo, jmeno, heslo, zustatPrihlasen: true, environment: "W", lang: "CZ"}`.
   Předtím se ještě volá GET přihlašovací stránky (kvůli cookies).
   Z odpovědi se bere `sid` (session id), `s5url` (adresa konkrétního serveru jídelny)
   a z objektu `uzivatel` také `konto` (zůstatek), `nazevJidelny`, `jmeno`.
3. **Stažení objednávek** – `POST https://app.strava.cz/api/objednavky`
   s `{cislo, sid, s5url, lang, konto, podminka: "", ignoreCert: false}`.
   Odpověď je objekt, kde jsou jídla rozházená v polích s klíči začínajícími na `table`.
4. **Filtrování** – jídlo se zahodí, pokud:
   - nemá ani `delsiPopis`, ani `alergeny` (prázdné/servisní řádky),
   - `nazev` je stejný jako `druh_popis` (duplicitní hlavička),
   - `omezeniObj.den` obsahuje `"VP"` (nelze objednat).
5. **Datum** se překlápí z českého `DD.MM.YYYY` na `YYYY-MM-DD`.
6. **Do Firestore jde jen to, co je skutečně objednané** (`pocet == 1`), seskupené podle data.
7. **Odhlášení** – `POST /api/logOut` (chyba se ignoruje).

## 2.3 Co skončí ve Firestore

Dokument `mealOrders/johanka` — celý se **přepíše** (`set`, ne `merge`):

```
{
  orders: {
    "2026-09-01": [
      { type: "Oběd 1",  name: "Svíčková na smetaně", price: 32 },
      { type: "Svačina", name: "Rohlík s pomazánkou", price: 15 }
    ],
    "2026-09-02": [ ... ]
  },
  lastSync: <server timestamp>,
  canteenName: "...",
  userName: "...",
  balance: 1234.0        // zůstatek na kontě
}
```

Funkce zároveň totéž vrátí v odpovědi jako
`{success, orderedDays, totalMeals, balance, orders}`.

## 2.4 Jak se jídelníček zobrazuje

Vše v `SchoolScheduleHeaderWidget.tsx`, načítá se **jednorázově při mountu**
(`getDoc(doc(db, 'mealOrders', 'johanka'))`) — tedy jednosměrné čtení, ne subskripce.

- **Ikona u jména Johanky:** 🥪 když má **dnes** objednanou svačinu, jinak 🍴.
  Rozlišuje se podle `type === 'Svačina'` a **jen pro dnešní reálný den**, ne pro vybraný tab
  (jinak by ikona svítila celý týden).
- **Klik na ikonu** otevře přes portál týdenní přehled: pět karet Po–Pá, u každé zvlášť
  řádek Svačina a řádek Oběd. Oběd se pozná podle `type` začínajícího na „oběd"
  (kvůli variantám „Oběd 1", „Oběd 2"). Chybějící jídlo se kreslí jako `—`.
- **Datum pro kartu** počítá `getDateForDay(dayIndex)` — vždy z **aktuálního týdne**
  (pondělí = základ). Klíč do `orders` je `YYYY-MM-DD`.
- **Tlačítko 🍽️** zavolá funkci, po úspěchu přepíše stav z odpovědi a ukáže alert
  s počtem objednaných dnů.

---

# ČÁST 3 — Slabiny a rizika (důležité při úpravách)

## Bezpečnost
1. **Endpoint `sync-strava-meals` je veřejný a bez ověření** (`ingress: ALLOW_ALL`, žádná autentizace).
   Kdokoli, kdo zná URL — a ta je v **veřejném** repozitáři — může spustit synchronizaci
   a v odpovědi dostane **celý jídelníček i zůstatek na kontě**. Doporučeno: přidat kontrolu
   Firebase ID tokenu, nebo funkci volat jen ze serveru.
2. Heslo do strava.cz i do Bakalářů leží ve Firestore `appConfig/apiKeys` v čitelné podobě.
   Od července 2026 je čtení omezené allowlistem rodinných e-mailů ve `firestore.rules`.
3. Bakaláři se volají **přímo z prohlížeče** — heslo se posílá z klienta a je vidět
   v síťové kartě vývojářských nástrojů.

## Funkční mezery
4. **Žádná automatika.** Rozvrh i jídelníček se aktualizují jen ručním kliknutím.
   Nabízí se naplánovaná Cloud Function (např. neděle večer + středa).
5. **Strava je jen pro Johanku** — `mealOrders/johanka` je natvrdo, pro druhé dítě
   by bylo potřeba parametrizovat (jiné přihlášení = jiný účet strava.cz).
6. **Jídelníček přepisuje celý dokument.** Když synchronizace proběhne o prázdninách nebo
   při chybě přihlášení, přepíše existující data prázdným objektem. Chybí ochrana
   „nepřepisuj neprázdné prázdným".
7. **Widgety nemají živé Firestore subskripce** — po změně na jiném zařízení je nutný reload.
   (Je to v rozporu s pravidlem projektu, že V2 widgety mají mít vlastní subskripce.)
8. **Mapy emoji a zkratek předmětů jsou natvrdo v komponentě** — nový nebo přejmenovaný
   předmět se zobrazí jako 📚 + tři písmena.
9. **Pevné časy hodin Jaroslava** (5 hodin, konstanta `HOURS`) — jiný počet hodin nebo
   jiné zvonění vyžaduje zásah do kódu.
10. **Prázdninový režim je ruční konstanta** (`SUMMER_BREAK_UNTIL`), po prázdninách
    se musí každý rok přepsat.
11. **`date` u ručního rozvrhu je datum vytvoření**, ne datum dne v týdnu — pro Jaroslava
    tedy nedává smysl a nedá se z něj počítat.

---

# Rychlá reference — kde co je

**Rozvrh**
- `src/api/bakalariAPI.ts` — komunikace s Bakaláři, parsování, localStorage cache
- `src/api/bakalariMockData.ts` — testovací data
- `src/components/Widgets/SchoolSchedule/SchoolScheduleHeaderWidget.tsx` — hlavní widget (+ jídelníček)
- `src/components/Widgets/SchoolSchedule/SchoolScheduleWidget.tsx` — plná verze na „Více"
- `src/components/Widgets/SchoolSchedule/SchoolScheduleModal.tsx` — ruční rozvrh Jaroslava
- `src/components/Widgets/SchoolSchedule/holidayMode.ts` — prázdninový režim
- `src/services/firestoreService.ts` — `getSchedule` / `saveSchedule` (~ř. 308)
- `src/types/index.ts` — `TimetableDay`, `TimetableLesson` (~ř. 495)

**Strava**
- `functions-python/sync-strava-meals/main.py` — synchronizační funkce (zachráněná z cloudu)
- odbavení v UI: tatáž `SchoolScheduleHeaderWidget.tsx` (`handleMealRefresh`, `showLunchDetail`)

**Firestore**
- `appConfig/apiKeys` — `bakalari_server`, `bakalari_username`, `bakalari_password`,
  `strava_username`, `strava_password`, `strava_canteen`
- `schedules/johanka`, `schedules/jarecek` — `{ days, lastUpdated }`
- `mealOrders/johanka` — `{ orders, lastSync, canteenName, userName, balance }`

**Externí API**
- Bakaláři: `POST /api/login` (client_id ANDR), `GET /api/3/timetable/actual`
- strava.cz: `POST https://app.strava.cz/api/login`, `/api/objednavky`, `/api/logOut`
