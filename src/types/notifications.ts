// src/types/notifications.ts

export interface FamilyMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipients: string[]; // ID členů rodiny nebo 'all', 'parents', 'children'
  message: string;
  template?: MessageTemplate;
  urgent: boolean;
  timestamp: number;
  readBy: string[]; // ID členů, kteří si zprávu přečetli
  delivered: boolean;
}

export type MessageTemplate = 
  | 'shopping'
  | 'call_down'
  | 'dinner_ready'
  | 'leaving_soon'
  | 'custom';

export interface MessageRecipient {
  type: 'individual' | 'group';
  id: string; // member ID nebo group ID
  name: string;
  emoji?: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  members: string[]; // ID členů rodiny
  icon: string;
  color?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  urgentRepeat: boolean; // Opakovat urgentní zprávy
  repeatInterval: number; // v minutách
}

export interface PushSubscription {
  userId: string;
  subscription: PushSubscriptionJSON;
  deviceInfo?: {
    userAgent: string;
    platform: string;
  };
  createdAt: number;
}