export type CalendarView = 'month' | 'week' | 'day';

export type EventType = 'personal' | 'work' | 'family' | 'birthday' | 'holiday' | 'nameday' | 'reminder';

export type ReminderType = 'none' | '5min' | '15min' | '30min' | '1hour' | '1day' | '1week' | 'email' | 'push';

export interface FamilyMember {
  id: string;
  userId: string;         // <-- PŘIDÁNO pro propojení s uživatelem
  name: string;
  color: string;
  emoji: string;
  role: 'parent' | 'child';
  icon?: string; 
  avatar?: string;
  birthday?: string;       
  createdAt?: number;      
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time?: string;
  endTime?: string;
  type: EventType;
  familyMember?: string; // ID člena rodiny
  color?: string;
  reminder?: ReminderType;
  attachments?: FileAttachment[];
  isAllDay?: boolean;
  recurring?: RecurringPattern;
}

// TOTO JE NOVÁ, SPOJENÁ A OPRAVENÁ VERZE
export interface CalendarEventData {
  id: string;
  userId: string; // KLÍČOVÉ: Pro bezpečnostní pravidla
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
  recurring?: RecurringPattern;   // Zachováno z tvé verze
  createdAt: number; // Potřebné pro DB
  updatedAt: number; // Potřebné pro DB
}

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
}

export interface MonthTheme {
  month: number; // 1-12
  name: string;
  backgroundImage: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}