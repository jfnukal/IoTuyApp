//src/types/index.ts
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface TuyaStatus {
  code: string;
  value: any;
}

export interface TuyaDevice {
  id: string;
  name: string;
  local_key: string;
  category: string;
  product_id: string;
  product_name: string;
  sub: boolean;
  uuid: string;
  owner_id: string;
  online: boolean;
  status?: TuyaStatus[] | null;
  lastUpdated?: number;
  isVisible?: boolean;
  roomId?: string;
  position?: {
    x: number;
    y: number;
  };
  customName?: string;
  customIcon?: string;
  customColor?: string;
  notes?: string;

  // 🎨 NASTAVENÍ KARTY (jak se má zobrazovat)
  cardSettings?: {
    size?: 'small' | 'medium' | 'large'; // Výška: small=150px, medium=300px, large=450px
    layout?: 'compact' | 'default'; // Layout typ
    hiddenControls?: string[]; // Skryté ovládací prvky (např. ['switch_3'])
    showInDetail?: string[]; // Co zobrazit pouze v detailu
    gridPosition?: { row: number; col: number }; // Pozice v gridu (pro budoucí D&D)
    showName?: boolean; // Zobrazovat název zařízení
    showCustomName?: boolean; // Zobrazovat vlastní název
    hidden?: boolean; // Skrýt kartu v gridu/listu
    // 🌡️ Pool Sensor - názvy kanálů
    channelNames?: {
      in?: string;   // Základna
      ch1?: string;  // Kanál 1
      ch2?: string;  // Kanál 2
      ch3?: string;  // Bazén
    };
  };

  // Grid pozice (pro react-grid-layout)
  gridLayouts?: {
    all?: { x: number; y: number; w: number; h: number };
    online?: { x: number; y: number; w: number; h: number };
    offline?: { x: number; y: number; w: number; h: number };
  };

  // 🏠 MÍSTNOST (kde zařízení patří)
  roomAssignment?: {
    roomId?: string; // ID místnosti
    floorId?: string; // ID patra
  };
}

/**
 * 🏠 Místnost - sloučený interface pro Firestore i vizualizaci
 */
export interface Room {
  // === ZÁKLADNÍ INFO ===
  id: string;
  name: string;
  description?: string;
  userId: string;

  // === VIZUALIZACE (2D/3D půdorys) ===
  type?: RoomType;
  floorId?: string; // ID patra (pro vizualizaci domu)
  position?: {
    x: number; // 0-100 (procenta)
    y: number; // 0-100 (procenta)
  };
  size?: {
    width: number; // 0-100 (procenta)
    height: number; // 0-100 (procenta)
  };

  // === STYLING ===
  color?: string;
  icon?: string;
  backgroundImage?: string;

  // === DATA ===
  devices: string[]; // ID zařízení v této místnosti
  isDefault?: boolean; // Výchozí místnost (nelze smazat)

  // === METADATA ===
  createdAt: number;
  updatedAt: number;

  // === LAYOUT (pro budoucí rozšíření) ===
  layout?: {
    width: number;
    height: number;
    type: '2d' | '3d';
  };
}

/**
 * Typy místností
 */
export type RoomType =
  | 'living-room' // Obývák
  | 'bedroom' // Ložnice
  | 'kitchen' // Kuchyň
  | 'bathroom' // Koupelna
  | 'hallway' // Chodba
  | 'toilet' // WC
  | 'garage' // Garáž
  | 'cellar' // Sklep
  | 'garden' // Zahrada
  | 'office' // Pracovna
  | 'kids-room' // Dětský pokoj
  | 'storage' // Komora
  | 'other'; // Ostatní

