// src/types/visualization.ts

/**
 * 🏠 Typy pro vizualizaci domu, místností a umístění zařízení
 */

export interface Position {
  x: number; // 0-100 (procenta)
  y: number; // 0-100 (procenta)
}

export interface Size {
  width: number; // 0-100 (procenta)
  height: number; // 0-100 (procenta)
}

/**
 * Umístění zařízení v místnosti
 */
export interface DevicePlacement {
  deviceId: string;
  position: Position;
  roomId: string;
}

/**
 * Místnost (Room)
 */
export interface Room {
  id: string;
  name: string;
  type: RoomType;
  floorId: string; // ID patra, ke kterému místnost patří
  position: Position; // Pozice v rámci patra
  size: Size; // Velikost místnosti
  color: string; // Barva místnosti
  icon: string; // Emoji ikona
  devices: string[]; // ID zařízení v této místnosti
}

export type RoomType =
  | 'living-room'    // Obývák
  | 'bedroom'        // Ložnice
  | 'kitchen'        // Kuchyň
  | 'bathroom'       // Koupelna
  | 'hallway'        // Chodba
  | 'toilet'         // WC
  | 'garage'         // Garáž
  | 'cellar'         // Sklep
  | 'garden'         // Zahrada
  | 'office'         // Pracovna
  | 'kids-room'      // Dětský pokoj
  | 'storage'        // Komora
  | 'other';         // Ostatní

/**
 * Patro domu
 */
export interface Floor {
  id: string;
  name: string;
  level: number; // -1 = sklep, 0 = přízemí, 1 = patro, atd.
  houseId: string;
  rooms: string[]; // ID místností
  color: string;
}

/**
 * Celý dům
 */
export interface House {
  id: string;
  name: string;
  userId: string;
  floors: string[]; // ID pater
  devicePlacements: DevicePlacement[]; // Umístění všech zařízení
  createdAt: number;
  updatedAt: number;
}

/**
 * Konfigurace místnosti (pro vytváření)
 */
export interface RoomConfig {
  type: RoomType;
  defaultName: string;
  defaultIcon: string;
  defaultColor: string;
  description: string;
}

/**
 * Přednastavené konfigurace místností
 */
export const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  'living-room': {
    type: 'living-room',
    defaultName: 'Obývák',
    defaultIcon: '🛋️',
    defaultColor: '#FF6B6B',
    description: 'Hlavní obývací prostor',
  },
  'bedroom': {
    type: 'bedroom',
    defaultName: 'Ložnice',
    defaultIcon: '🛏️',
    defaultColor: '#4ECDC4',
    description: 'Ložnice pro spaní',
  },
  'kitchen': {
    type: 'kitchen',
    defaultName: 'Kuchyň',
    defaultIcon: '🍳',
    defaultColor: '#FFE66D',
    description: 'Kuchyně a jídelna',
  },
  'bathroom': {
    type: 'bathroom',
    defaultName: 'Koupelna',
    defaultIcon: '🚿',
    defaultColor: '#95E1D3',
    description: 'Koupelna s vanou/sprchou',
  },
  'hallway': {
    type: 'hallway',
    defaultName: 'Chodba',
    defaultIcon: '🚪',
    defaultColor: '#C7CEEA',
    description: 'Vstupní chodba',
  },
  'toilet': {
    type: 'toilet',
    defaultName: 'WC',
    defaultIcon: '🚽',
    defaultColor: '#B4E7CE',
    description: 'Toaleta',
  },
  'garage': {
    type: 'garage',
    defaultName: 'Garáž',
    defaultIcon: '🚗',
    defaultColor: '#A8E6CF',
    description: 'Garáž pro auto',
  },
  'cellar': {
    type: 'cellar',
    defaultName: 'Sklep',
    defaultIcon: '📦',
    defaultColor: '#786FA6',
    description: 'Sklep/suterén',
  },
  'garden': {
    type: 'garden',
    defaultName: 'Zahrada',
    defaultIcon: '🌳',
    defaultColor: '#58B19F',
    description: 'Venkovní zahrada',
  },
  'office': {
    type: 'office',
    defaultName: 'Pracovna',
    defaultIcon: '💼',
    defaultColor: '#F8B500',
    description: 'Domácí kancelář',
  },
  'kids-room': {
    type: 'kids-room',
    defaultName: 'Dětský pokoj',
    defaultIcon: '🧸',
    defaultColor: '#FFA07A',
    description: 'Pokoj pro děti',
  },
  'storage': {
    type: 'storage',
    defaultName: 'Komora',
    defaultIcon: '📦',
    defaultColor: '#B0B0B0',
    description: 'Skladovací prostor',
  },
  'other': {
    type: 'other',
    defaultName: 'Ostatní',
    defaultIcon: '🏠',
    defaultColor: '#D3D3D3',
    description: 'Ostatní prostory',
  },
};

/**
 * Přednastavené rozložení pater
 */
export const DEFAULT_FLOORS = {
  cellar: {
    id: 'floor-cellar',
    name: 'Sklep',
    level: -1,
    color: '#786FA6',
  },
  ground: {
    id: 'floor-ground',
    name: 'Přízemí',
    level: 0,
    color: '#667EEA',
  },
  first: {
    id: 'floor-first',
    name: '1. Patro',
    level: 1,
    color: '#764BA2',
  },
  garden: {
    id: 'floor-garden',
    name: 'Zahrada',
    level: 0,
    color: '#58B19F',
  },
};
