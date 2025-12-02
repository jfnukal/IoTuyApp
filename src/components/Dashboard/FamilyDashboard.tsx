// src/components/Dashboard/FamilyDashboard.tsx
import React, { lazy, Suspense } from 'react';
//import StickyNotesWidget from '../Widgets/StickyNotes/StickyNotesWidget';
import ShoppingListWidget from '../Widgets/ShoppingList/ShoppingListWidget';
import { ShoppingListProvider } from '../../contexts/ShoppingListContext';
import BusScheduleWidget from '../Widgets/SchoolSchedule/BusScheduleWidget';
import type { FamilyMember } from '../../types/index';
import './styles/FamilyDashboard.css';
import MessageHistoryWidget from '../Notifications/MessageHistoryWidget';

// 🚀 Lazy loading pro HandwritingWidget - načte se až když je widget povolený
const HandwritingWidget = lazy(() =>
  import('../Widgets/HandwritingNotes').then((module) => ({
    default: module.HandwritingWidget,
  }))
);
import { useAuth } from '../../contexts/AuthContext';
import { useWidgetSettings } from '../../hooks/useWidgetSettings';

interface FamilyDashboardProps {
  selectedMember: string | null;
  onClearFilter: () => void;
  familyMembers: FamilyMember[];
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({
  selectedMember,
  onClearFilter,
  familyMembers,
}) => {
  const { settings, isLoading } = useWidgetSettings();
  const { currentUser } = useAuth();

  // Pokud se ještě načítá nastavení, zobraz loader
  if (isLoading) {
    return (
      <div className="family-dashboard">
        <div className="loading-settings">
          <div className="spinner">🔄</div>
          <p>Načítám nastavení...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="family-dashboard">
      <div className="widgets-grid">
        {/* Handwriting Notes Widget */}
        {settings?.widgets.handwritingNotes.enabled && (
          <div className="widget-container handwriting-container">
            <Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '300px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    color: 'white',
                    fontSize: '1.5rem',
                  }}
                >
                  ✍️ Načítám widget...
                </div>
              }
            >
              <HandwritingWidget
                userId={currentUser?.uid || ''}
                familyMembers={familyMembers}
              />
            </Suspense>
          </div>
        )}

        {/* Sticky Notes Widget
        {settings?.widgets.stickyNotes.enabled && (
          <div className="widget-container stickynotes-container">
            <StickyNotesWidget selectedMember={selectedMember} />
          </div>
        )} */}

        {/* 🛒 Nákupní seznam Widget */}
        {settings?.widgets.stickyNotes.enabled && (
          <div className="widget-container shopping-list-container">
            <ShoppingListProvider familyMembers={familyMembers}>
              <ShoppingListWidget />
            </ShoppingListProvider>
          </div>
        )}
        {/* Bus Schedule Widget */}
        {settings?.widgets.busSchedule.enabled && (
          <div className="widget-card">
            <BusScheduleWidget />
          </div>
        )}

        {/* Message History Widget */}
        {settings?.widgets.messageHistory.enabled && (
          <div className="widget-container messages-container">
            <MessageHistoryWidget />
          </div>
        )}

        {/* Placeholder pro budoucí widgety */}
        <div className="widget-container add-widget-container">
          <div className="add-widget-placeholder">
            <div className="add-widget-icon">➕</div>
            <div className="add-widget-text">Přidat widget</div>
            <p className="add-widget-hint">Brzy dostupné...</p>
          </div>
        </div>
      </div>

      {/* Info panel když je vybrán člen rodiny */}
      {selectedMember && (
        <div className="member-info-panel">
          <p className="member-info-text">
            📊 Zobrazuji aktivitu pro: <strong>{selectedMember}</strong>
          </p>
          <button className="clear-filter-btn" onClick={onClearFilter}>
            ✕ Zobrazit vše
          </button>
        </div>
      )}
    </div>
  );
};

export default FamilyDashboard;

