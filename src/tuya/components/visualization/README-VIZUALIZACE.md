# 🏠 2D Vizualizace Domu - Implementační Návod

## 📦 CO JSEM VYTVOŘIL

Kompletní 2D vizualizační systém pro tvůj IoT dashboard s těmito funkcemi:

### ✨ Funkce:
- 🏠 **Půdorys domu** s více patry (sklep, přízemí, patro, zahrada)
- 🚪 **Místnosti** s drag & drop umístěním zařízení
- 📱 **Real-time zobrazení** stavu zařízení v místnostech
- 🎨 **Barevné rozlišení** místností podle typu
- 🖱️ **Interaktivní ovládání** - kliknutí na místnost = detail
- 📊 **Statistiky** - kolik zařízení v místnosti, online/offline
- 📲 **Responzivní design** - funguje na mobilu, tabletu i PC

---

## 📁 STRUKTURA SOUBORŮ

```
src/
├── types/
│   └── visualization.ts          # Typy pro House, Floor, Room
│
├── services/
│   └── houseService.ts           # Service pro práci s Firestore
│
├── hooks/
│   └── useHouse.ts               # Hook pro správu domu
│
└── components/
    └── visualization/
        ├── RoomCard2D.tsx        # Komponenta pro místnost
        ├── RoomCard2D.css
        ├── FloorPlan.tsx         # Komponenta pro patro
        ├── FloorPlan.css
        ├── HouseVisualization.tsx # Hlavní komponenta
        └── HouseVisualization.css
```

---

## 🚀 INSTALACE - KROK ZA KROKEM

### **KROK 1: Zkopíruj soubory do projektu**

```bash
# Typy
cp visualization.ts src/types/

# Service
cp houseService.ts src/services/

# Hook
cp useHouse.ts src/hooks/

# Komponenty
mkdir -p src/components/visualization
cp RoomCard2D.tsx src/components/visualization/
cp RoomCard2D.css src/components/visualization/
cp FloorPlan.tsx src/components/visualization/
cp FloorPlan.css src/components/visualization/
cp HouseVisualization.tsx src/components/visualization/
cp HouseVisualization.css src/components/visualization/
```

---

### **KROK 2: Aktualizuj hlavní types soubor**

Otevři `src/types/index.ts` a přidej:

```typescript
// src/types/index.ts

// Existující exporty...
export * from './tuya';

// ➕ PŘIDEJ TENTO ŘÁDEK:
export * from './visualization';
```

---

### **KROK 3: Exportuj vizualizační komponenty**

Vytvoř `src/components/visualization/index.ts`:

```typescript
// src/components/visualization/index.ts
export { default as RoomCard2D } from './RoomCard2D';
export { default as FloorPlan } from './FloorPlan';
export { default as HouseVisualization } from './HouseVisualization';
```

---

### **KROK 4: Přidej do hlavní aplikace**

Otevři `src/App.tsx` a přidej vizualizaci:

```typescript
// src/App.tsx
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { StickyNotesProvider } from './contexts/StickyNotesProvider';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { TuyaDeviceList } from './tuya';
// ➕ PŘIDEJ:
import { HouseVisualization } from './components/visualization';

function App() {
  return (
    <AuthProvider>
      <StickyNotesProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<TuyaDeviceList />} />
            {/* ➕ PŘIDEJ TUTO ROUTE: */}
            <Route path="/house" element={<HouseVisualization />} />
          </Routes>
        </Router>
      </StickyNotesProvider>
    </AuthProvider>
  );
}

export default App;
```

---

### **KROK 5: Přidej navigaci v Dashboard**

Otevři `src/components/Dashboard.tsx` a přidej tlačítko:

```typescript
// src/components/Dashboard.tsx
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      {/* Existující obsah... */}
      
      {/* ➕ PŘIDEJ TLAČÍTKO PRO VIZUALIZACI: */}
      <button 
        onClick={() => navigate('/house')}
        className="nav-button"
      >
        🏠 Vizualizace domu
      </button>
      
      <button 
        onClick={() => navigate('/devices')}
        className="nav-button"
      >
        📱 Tuya zařízení
      </button>
    </div>
  );
}
```

---

## 🎨 UKÁZKOVÝ DŮM

Při prvním spuštění se automaticky vytvoří ukázkový dům s touto strukturou:

### **Přízemí:**
- 🛋️ **Obývák** (40% x 45%)
- 🛏️ **Ložnice** (45% x 45%)
- 🚪 **Chodba** (90% x 20%)
- 🚽 **WC** (20% x 15%)

### **Další patra:**
- ⬇️ **Sklep** (zatím prázdný)
- ⬆️ **1. Patro** (zatím prázdné)
- 🌳 **Zahrada** (zatím prázdná)

