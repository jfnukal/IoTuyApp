// src/tuya/config/cardConfig.ts
// ============================================================
// KONFIGURACE KARET — velikosti, viditelnost obsahu, pravidla
// ============================================================
// Tento soubor je JEDINÉ místo kde se mění:
// - dostupné velikosti karet
// - co se zobrazí v jaké velikosti
// - výchozí velikosti pro typy zařízení
// ============================================================

// --- VELIKOSTI KARET ---
// Grid má 12 sloupců
export type CardSize = 'XS' | 'S' | 'M' | 'L';

export interface CardSizeDef {
  w: number;      // šířka v grid jednotkách
  label: string;  // pro UI
}

export const CARD_SIZES: Record<CardSize, CardSizeDef> = {
  XS: { w: 1, label: 'XS' },
  S:  { w: 2, label: 'S' },
  M:  { w: 3, label: 'M' },
  L:  { w: 4, label: 'L' },
};

// Pořadí velikostí (pro size picker UI)
export const CARD_SIZE_ORDER: CardSize[] = ['XS', 'S', 'M', 'L'];

// --- ODVOZOVÁNÍ VELIKOSTI Z ŠÍŘKY GRIDU ---
export const getCardSizeFromW = (w: number): CardSize => {
  if (w <= 1) return 'XS';
  if (w <= 2) return 'S';
  if (w <= 3) return 'M';
  return 'L';
};

// --- VIDITELNOST OBSAHU PODLE VELIKOSTI ---
// true = zobrazit, false = skrýt
export interface ContentVisibility {
  typeLabel: boolean;      // "Senzor", "Topení" atd.
  typeIcon: boolean;       // 🌡️, 🔥 atd.
  deviceName: boolean;     // Název zařízení
  onlineDot: boolean;      // Zelená/šedá tečka
  mainValue: boolean;      // Hlavní hodnota (teplota, ikona stavu)
  secondaryValue: boolean; // Druhá hodnota (vlhkost, cílová teplota)
  modeLabel: boolean;      // Mód (comfort, eco...)
  footer: boolean;         // Baterie + čas
  slider: boolean;         // Slider (jas světla)
  switchList: boolean;     // Seznam přepínačů (zásuvky)
}

export const CONTENT_VISIBILITY: Record<CardSize, ContentVisibility> = {
  XS: {
    typeLabel: false,
    typeIcon: false,
    deviceName: true,       // zkrácený
    onlineDot: true,
    mainValue: true,        // malý font
    secondaryValue: false,
    modeLabel: false,
    footer: false,
    slider: false,
    switchList: false,
  },
  S: {
    typeLabel: true,
    typeIcon: true,
    deviceName: true,
    onlineDot: true,
    mainValue: true,
    secondaryValue: false,  // vlhkost se nevejde
    modeLabel: false,
    footer: false,
    slider: false,
    switchList: true,       // max 2 přepínače
  },
  M: {
    typeLabel: true,
    typeIcon: true,
    deviceName: true,
    onlineDot: true,
    mainValue: true,        // velký font
    secondaryValue: true,   // vlhkost, cíl
    modeLabel: true,
    footer: true,
    slider: true,
    switchList: true,
  },
  L: {
    typeLabel: true,
    typeIcon: true,
    deviceName: true,
    onlineDot: true,
    mainValue: true,        // extra velký font
    secondaryValue: true,
    modeLabel: true,
    footer: true,
    slider: true,
    switchList: true,        // všechny přepínače
  },
};

// --- FONT SIZES PODLE VELIKOSTI ---
export interface FontSizes {
  mainValue: number;    // teplota, procenta, ikona
  unitSuffix: number;   // ° nebo %
  name: number;         // název zařízení
  typeLabel: number;    // "Senzor" atd.
  statusIcon: number;   // 🔒, 🧘 atd.
  footer: number;       // baterie, čas
}

export const FONT_SIZES: Record<CardSize, FontSizes> = {
  XS: { mainValue: 20, unitSuffix: 10, name: 11, typeLabel: 9,  statusIcon: 24, footer: 9 },
  S:  { mainValue: 32, unitSuffix: 16, name: 13, typeLabel: 10, statusIcon: 34, footer: 10 },
  M:  { mainValue: 40, unitSuffix: 20, name: 14, typeLabel: 11, statusIcon: 38, footer: 11 },
  L:  { mainValue: 52, unitSuffix: 24, name: 16, typeLabel: 12, statusIcon: 48, footer: 12 },
};

// --- GRID KONFIGURACE ---
export const GRID_CONFIG = {
  totalCols: 12,
  rowHeight: 50,
  margin: [14, 14] as [number, number],
  containerPadding: [0, 0] as [number, number],
  compactType: 'vertical' as const,
};
