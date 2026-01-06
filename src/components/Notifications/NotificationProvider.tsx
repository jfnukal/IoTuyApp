// src/components/Notifications/NotificationProvider.tsx

import React, { createContext, useContext, useMemo } from 'react'; // 👈 Přidán useMemo
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
    throw new Error(
      'useNotificationContext must be used within NotificationProvider'
    );
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
  children,
}) => {
  // 1. Získáme data z hooku
  const {
    permission,
    isSupported,
    messages,
    unreadCount,
    requestPermission,
    sendMessage,
    markAsRead,
    deleteMessage,
    deleteReadMessages,
  } = useNotifications(authUid, familyMemberId);

  // 2. 🚀 OPTIMALIZACE: Zabalíme to do useMemo
  // Kontext se změní POUZE tehdy, když se změní data nebo funkce, ne při každém renderu rodiče.
  const contextValue = useMemo(
    () => ({
      permission,
      isSupported,
      messages,
      unreadCount,
      requestPermission,
      sendMessage,
      markAsRead,
      deleteMessage,
      deleteReadMessages,
    }),
    [
      permission,
      isSupported,
      messages,
      unreadCount,
      requestPermission,
      sendMessage,
      markAsRead,
      deleteMessage,
      deleteReadMessages,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
