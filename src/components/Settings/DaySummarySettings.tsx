// src/components/Settings/DaySummarySettings.tsx
// Admin přehled „Souhrnu dne" — dynamický seznam VŠECH členů rodiny.
// Admin u každého zvlášť zapíná/vypíná a nastavuje čas. Výchozí stav = zapnuto.
// Self-contained: vlastní subscribe na familyMembers, ukládá na familyMembers/{id}.daySummary.

import React, { useEffect, useState } from 'react';
import { firestoreService } from '../../services/firestoreService';
import type { FamilyMember } from '../../types';
import ToggleSwitch from './ToggleSwitch';

const DEFAULT_TIME = '07:00';

const DaySummarySettings: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    firestoreService
      .subscribeToFamilyMembers((list) => {
        setMembers(list);
        setLoading(false);
      })
      .then((u) => {
        unsub = u;
      })
      .catch((e) => {
        console.error('[DaySummary] subscribe error:', e);
        setLoading(false);
      });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleToggle = (member: FamilyMember, val: boolean) => {
    firestoreService
      .setMemberDaySummary(member.id, { enabled: val })
      .catch((e) => console.error('[DaySummary] save error:', e));
  };

  const handleTime = (member: FamilyMember, val: string) => {
    if (!val) return;
    firestoreService
      .setMemberDaySummary(member.id, { time: val })
      .catch((e) => console.error('[DaySummary] save error:', e));
  };

  if (loading) return null;

  return (
    <div className="widget-group">
      <h3>☀️ Souhrn dne — členové</h3>
      <p className="setting-description">
        Zapni/vypni denní souhrn a nastav čas pro každého člena zvlášť. Výchozí stav je
        zapnuto. Souhrn obsahuje označené svátky, narozeniny v rodině, dnešní události a
        osobní úkoly z nástěnky. Chodí jen členům s přihlášením a povolenými notifikacemi.
      </p>

      {members.length === 0 && (
        <p className="setting-description">Zatím nejsou žádní členové rodiny.</p>
      )}

      {members.map((member) => {
        const enabled = member.daySummary?.enabled !== false; // výchozí = zapnuto
        const time = member.daySummary?.time || DEFAULT_TIME;
        const hasAccount = !!member.authUid;

        return (
          <div
            key={member.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              padding: '10px 0',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <span style={{ minWidth: 140, fontWeight: 600 }}>
              {member.emoji || '👤'} {member.name}
            </span>

            <ToggleSwitch
              label={enabled ? 'Zapnuto' : 'Vypnuto'}
              checked={enabled}
              onChange={(val) => handleToggle(member, val)}
            />

            {enabled && (
              <input
                type="time"
                value={time}
                onChange={(e) => handleTime(member, e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #ccc',
                }}
              />
            )}

            {!hasAccount && (
              <span style={{ color: '#e67e22', fontSize: '0.85rem' }}>
                ⚠️ bez přihlášení — notifikace nedostane
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DaySummarySettings;