/**
 * Konfigurace typu místnosti (pro vytváření)
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
  bedroom: {
    type: 'bedroom',
    defaultName: 'Ložnice',
    defaultIcon: '🛏️',
    defaultColor: '#4ECDC4',
    description: 'Ložnice pro spaní',
  },
  kitchen: {
    type: 'kitchen',
    defaultName: 'Kuchyň',
    defaultIcon: '🍳',
    defaultColor: '#FFE66D',
    description: 'Kuchyně a jídelna',
  },
  bathroom: {
    type: 'bathroom',
    defaultName: 'Koupelna',
    defaultIcon: '🚿',
    defaultColor: '#95E1D3',
    description: 'Koupelna s vanou/sprchou',
  },
  hallway: {
    type: 'hallway',
    defaultName: 'Chodba',
    defaultIcon: '🚪',
    defaultColor: '#C7CEEA',
    description: 'Vstupní chodba',
  },
  toilet: {
    type: 'toilet',
    defaultName: 'WC',
    defaultIcon: '🚽',
    defaultColor: '#B4E7CE',
    description: 'Toaleta',
  },
  garage: {
    type: 'garage',
    defaultName: 'Garáž',
    defaultIcon: '🚗',
    defaultColor: '#A8E6CF',
    description: 'Garáž pro auto',
  },
  cellar: {
    type: 'cellar',
    defaultName: 'Sklep',
    defaultIcon: '📦',
    defaultColor: '#786FA6',
    description: 'Sklep/suterén',
  },
  garden: {
    type: 'garden',
    defaultName: 'Zahrada',
    defaultIcon: '🌳',
    defaultColor: '#58B19F',
    description: 'Venkovní zahrada',
  },
  office: {
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
  storage: {
    type: 'storage',
    defaultName: 'Komora',
    defaultIcon: '📦',
    defaultColor: '#B0B0B0',
    description: 'Skladovací prostor',
  },
  other: {
    type: 'other',
    defaultName: 'Ostatní',
    defaultIcon: '🏠',
    defaultColor: '#D3D3D3',
    description: 'Ostatní prostory',
  },
};

export interface DeviceCategory {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description?: string;
  defaultCommands?: string[];
}

export interface UserSettings {
  id?: string;
  uid: string;
  familyMemberId?: string; // 'dad', 'mom', 'jarecek', 'johanka'
  theme: 'light' | 'dark' | 'auto';
  language: 'cs' | 'en';
  notifications: boolean;
  createdAt: number;
  updatedAt: number;
  preferences?: {
    autoRefreshInterval: number;
    showOfflineDevices: boolean;
    defaultRoomView: 'grid' | 'list' | '2d' | '3d';
    soundEnabled: boolean;
    emailNotifications: boolean;
    defaultRoomId?: string;
    showEmptyRooms: boolean;
    roomSortOrder: 'name' | 'created' | 'updated' | 'custom';
    showDebugInfo?: boolean; // 🔍 Debug informace v Tuya kartách
  };
  tuyaConfig?: {
    hasValidCredentials: boolean;
    lastSync: number;
    deviceCount: number;
  };
}

export interface SharedRoom {
  id: string;
  roomId: string;
  ownerId: string;
  sharedWithUserId: string;
  permissions: {
    canView: boolean;
    canControl: boolean;
    canEdit: boolean;
    canShare: boolean;
  };
  createdAt: number;
  expiresAt?: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  owner: string;
  roomId?: string;
  isEnabled: boolean;
  trigger: {
    type: 'device' | 'time' | 'scene';
    deviceId?: string;
    condition?: string;
    time?: string;
  };
  actions: {
    deviceId: string;
    commands: { code: string; value: any }[];
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface FamilyMember {
  id: string;
  userId: string;
  authUid?: string;
  name: string;
  color: string;
  emoji: string;
  role: 'parent' | 'child';
  icon?: string;
  avatar?: string;
  birthday?: string;
  headerPosition?: 'left' | 'right';
  headerIcon?: string;
  createdAt?: number;
  daySummary?: DaySummaryConfig; // Nastavení „Souhrnu dne" pro tohoto člena (spravuje admin)
  taskReminder?: TaskReminderConfig; // Opakované připomínání úkolů pro tohoto člena (spravuje admin)
}

// ==================== NOVÉ TYPY PRO PŘIPOMÍNKY ====================

export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'ontime';

export type ReminderNotificationType = 'email' | 'push' | 'both';

export interface ReminderItem {
  id: string; // Unikátní ID připomínky
  value: number; // Hodnota (10, 1, 2, 3...)
  unit: ReminderUnit; // Jednotka času
  type: ReminderNotificationType; // Typ notifikace
}

export interface CalendarEventData {
  id: string;
  userId: string;
  createdBy?: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  type: EventType;
  familyMemberId?: string;
  reminderRecipients?: string[];
  color?: string;
  icon?: string;
  reminders?: ReminderItem[];
  sentReminders?: string[];
  isAllDay?: boolean;
  attachments?: FileAttachment[]; // Zachováno z tvé verze
  recurring?: RecurringPattern; // Zachováno z tvé verze
  createdAt: number; // Potřebné pro DB
  updatedAt: number; // Potřebné pro DB
  // Pro instance opakovaných událostí
  isRecurringInstance?: boolean;
  originalEventId?: string;
  instanceIndex?: number;
}

export type EventType =
  | 'personal'
  | 'work'
  | 'family'
  | 'birthday'
  | 'holiday'
  | 'nameday'
  | 'reminder'
  | 'school';
// export type ReminderType =
//   | 'none'
//   | '5min'
//   | '15min'
//   | '30min'
//   | '1hour'
//   | '1day'
//   | '1week'
//   | 'email'
//   | 'push';

export type CalendarView = 'month' | 'week' | 'day';

export interface FileAttachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  url: string;
  size: number;
}

// ==================== RECURRING EVENTS ====================

export type RecurrenceFrequency =
  | 'daily' // Každý den
  | 'weekly' // Každý týden
  | 'biweekly' // Každé 2 týdny
  | 'monthly' // Každý měsíc
  | 'yearly' // Každý rok
  | 'custom'; // Vlastní (konkrétní dny v týdnu)

export interface RecurringPattern {
  frequency: RecurrenceFrequency;
  interval: number; // Každých X (dní/týdnů/měsíců)
  daysOfWeek?: number[]; // Pro custom: 0=Ne, 1=Po, 2=Út... 6=So
  dayOfMonth?: number; // Pro monthly: den v měsíci (1-31)
  endType: 'never' | 'date' | 'count'; // Kdy končí opakování
  endDate?: string; // Koncové datum (YYYY-MM-DD)
  endCount?: number; // Po X opakováních
  exceptions?: string[]; // Data, kdy se událost NEKONÁ (YYYY-MM-DD)
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  type: 'national' | 'religious' | 'international';
  isPublic: boolean;
}

export interface Nameday {
  id: string;
  name: string;
  date: Date;
  names: string[];
}

export interface CalendarSettings {
  theme: 'light' | 'dark' | 'auto';
  firstDayOfWeek: 0 | 1; // 0 = neděle, 1 = pondělí
  timeFormat: '12h' | '24h';
  showWeekNumbers: boolean;
  showHolidays: boolean;
  showNamedays: boolean;
  defaultView: CalendarView;
  reminderSettings: {
    email: boolean;
    push: boolean;
    defaultTime: string;
  };
  familyView: boolean;
}

export interface CalendarTheme {
  id: string;
  userId: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  holiday: string;
  nameday: string;
  birthday: string;
  title: string;
  description?: string;
  date: string; // ISO formát string
  time?: string;
  endTime?: string;
  type: EventType;
  familyMemberId?: string;
  color?: string;
  reminders?: ReminderItem[];
  isAllDay?: boolean;
  attachments?: FileAttachment[];
  recurring?: RecurringPattern;
  createdAt: number;
  updatedAt: number;
}

export interface MonthTheme {
  month: number; // 1-12
  name: string;
  backgroundImage: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}

export interface TimetableLesson {
  subjecttext: string;
  teacher: string;
  room: string;
  begintime: string;
  endtime: string;
  theme?: string;
  notice?: string;
  change?: string;
}

export interface TimetableDay {
  date: string;
  dayOfWeek: number;
  dayDescription: string;
  lessons: TimetableLesson[];
}

export interface NamedayPreferenceDoc {
  markedDates: string[]; // Pole datumů ve formátu 'YYYY-MM-DD'
}

// ==================== SOUHRN DNE (denní push) ====================
// Ukládá se na člena: familyMembers/{memberId}.daySummary. Nastavuje admin pro každého.
// Výchozí stav (když pole chybí) = ZAPNUTO, čas 07:00.
export interface DaySummaryConfig {
  enabled?: boolean; // undefined = zapnuto (výchozí)
  time?: string; // "HH:MM" (24h); undefined = 07:00
  lastSentDate?: string; // "YYYY-MM-DD" (Praha) — spravuje Cloud Function, needitovat z klienta
}

// Opakované připomínání nesplněných úkolů (sticky notes) pro člena.
// Ukládá se na familyMembers/{memberId}.taskReminder. Interval per člen, max 4 týdny.
export type TaskReminderUnit = 'minutes' | 'hours' | 'days';
export interface TaskReminderConfig {
  enabled?: boolean; // undefined/false = vypnuto (výchozí OFF — připomínání je otravnější)
  intervalValue?: number;
  intervalUnit?: TaskReminderUnit;
  lastRemindedAt?: number; // ms — spravuje Cloud Function, needitovat z klienta
}

// ==================== HEADER CONFIG ====================

export type HeaderWidgetType = 'greeting' | 'weather' | 'upcoming' | 'none';

export interface HeaderSlotConfig {
  left: HeaderWidgetType;
  center: HeaderWidgetType;
  right: HeaderWidgetType;
}

export interface HeaderConfigDoc {
  slots: HeaderSlotConfig;
  updatedAt: number;
}

// ==================== TUYA DEVICE CARDS ====================

/**
 * Props pro jednotlivé karty zařízení
 */
