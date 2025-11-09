// src/components/Notifications/SendMessagePanel.tsx

import React, { useState } from 'react';
import { useNotificationContext } from './NotificationProvider';
import RecipientSelector from './RecipientSelector';
import { MESSAGE_TEMPLATES } from '../../services/familyMessagingService';
import type { MessageTemplate } from '../../types/notifications';
import './styles/Notifications.css';
import type { FamilyMember } from '../../types';

interface SendMessagePanelProps {
  senderName: string;
  onClose: () => void;
  familyMembers: FamilyMember[]; 
}

const SendMessagePanel: React.FC<SendMessagePanelProps> = ({
  senderName,
  onClose,
  familyMembers,
}) => {
  const { sendMessage, permission, requestPermission } =
    useNotificationContext();

  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<MessageTemplate>('custom');
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleTemplateChange = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    if (template !== 'custom') {
      setMessage(MESSAGE_TEMPLATES[template]);
    } else {
      setMessage('');
    }
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      alert('Vyber alespoň jednoho příjemce');
      return;
    }

    if (!message.trim()) {
      alert('Napiš zprávu');
      return;
    }

    // Zkontroluj povolení
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        alert('Notifikace nejsou povolené. Povol je v nastavení prohlížeče.');
        return;
      }
    }

    setSending(true);
    try {
      await sendMessage(
        senderName,
        selectedRecipients,
        message,
        selectedTemplate !== 'custom' ? selectedTemplate : undefined,
        urgent
      );

      // Reset formuláře
      setSelectedRecipients([]);
      setMessage('');
      setSelectedTemplate('custom');
      setUrgent(false);

      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Nepodařilo se poslat zprávu');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="send-message-panel">
      <div className="panel-header">
        <h3>Poslat zprávu rodině</h3>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="panel-content">
        {/* Výběr příjemců */}
        <div className="form-section">
         <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Komu:</label>
          <RecipientSelector
            selectedRecipients={selectedRecipients}
            onChange={setSelectedRecipients}
            familyMembers={familyMembers}
          />
        </div>

        {/* Šablony zpráv */}
        <div className="form-section">
          <label>Šablona zprávy:</label>
          <div className="template-buttons">
            <button
              className={`template-btn ${
                selectedTemplate === 'shopping' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('shopping')}
            >
              🛒 Do obchodu
            </button>
            <button
              className={`template-btn ${
                selectedTemplate === 'call_down' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('call_down')}
            >
              📢 Dolů
            </button>
            <button
              className={`template-btn ${
                selectedTemplate === 'dinner_ready' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('dinner_ready')}
            >
              🍽️ Jídlo hotové
            </button>
            <button
              className={`template-btn ${
                selectedTemplate === 'leaving_soon' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('leaving_soon')}
            >
              🚗 Odjíždím
            </button>
            <button
              className={`template-btn ${
                selectedTemplate === 'custom' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('custom')}
            >
              ✏️ Vlastní
            </button>
          </div>
        </div>

        {/* Text zprávy */}
        <div className="form-section">
          <label>Zpráva:</label>
          <textarea
            className="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Napiš zprávu..."
            rows={4}
            maxLength={360}
          />
          <div className="char-counter">
            {message.length}/360 znaků
          </div>
        </div>

        {/* Urgentní režim */}
        <div className="form-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
            />
            <span className="checkbox-text">
              🚨 Urgentní (opakované notifikace)
            </span>
          </label>
        </div>

        {/* Tlačítka */}
        <div className="panel-actions">
          <button className="btn-cancel" onClick={onClose}>
            Zrušit
          </button>
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={
              sending || selectedRecipients.length === 0 || !message.trim()
            }
          >
            {sending ? 'Odesílám...' : '📨 Poslat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendMessagePanel;
