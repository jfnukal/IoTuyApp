// src/components/Notifications/NotificationProvider.tsx

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
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
  children: ReactNode;
  userId: string | null;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  userId,
}) => {
  const notificationState = useNotifications(userId);

  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
};