export interface DeviceCardProps {
  device: TuyaDevice;
  onToggle: (deviceId: string) => Promise<void>;
  onControl?: (
    deviceId: string,
    commands: { code: string; value: any }[]
  ) => Promise<void>;
  onHeaderClick?: () => void; // NOVÉ - callback pro klik na hlavičku karty (otevře modal)
}

/**
 * Typy karet pro Tuya zařízení
 */
export type DeviceCardType =
  | 'heating'
  | 'multi_switch'
  | 'smart_light'
  | 'multi_socket'
  | 'temp_sensor'
  | 'motion_sensor'
  | 'door_sensor'
  | 'gateway'
  | 'valve'
  | 'soil_sensor'
  | 'doorbell'
  | 'ptz_camera'
  | 'basic';

// Na konec souboru před export
export interface DoorbellEvent {
  id: string;
  userId: string;
  deviceId: string;
  timestamp: number;
  snapshotUrl?: string;
  answered: boolean;
  duration?: number; // v sekundách
}

export interface DoorbellSnapshot {
  id: string;
  userId: string;
  deviceId: string;
  url: string;
  timestamp: number;
}

// ==================== SHOPPING LIST ====================

export interface ShoppingItem {
  id: string;
  text: string;
  addedBy: string; // ID člena rodiny (dad, mom, jarecek...)
  addedByEmoji: string; // 👨, 👩, 👦...
  addedByName: string; // Táta, Máma, Jareček...
  addedAt: number; // timestamp
  completed: boolean;
  completedBy?: string | null;
  completedByName?: string | null;
  completedAt?: number | null;
}

