// src/types/settings.ts

export interface MessagingSettings {
  enabled: boolean;
  messageRetentionDays: number; // Počet dní, po které se zprávy uchovávají
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  urgentRepeatEnabled: boolean;
  urgentRepeatInterval: number; // v minutách
}

export interface AppSettings {
  messaging: MessagingSettings;
  // Další nastavení přidáme později
}

export const DEFAULT_MESSAGING_SETTINGS: MessagingSettings = {
  enabled: true,
  messageRetentionDays: 7,
  notificationsEnabled: true,
  soundEnabled: true,
  urgentRepeatEnabled: true,
  urgentRepeatInterval: 2,
};