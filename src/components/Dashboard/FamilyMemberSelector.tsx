// src/components/Dashboard/FamilyMemberSelector.tsx

import React, { useState } from 'react';
import { firestoreService } from '../../services/firestoreService';
import './styles/FamilyMemberSelector.css';

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

interface Props {
  userId: string;
  currentMemberId?: string;
  onSelect: (memberId: string) => void;
}

const FamilyMemberSelector: React.FC<Props> = ({ userId, currentMemberId, onSelect }) => {
  const [saving, setSaving] = useState(false);

  const handleSelect = async (memberId: string) => {
    setSaving(true);
    try {
      await firestoreService.updateUserSettings(userId, {
        familyMemberId: memberId,
      });
      onSelect(memberId);
    } catch (error) {
      console.error('Error saving family member:', error);
      alert('Nepodařilo se uložit');
    } finally {
      setSaving(false);
    }
  };

  if (currentMemberId) {
    return null; // Už je vybraný
  }

  return (
    <div className="family-member-selector-overlay">
      <div className="family-member-selector-modal">
        <h2>Kdo se přihlašuje?</h2>
        <p>Vyber svůj profil</p>
        
        <div className="member-options">
          {FAMILY_MEMBERS.map(member => (
            <button
              key={member.id}
              className="member-option"
              onClick={() => handleSelect(member.id)}
              disabled={saving}
            >
              <span className="member-emoji">{member.emoji}</span>
              <span className="member-name">{member.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FamilyMemberSelector;