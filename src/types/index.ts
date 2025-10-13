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
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  devices: string[];
  owner: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
  icon?: string;
  backgroundImage?: string;
  isDefault?: boolean;
  layout?: {
    width: number;
    height: number;
    type: '2d' | '3d';
  };
}

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
}

export interface CalendarEventData {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // Ponecháme string (ISO formát), je to spolehlivější pro DB
  time?: string;
  endTime?: string;
  type: EventType;
  familyMemberId?: string; // Přejmenováno pro konzistenci
  color?: string;
  reminder?: ReminderType;
  isAllDay?: boolean;
  attachments?: FileAttachment[]; // Zachováno z tvé verze
  recurring?: RecurringPattern; // Zachováno z tvé verze
  createdAt: number; // Potřebné pro DB
  updatedAt: number; // Potřebné pro DB
}

export type EventType =
  | 'personal'
  | 'work'
  | 'family'
  | 'birthday'
  | 'holiday'
  | 'nameday'
  | 'reminder';
export type ReminderType =
  | 'none'
  | '5min'
  | '15min'
  | '30min'
  | '1hour'
  | '1day'
  | '1week'
  | 'email'
  | 'push';

export type CalendarView = 'month' | 'week' | 'day';

export interface FileAttachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  url: string;
  size: number;
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string; // Použijeme string pro datum
  count?: number;
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
    defaultTime: ReminderType;
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
  reminder?: ReminderType;
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