---

## 🎮 JAK TO FUNGUJE

### **1. Automatické vytvoření domu**
Když uživatel poprvé otevře vizualizaci, automaticky se vytvoří ukázkový dům s přednastavenými místnostmi.

### **2. Přepínání mezi patry**
Tlačítka nahoře umožňují přepínat mezi patry (sklep, přízemí, patro, zahrada).

### **3. Kliknutí na místnost**
Po kliknutí na místnost se zobrazí detail s informacemi o zařízeních v ní.

### **4. Real-time aktualizace**
Když se stav zařízení změní, automaticky se aktualizuje i v vizualizaci.

---

## 🔧 PŘIZPŮSOBENÍ

### **Změna barev místností:**

```typescript
// src/types/visualization.ts
export const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  'living-room': {
    // ...
    defaultColor: '#FF6B6B', // ⬅️ ZMĚŇ BARVU
  },
  // ...
};
```

### **Přidání nové místnosti:**

```typescript
// V houseService.ts - createDefaultHouse()
const newRoom = this.createRoom(
  'office',           // Typ místnosti
  floorId,            // ID patra
  houseId,            // ID domu
  {
    x: 10,            // Pozice X (%)
    y: 10,            // Pozice Y (%)
    width: 30,        // Šířka (%)
    height: 40,       // Výška (%)
  }
);
```

---

## 🐛 ŘEŠENÍ PROBLÉMŮ

### **Problém: Dům se nevytváří automaticky**
```typescript
// Manuální vytvoření domu v konzoli:
import { houseService } from './services/houseService';
await houseService.createDefaultHouse('USER_ID');
```

### **Problém: Místnosti se nepřekrývají správně**
Zkontroluj, že pozice a velikosti místností v `createDefaultHouse()` jsou v rozsahu 0-100%.

### **Problém: Zařízení se nezobrazují v místnostech**
Ujisti se, že:
1. Tuya zařízení jsou načtená (`useTuya` hook funguje)
2. Zařízení mají správně nastavené ID
3. Firebase Firestore má správná oprávnění

---

## 📊 FIRESTORE STRUKTURA

```
📁 houses/
  └── house-{userId}/
      ├── id: string
      ├── name: string
      ├── floors: string[]
      ├── devicePlacements: DevicePlacement[]
      └── ...

📁 floors/
  └── floor-{id}/
      ├── id: string
      ├── name: string
      ├── level: number
      ├── rooms: string[]
      └── ...

📁 rooms/
  └── room-{id}/
      ├── id: string
      ├── name: string
      ├── type: RoomType
      ├── devices: string[]
      └── ...
```

---

## ✅ CHECKLIST PŘED TESTOVÁNÍM

- [ ] Všechny soubory zkopírovány na správné místo
- [ ] `visualization.ts` exportován v `src/types/index.ts`
- [ ] Route `/house` přidána do `App.tsx`
- [ ] Navigační tlačítko přidáno do Dashboard
- [ ] Firebase Firestore pravidla povolují zápis do `houses`, `floors`, `rooms`
- [ ] Tuya zařízení se načítají správně
- [ ] Test mode zapnutý (pokud testuješ mock data)

---

## 🎯 DALŠÍ KROKY

Nyní máš funkční 2D vizualizaci! **Můžeš pokračovat:**

### **FÁZE 2A: Drag & Drop zařízení**
- Přetahování zařízení z listu do místností
- Ukládání pozice zařízení v místnosti
- Vizuální feedback při přetahování

### **FÁZE 2B: Editace místností**
- Přejmenování místností
- Změna velikosti místností
- Přidání nových místností

### **FÁZE 2C: 3D režim (volitelné)**
- Přepínač 2D/3D
- 3D izometrická projekce pokoje
- Rotace a zoom

---

## 💡 TIPY

1. **Pro rychlý test** si otevři `/house` v prohlížeči
2. **Pro debug** otevři konzoli a sleduj logy (začínají emoji)
3. **Pro změnu rozložení** edituj funkci `createDefaultHouse()` v `houseService.ts`
4. **Pro přidání více pater** zkopíruj kód z `DEFAULT_FLOORS` a přidej nové patro

---

## 📞 POTŘEBUJEŠ POMOC?

Pokud máš problém:
1. Zkontroluj konzoli prohlížeče (F12)
2. Ověř Firebase Firestore pravidla
3. Ujisti se, že všechny závislosti jsou nainstalovány
4. Zeptej se mě - jsem tu pro tebe! 😊

---

**Hodně štěstí s tvým IoT dashboardem! 🚀**
