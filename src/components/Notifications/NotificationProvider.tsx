// src/components/Notifications/NotificationProvider.tsx

import React, { createContext, useContext } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import type { FamilyMessage } from '../../types/notifications';

interface NotificationContextType {
  permission: NotificationPermission;
  isSupported: boolean;
  messages: FamilyMessage[];
  unreadCount: number;
  requestPermission: () => Promise<boolean>;
  sendMessage: (
    senderName: string,
    recipients: string[],
    message: string,
    template?: string,
    urgent?: boolean
  ) => Promise<string>;
  markAsRead: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteReadMessages: () => Promise<number>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  authUid: string | null;
  familyMemberId: string | null;
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  authUid,
  familyMemberId,
  children 
}) => {
  const notificationData = useNotifications(authUid, familyMemberId);

  return (
    <NotificationContext.Provider value={notificationData}>
      {children}
    </NotificationContext.Provider>
  );
};
