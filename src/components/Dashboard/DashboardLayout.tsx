// src/components/Dashboard/DashboardLayout.tsx
import React, { useState } from 'react';
import FamilyDashboard from './FamilyDashboard';
import TechDashboard from './TechDashboard';
// import CalendarMiniWidget from '../Widgets/Calendar/CalendarMiniWidget';
import HeaderInfo from './HeaderInfo';
import './styles/DashboardLayout.css';
import SendMessagePanel from '../Notifications/SendMessagePanel';
import { useNotificationContext } from '../Notifications/NotificationProvider';
import type { FamilyMember } from '../Widgets/Calendar/types';

type DashboardMode = 'family' | 'tech';

const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'dad', name: 'Táta', emoji: '👨', role: 'parent', color: '#4ecdc4' },
  { id: 'mom', name: 'Máma', emoji: '👩', role: 'parent', color: '#ff6b6b' },
  {
    id: 'jarecek',
    name: 'Jareček',
    emoji: '👦',
    role: 'child',
    color: '#96ceb4',
  },
  {
    id: 'johanka',
    name: 'Johanka',
    emoji: '👧',
    role: 'child',
    color: '#45b7d1',
  },
];

interface DashboardLayoutProps {
  onNavigateToSettings?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  onNavigateToSettings,
}) => {
  const [mode, setMode] = useState<DashboardMode>('family');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false);
  const { unreadCount } = useNotificationContext();

  // Najdi aktuálně přihlášeného uživatele z FAMILY_MEMBERS
  const getCurrentMember = () => {
    // TODO: V budoucnu přidáme skutečnou autentizaci členů
    // Pro teď vracíme první member (Táta)
    return FAMILY_MEMBERS[0];
  };

  const handleMemberClick = (memberId: string) => {
    setSelectedMember(selectedMember === memberId ? null : memberId);
  };

  const handleClearFilter = () => {
    setSelectedMember(null);
  };

  const handleModeSwitch = (newMode: DashboardMode) => {
    setMode(newMode);
  };

  return (
    <div className="dashboard-layout">
      {/* Header s avatary a přepínačem */}
      <div className="dashboard-layout-header">
        <div className="header-content">
          <div className="family-grid-wrapper">
            {/* Levé ikony */}
            <div className="family-grid-left">
              {FAMILY_MEMBERS.filter(
                (m) => m.id === 'dad' || m.id === 'jarecek'
              ).map((member) => {
                const memberIcons = { dad: '🥃', jarecek: '🧱' };
                return (
                  <div
                    key={member.id}
                    className={`family-member-circle ${
                      selectedMember === member.id ? 'selected' : ''
                    }`}
                    onClick={() => handleMemberClick(member.id)}
                    title={member.name}
                  >
                    <div className="member-icon-bg">
                      {memberIcons[member.id as keyof typeof memberIcons]}
                    </div>
                    <div className="member-emoji">{member.emoji}</div>
                    <div className="member-name">{member.name}</div>
                  </div>
                );
              })}
            </div>

            {/* HeaderInfo uprostřed */}
            <HeaderInfo familyMembers={FAMILY_MEMBERS} />

            {/* Pravé ikony */}
            <div className="family-grid-right">
              {FAMILY_MEMBERS.filter(
                (m) => m.id === 'mom' || m.id === 'johanka'
              ).map((member) => {
                const memberIcons = { mom: '👟', johanka: '🎨' };
                return (
                  <div
                    key={member.id}
                    className={`family-member-circle ${
                      selectedMember === member.id ? 'selected' : ''
                    }`}
                    onClick={() => handleMemberClick(member.id)}
                    title={member.name}
                  >
                    <div className="member-icon-bg">
                      {memberIcons[member.id as keyof typeof memberIcons]}
                    </div>
                    <div className="member-emoji">{member.emoji}</div>
                    <div className="member-name">{member.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Přepínač režimů + nastavení */}
          <div className="header-controls">
            {/* Ikona nastavení vlevo */}
            {onNavigateToSettings && (
              <button
                className="settings-icon-only"
                onClick={onNavigateToSettings}
                title="Nastavení"
              >
                ⚙️
              </button>
            )}

            {/* Tlačítko pro zprávy */}
            <button
              className="message-icon-btn"
              onClick={() => setIsMessagePanelOpen(true)}
              title="Poslat zprávu rodině"
            >
              💬
              {unreadCount > 0 && (
                <span className="unread-badge-desktop">{unreadCount}</span>
              )}
            </button>

            {/* Tlačítka režimů */}
            <div className="mode-switcher">
              <button
                className={`mode-btn ${mode === 'family' ? 'active' : ''}`}
                onClick={() => handleModeSwitch('family')}
              >
                <span className="mode-icon">👨‍👩‍👧‍👦</span>
                <span className="mode-label">Rodinný</span>
              </button>
              <button
                className={`mode-btn ${mode === 'tech' ? 'active' : ''}`}
                onClick={() => handleModeSwitch('tech')}
              >
                <span className="mode-icon">🔧</span>
                <span className="mode-label">Technický</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAB - Floating Action Button (pouze mobil) */}
      <div className={`fab-container ${isFabOpen ? 'open' : ''}`}>
        {/* Menu položky */}
        <div className="fab-menu">
          <button
            className={`fab-menu-item ${mode === 'family' ? 'active' : ''}`}
            onClick={() => {
              handleModeSwitch('family');
              setIsFabOpen(false);
            }}
            title="Rodinný režim"
          >
            <span className="fab-menu-icon">👨‍👩‍👧‍👦</span>
            <span className="fab-menu-label">Rodinný</span>
          </button>

          <button
            className={`fab-menu-item ${mode === 'tech' ? 'active' : ''}`}
            onClick={() => {
              handleModeSwitch('tech');
              setIsFabOpen(false);
            }}
            title="Technický režim"
          >
            <span className="fab-menu-icon">🔧</span>
            <span className="fab-menu-label">Technický</span>
          </button>

          {onNavigateToSettings && (
            <button
              className="fab-menu-item"
              onClick={() => {
                onNavigateToSettings();
                setIsFabOpen(false);
              }}
              title="Nastavení"
            >
              <span className="fab-menu-icon">⚙️</span>
              <span className="fab-menu-label">Nastavení</span>
            </button>
          )}

          <button
            className="fab-menu-item fab-message-btn"
            onClick={() => {
              setIsMessagePanelOpen(true);
              setIsFabOpen(false);
            }}
            title="Poslat zprávu"
          >
            <span className="fab-menu-icon">💬</span>
            <span className="fab-menu-label">Poslat zprávu</span>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </button>
        </div>

        {/* Hlavní FAB tlačítko */}
        <button
          className="fab-button"
          onClick={() => setIsFabOpen(!isFabOpen)}
          title="Menu"
        >
          <span className={`fab-icon ${isFabOpen ? 'open' : ''}`}>
            {isFabOpen ? '✕' : '☰'}
          </span>
        </button>
      </div>

      {/* Obsah podle režimu */}
      <div className="dashboard-content">
        {mode === 'family' ? (
          <FamilyDashboard
            selectedMember={selectedMember}
            onClearFilter={handleClearFilter}
            familyMembers={FAMILY_MEMBERS}
          />
        ) : (
          <TechDashboard />
        )}
      </div>

      {/* Message Panel s overlay */}
      {isMessagePanelOpen && (
        <>
          <div
            className="notification-overlay"
            onClick={() => setIsMessagePanelOpen(false)}
          />
          <SendMessagePanel
            senderName={getCurrentMember().name}
            onClose={() => setIsMessagePanelOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default DashboardLayout;
