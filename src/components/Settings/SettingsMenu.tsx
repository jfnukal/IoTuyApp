// src/components/Settings/SettingsMenu.tsx
import React, { useState } from 'react';
import './SettingsMenu.css';

export type MenuSection =
  | 'dashboard'
  // Widgety — každý zvlášť
  | 'widget-weather'
  | 'widget-school'
  | 'widget-calendar'
  | 'widget-sticky'
  | 'widget-handwriting'
  | 'widget-messages'
  | 'widget-bus'
  | 'shopping-aliases'
  | 'notifications'
  | 'api-weather'
  | 'api-unsplash'
  | 'api-vision'
  | 'api-bakalari'
  | 'tuya'
  | 'system';

interface MenuItem {
  id: MenuSection;
  label: string;
  icon: string;
  children?: MenuItem[];
}

interface SettingsMenuProps {
  activeSection: MenuSection;
  onSectionChange: (section: MenuSection) => void;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    id: 'widget-weather',
    label: 'Widgety',
    icon: '🧩',
    children: [
      { id: 'widget-weather', label: 'Počasí', icon: '🌤️' },
      { id: 'widget-school', label: 'Školní rozvrh', icon: '📚' },
      { id: 'widget-calendar', label: 'Kalendář', icon: '📅' },
      { id: 'widget-sticky', label: 'Sticky Notes', icon: '📝' },
      { id: 'widget-handwriting', label: 'Ruční poznámky', icon: '✏️' },
      { id: 'widget-messages', label: 'Historie zpráv', icon: '💬' },
      { id: 'widget-bus', label: 'Autobusy', icon: '🚌' },
    ],
  },
  {
    id: 'shopping-aliases',
    label: 'Nákupní seznam',
    icon: '🛒',
  },
  {
    id: 'notifications',
    label: 'Notifikace (FCM)',
    icon: '🔔',
  },
  {
    id: 'api-weather',
    label: 'API Služby',
    icon: '🌐',
    children: [
      { id: 'api-weather', label: 'Weather API', icon: '🌤️' },
      { id: 'api-unsplash', label: 'Unsplash API', icon: '🖼️' },
      { id: 'api-vision', label: 'Google Vision', icon: '👁️' },
      { id: 'api-bakalari', label: 'Bakaláři', icon: '🎓' },
    ],
  },
  {
    id: 'tuya',
    label: 'TUYA',
    icon: '🏠',
  },
  {
    id: 'system',
    label: 'Systém',
    icon: '🖥️',
  },
];

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['widget-weather', 'api-weather'])
  );

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const isActive = activeSection === item.id;

    return (
      <div key={item.id} className="menu-item-wrapper">
        <div
          className={`menu-item level-${level} ${isActive ? 'active' : ''}`}
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id);
            }
            onSectionChange(item.id);
          }}
        >
          <span className="menu-icon">{item.icon}</span>
          <span className="menu-label">{item.label}</span>
          {hasChildren && (
            <span className={`menu-expand ${isExpanded ? 'expanded' : ''}`}>
              ›
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="menu-children">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="settings-menu">
      <div className="menu-header">
        <h2>⚙️ Nastavení</h2>
      </div>
      <div className="menu-items">
        {menuItems.map((item) => renderMenuItem(item))}
      </div>
    </div>
  );
};

export default SettingsMenu;