export interface ShoppingList {
  id: string;
  items: ShoppingItem[];
  createdAt: number;
  updatedAt: number;
}

// ==================== DISHWASHER WIDGET ====================
// TODO: Možnost konfigurovat kolik dní/položek historie uchovávat

export interface DishwasherPerson {
  id: string;
  name: string;
  emoji: string;
}

export interface DishwasherHistoryItem {
  id: string;
  personId: string; // ID člena, který myl (jarecek/johanka)
  personName: string; // Jméno (Jareček, Johanka)
  personEmoji: string; // Emoji (👦, 👧)
  completedAt: number; // Kdy to udělal
}

export interface DishwasherState {
  id: string;
  // Kdo je AKTUÁLNĚ na řadě
  nextPersonId: string;
  nextPersonName: string;
  nextPersonEmoji: string;
  // Poslední, kdo myl
  lastCompletedBy: string;
  lastCompletedByName: string;
  lastCompletedByEmoji: string;
  lastCompletedAt: number | null;
  // Historie (max 10)
  history: DishwasherHistoryItem[];
  createdAt: number;
  updatedAt: number;
}

// Hardcoded děti pro myčku (můžeš později změnit v nastavení)
export const DISHWASHER_PEOPLE: DishwasherPerson[] = [
  { id: 'jarecek', name: 'Jareček', emoji: '👦' },
  { id: 'johanka', name: 'Johanka', emoji: '👧' },
];

// TODO: Dishwasher Widget - přidat možnost konfigurace:
// - Kolik položek historie uchovávat (aktuálně max 10)
// - Nebo alternativně: kolik dnů zpětně uchovávat historii

// ==================== KUCHAŘKA ====================

export type RecipeCategory =
  | 'polévka'
  | 'hlavní jídlo'
  | 'dezert'
  | 'pečení'
  | 'salát'
  | 'příloha'
  | 'nápoj'
  | 'ostatní';

export interface RecipeIngredient {
  name: string;
  amount: string;   // "200", "1/2", "podle chuti"
  unit: string;     // "g", "ml", "ks", "lžíce", ""
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category: RecipeCategory;
  // Měsíce kdy se zobrazuje (1–12). Prázdné pole = celý rok.
  seasonMonths: number[];
  ingredients: RecipeIngredient[];
  steps: string[];
  prepTime?: number;        // minuty
  cookTime?: number;        // minuty
  servings?: number;
  youtubeLinks?: string[];  // max 2
  originalPhotoUrl?: string; // foto skenovaného originálu
  imageUrl?: string;         // fotka hotového jídla
  sourceUrl?: string;        // původní URL (import odkazu)
  tags: string[];
  addedBy: string;
  createdAt: number;
  updatedAt: number;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
// - Nastavení přidat do SettingsPanel nebo přímo do widgetu
