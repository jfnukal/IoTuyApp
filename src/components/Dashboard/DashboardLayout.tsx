// src/components/Dashboard/DashboardLayout.tsx
import React, { useState } from 'react';
import FamilyDashboard from './FamilyDashboard';
import TechDashboard from './TechDashboard';
import './styles/DashboardLayout.css';

type DashboardMode = 'family' | 'tech';

interface FamilyMember {
  id: string;
  name: string;
  emoji: string;
  role: 'parent' | 'child';
}

const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'dad', name: 'Táta', emoji: '👨', role: 'parent' },
  { id: 'mom', name: 'Máma', emoji: '👩', role: 'parent' },
  { id: 'jarecek', name: 'Jareček', emoji: '👦', role: 'child' },
  { id: 'johanka', name: 'Johanka', emoji: '👧', role: 'child' },
];

interface DashboardLayoutProps {
  onNavigateToSettings?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  onNavigateToSettings,
}) => {
  const [mode, setMode] = useState<DashboardMode>('family');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

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
          <h1 className="dashboard-main-title">🏠 Náš Rodinný Dashboard</h1>
          <p className="dashboard-greeting">Ahoj rodino! 👋</p>

          {/* Avatary členů rodiny */}
          <div className="family-avatars">
            {FAMILY_MEMBERS.map((member) => (
              <div
                key={member.id}
                className={`avatar ${
                  selectedMember === member.id ? 'selected' : ''
                }`}
                onClick={() => handleMemberClick(member.id)}
                title={member.name}
              >
                <span className="avatar-emoji">{member.emoji}</span>
                <span className="avatar-name">{member.name}</span>
              </div>
            ))}
          </div>

          {/* Přepínač režimů */}
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

          {/* Ikona nastavení - nenápadná */}
          {onNavigateToSettings && (
            <button
              className="settings-icon-btn"
              onClick={onNavigateToSettings}
              title="Nastavení"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Obsah podle režimu */}
      <div className="dashboard-content">
        {mode === 'family' ? (
          <FamilyDashboard
            selectedMember={selectedMember}
            onClearFilter={handleClearFilter}
          />
        ) : (
          <TechDashboard />
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
