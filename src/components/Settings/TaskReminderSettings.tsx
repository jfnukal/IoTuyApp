// src/components/Settings/TaskReminderSettings.tsx
// Admin přehled „Připomínání úkolů" — dynamický seznam členů rodiny.
// Nesplněný (nesmazaný) úkol/vzkaz se v nastaveném intervalu připomene push notifikací.
// Interval per člen (minuty/hodiny/dny, max 4 týdny). Výchozí VYPNUTO.
// Self-contained: vlastní subscribe na familyMembers, ukládá na familyMembers/{id}.taskReminder.

import React, { useEffect, useState } from 'react';
import { firestoreService } from '../../services/firestoreService';
import type { FamilyMember, TaskReminderUnit } from '../../types';
import ToggleSwitch from './ToggleSwitch';

// Maximální hodnota podle jednotky, aby celkový interval nepřesáhl 4 týdny (28 dní).
const MAX_BY_UNIT: Record<TaskReminderUnit, number> = {
  minutes: 28 * 24 * 60, // 40320
  hours: 28 * 24, // 672
  days: 28,
};

const UNIT_LABEL: Record<TaskReminderUnit, string> = {
  minutes: 'minut',
  hours: 'hodin',
  days: 'dní',
};

const TaskReminderSettings: React.FC = () => {
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
        console.error('[TaskReminder] subscribe error:', e);
        setLoading(false);
      });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const save = (
    member: FamilyMember,
    patch: {
      enabled?: boolean;
      intervalValue?: number;
      intervalUnit?: TaskReminderUnit;
      maxRepeats?: number;
    }
  ) => {
    firestoreService
      .setMemberTaskReminder(member.id, patch)
      .catch((e) => console.error('[TaskReminder] save error:', e));
  };

  if (loading) return null;

  return (
    <div className="widget-group">
      <h3>🔁 Připomínání úkolů — členové</h3>
      <p className="setting-description">
        Když má člen nesplněný vzkaz/úkol (na nástěnce), v nastaveném intervalu mu přijde
        připomenutí. Interval i max. počet opakování nastav pro každého zvlášť (interval max
        4 týdny). <strong>Max. opakování: 0 = neomezeně</strong> (jinak po tolika připomenutích
        přestane; počítadlo se vynuluje, jakmile jsou všechny úkoly splněné). Výchozí je vypnuto.
        Připomínání běží po pětiminutových krocích, takže velmi krátké intervaly jsou
        orientační. Funguje jen členům s přihlášením a povolenými notifikacemi.
      </p>

      {members.length === 0 && (
        <p className="setting-description">Zatím nejsou žádní členové rodiny.</p>
      )}

      {members.map((member) => {
        const cfg = member.taskReminder;
        const enabled = cfg?.enabled === true; // výchozí = vypnuto
        const unit: TaskReminderUnit = cfg?.intervalUnit || 'days';
        const value = cfg?.intervalValue ?? 1;
        const maxRepeats = cfg?.maxRepeats ?? 0; // 0 = neomezeně
        const hasAccount = !!member.authUid;

        const handleValue = (raw: string) => {
          let v = Math.round(Number(raw));
          if (!Number.isFinite(v) || v < 1) v = 1;
          if (v > MAX_BY_UNIT[unit]) v = MAX_BY_UNIT[unit];
          save(member, { intervalValue: v });
        };

        const handleMaxRepeats = (raw: string) => {
          let v = Math.round(Number(raw));
          if (!Number.isFinite(v) || v < 0) v = 0;
          if (v > 999) v = 999;
          save(member, { maxRepeats: v });
        };

        const handleUnit = (newUnit: TaskReminderUnit) => {
          // Po změně jednotky ořízni hodnotu na nové maximum.
          const clamped = Math.min(value, MAX_BY_UNIT[newUnit]);
          save(member, { intervalUnit: newUnit, intervalValue: clamped });
        };

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
              onChange={(val) =>
                save(member, {
                  enabled: val,
                  // při prvním zapnutí nastav rozumný výchozí interval
                  ...(val && !cfg?.intervalValue
                    ? { intervalValue: 1, intervalUnit: 'days' as TaskReminderUnit }
                    : {}),
                })
              }
            />

            {enabled && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>každých</span>
                <input
                  type="number"
                  min={1}
                  max={MAX_BY_UNIT[unit]}
                  value={value}
                  onChange={(e) => handleValue(e.target.value)}
                  style={{
                    width: 80,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #ccc',
                  }}
                />
                <select
                  value={unit}
                  onChange={(e) => handleUnit(e.target.value as TaskReminderUnit)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #ccc',
                  }}
                >
                  <option value="minutes">{UNIT_LABEL.minutes}</option>
                  <option value="hours">{UNIT_LABEL.hours}</option>
                  <option value="days">{UNIT_LABEL.days}</option>
                </select>

                <span style={{ marginLeft: 6 }}>, max</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={maxRepeats}
                  onChange={(e) => handleMaxRepeats(e.target.value)}
                  title="0 = neomezeně"
                  style={{
                    width: 70,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #ccc',
                  }}
                />
                <span title="0 = neomezeně">
                  × {maxRepeats === 0 ? '(neomezeně)' : ''}
                </span>
              </span>
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

export default TaskReminderSettings;
