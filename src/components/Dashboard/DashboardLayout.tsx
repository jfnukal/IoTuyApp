// src/components/Dashboard/DashboardLayout.tsx
import React, { useState } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import FamilyDashboard from './FamilyDashboard';
import TechDashboard from './TechDashboard';
// import HeaderInfo from './HeaderInfo';
import HeaderSlots from './HeaderSlots';
import './styles/DashboardLayout.css';
import SendMessagePanel from '../Notifications/SendMessagePanel';
import { useNotificationContext } from '../Notifications/NotificationProvider';
import { useAuth } from '../../contexts/AuthContext';

type DashboardMode = 'family' | 'tech';

interface DashboardLayoutProps {
  familyMemberId: string | null; // ← PŘIDEJ
  onNavigateToSettings?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  familyMemberId,
  onNavigateToSettings,
}) => {
  const { logout } = useAuth();
  const { familyMembers } = useFirestore();
  const [mode, setMode] = useState<DashboardMode>('family');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false);
  const { unreadCount, requestPermission } = useNotificationContext();

  const getCurrentMember = () => {
    if (!familyMemberId) {
      return familyMembers[0]; // Fallback
    }

    const member = familyMembers.find((m) => m.id === familyMemberId);
    return member || familyMembers[0]; // Fallback pokud nenalezen
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
          {/* Nová flexibilní hlavička se sloty */}
          <HeaderSlots familyMembers={familyMembers} />

      {/* Ovládací prvky v hlavičce - pouze pro desktop */}
      <div className="header-controls desktop-only">
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

                  {/* Tlačítko pro notifikace */}
                  <button
                    className="notification-permission-btn"
                    onClick={requestPermission}
                    title="Povolit notifikace"
                  >
                    🔔
                  </button>

                  {/* Nastavení */}
                  {onNavigateToSettings && (
                    <button
                      className="settings-icon-only"
                      onClick={onNavigateToSettings}
                      title="Nastavení"
                    >
                      ⚙️
                    </button>
                  )}

                  {/* Odhlásit */}
                  <button
                    className="btn-icon-only"
                    onClick={logout}
                    title="Odhlásit se"
                  >
                    🚪
                  </button>
                </div>
              </div>
            </div>

            {/* FAB VLEVO - Menu */}
            <div className={`fab-container fab-left ${isFabOpen ? 'open' : ''}`}>
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

                    <button
                      className="fab-menu-item"
                      onClick={() => {
                        requestPermission();
                        setIsFabOpen(false);
                      }}
                      title="Notifikace"
                    >
                      <span className="fab-menu-icon">🔔</span>
                      <span className="fab-menu-label">Notifikace</span>
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
                      className="fab-menu-item"
                      onClick={() => {
                        logout();
                        setIsFabOpen(false);
                      }}
                      title="Odhlásit se"
                    >
                      <span className="fab-menu-icon">🚪</span>
                      <span className="fab-menu-label">Odhlásit</span>
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

                {/* FAB VPRAVO - Poslat zprávu */}
                <button
                  className="fab-message-primary"
                  onClick={() => setIsMessagePanelOpen(true)}
                  title="Poslat zprávu rodině"
                >
                  <span className="fab-message-icon">💬</span>
                  {unreadCount > 0 && (
                    <span className="unread-badge-fab">{unreadCount}</span>
                  )}
                </button>

      {/* Obsah podle režimu */}
      <div className="dashboard-content">
        {mode === 'family' ? (
          <FamilyDashboard
            selectedMember={selectedMember}
            onClearFilter={handleClearFilter}
            familyMembers={familyMembers}
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
            familyMembers={familyMembers}
          />
        </>
      )}
    </div>
  );
};

export default DashboardLayout;
