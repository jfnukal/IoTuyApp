// src/components/Notifications/MessageHistoryWidget.tsx

import React from 'react';
import { useNotificationContext } from './NotificationProvider';
import './styles/MessageHistory.css';

// TODO: V budoucnu získat z auth contextu
const CURRENT_USER_ID = 'dad';

const MessageHistoryWidget: React.FC = () => {
  const {
    messages,
    markAsRead,
    unreadCount,
    deleteMessage,
    deleteReadMessages,
  } = useNotificationContext();
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Právě teď';
    if (diffMins < 60) return `Před ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Před ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Před ${diffDays} d`;
  };

  const handleMessageClick = async (messageId: string) => {
    await markAsRead(messageId);
  };

  const handleDelete = async (messageId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Zabránit kliknutí na message-item
    setDeleting(messageId);
    try {
      await deleteMessage(messageId);
    } catch (error) {
      alert('Nepodařilo se smazat zprávu');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAllRead = async () => {
    if (!confirm('Opravdu chcete smazat všechny přečtené zprávy?')) {
      return;
    }
    try {
      const count = await deleteReadMessages();
      if (count > 0) {
        alert(`Smazáno ${count} zpráv`);
      } else {
        alert('Žádné přečtené zprávy ke smazání');
      }
    } catch (error) {
      alert('Nepodařilo se smazat zprávy');
    }
  };

  return (
    <div className="message-history-widget">
      <div className="widget-header-msg">
        <div className="header-left">
          <h3>💬 Rodinné zprávy</h3>
          {unreadCount > 0 && (
            <span className="unread-count-badge">{unreadCount}</span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            className="delete-all-btn"
            onClick={handleDeleteAllRead}
            title="Smazat přečtené"
          >
            🗑️
          </button>
        )}
      </div>

      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">📭</div>
            <p>Zatím žádné zprávy</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUnread = !msg.readBy.includes(CURRENT_USER_ID); // TADY je správné místo

            return (
              <div
                key={msg.id}
                className={`message-item ${isUnread ? 'unread' : ''} ${
                  msg.urgent ? 'urgent' : ''
                }`}
                onClick={() => handleMessageClick(msg.id)}
              >
                {msg.urgent && <div className="urgent-indicator">🚨</div>}

                <div className="message-header-item">
                  <span className="sender-name">{msg.senderName}</span>
                  <span className="message-time">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                <div className="message-text">{msg.message}</div>

                {isUnread && <div className="unread-dot"></div>}

                <button
                  className="delete-message-btn"
                  onClick={(e) => handleDelete(msg.id, e)}
                  disabled={deleting === msg.id}
                  title="Smazat zprávu"
                >
                  {deleting === msg.id ? '⏳' : '✕'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MessageHistoryWidget;
