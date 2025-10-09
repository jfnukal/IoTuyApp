// src/components/Notifications/RecipientSelector.tsx

import React from 'react';
import { FAMILY_GROUPS } from '../../services/familyMessagingService';
import './styles/Notifications.css';
import type { FamilyMember } from '../../types';

interface RecipientSelectorProps {
  selectedRecipients: string[];
  onChange: (recipients: string[]) => void;
  familyMembers: FamilyMember[];
}

const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  selectedRecipients,
  onChange,
  familyMembers,
}) => {
  const toggleRecipient = (id: string) => {
    if (selectedRecipients.includes(id)) {
      onChange(selectedRecipients.filter((r) => r !== id));
    } else {
      onChange([...selectedRecipients, id]);
    }
  };

  const isGroupSelected = (groupId: string) => {
    const group = FAMILY_GROUPS.find((g) => g.id === groupId);
    if (!group) return false;
    return group.members.every((member) => selectedRecipients.includes(member));
  };

  const toggleGroup = (groupId: string) => {
    const group = FAMILY_GROUPS.find((g) => g.id === groupId);
    if (!group) return;

    const allSelected = isGroupSelected(groupId);

    if (allSelected) {
      // Odeber všechny členy skupiny
      onChange(selectedRecipients.filter((r) => !group.members.includes(r)));
    } else {
      // Přidej všechny členy skupiny
      const newRecipients = new Set([...selectedRecipients, ...group.members]);
      onChange(Array.from(newRecipients));
    }
  };

  return (
    <div className="recipient-selector">
      {/* Skupiny */}
      <div className="recipient-section">
        <div className="section-label">Skupiny:</div>
        <div className="recipient-chips">
          {FAMILY_GROUPS.map((group) => (
            <button
              key={group.id}
              className={`recipient-chip group ${
                isGroupSelected(group.id) ? 'selected' : ''
              }`}
              onClick={() => toggleGroup(group.id)}
            >
              <span className="chip-icon">{group.icon}</span>
              <span className="chip-name">{group.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Jednotliví členové */}
      <div className="recipient-section">
        <div className="section-label">Jednotlivci:</div>
        <div className="recipient-chips">
          {familyMembers.map((member: FamilyMember) => (
            <button
              key={member.id}
              className={`recipient-chip individual ${
                selectedRecipients.includes(member.id) ? 'selected' : ''
              }`}
              onClick={() => toggleRecipient(member.id)}
            >
              <span className="chip-icon">{member.emoji}</span>
              <span className="chip-name">{member.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipientSelector;
