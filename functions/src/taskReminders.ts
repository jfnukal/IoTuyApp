// /functions/src/taskReminders.ts
// Opakované připomínání NESPLNĚNÝCH úkolů (sticky notes) — bez nového widgetu.
// Když má člen otevřené úkoly a uplynul jeho interval, pošle se připomenutí push.
// Config je na členovi: familyMembers/{memberId}.taskReminder {enabled,intervalValue,intervalUnit,lastRemindedAt}.
// Interval per člen, max 4 týdny. Výchozí VYPNUTO (připomínání je otravnější než souhrn).

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const MAX_INTERVAL_MS = 28 * 24 * 60 * 60 * 1000; // 4 týdny

interface TaskReminderCfg {
  enabled?: boolean;
  intervalValue?: number;
  intervalUnit?: 'minutes' | 'hours' | 'days';
  maxRepeats?: number; // 0/undefined = neomezeně
  lastRemindedAt?: number;
  repeatCount?: number;
}

function intervalToMs(cfg: TaskReminderCfg): number | null {
  const v = cfg.intervalValue;
  const u = cfg.intervalUnit;
  if (!v || v <= 0 || !u) return null;
  const unitMs = u === 'minutes' ? 60_000 : u === 'hours' ? 3_600_000 : 86_400_000;
  return Math.min(v * unitMs, MAX_INTERVAL_MS);
}

function pluralUkol(n: number): string {
  if (n === 1) return 'nesplněný úkol';
  if (n >= 2 && n <= 4) return 'nesplněné úkoly';
  return 'nesplněných úkolů';
}

export const taskReminders = functions
  .region('europe-west1')
  .runWith({ memory: '256MB', timeoutSeconds: 300 })
  .pubsub.schedule('every 5 minutes')
  .timeZone('Europe/Prague')
  .onRun(async () => {
    const db = admin.firestore();
    const now = Date.now();

    const membersSnap = await db.collection('familyMembers').get();

    let sent = 0;
    for (const memberDoc of membersSnap.docs) {
      const member = memberDoc.data();
      const cfg = (member.taskReminder || {}) as TaskReminderCfg;

      if (cfg.enabled !== true) continue; // výchozí vypnuto
      if (!member.authUid || !member.name) continue;

      const ms = intervalToMs(cfg);
      if (ms === null) continue;

      // Otevřené úkoly = sticky notes adresované tomuto členovi (mazání = splněno).
      const notesSnap = await db
        .collection('stickyNotes')
        .where('author', '==', member.name)
        .get();

      if (notesSnap.empty) {
        // Nemá úkoly → vynuluj baseline i počítadlo, ať nová dávka úkolů startuje čistě.
        if (cfg.lastRemindedAt != null || cfg.repeatCount != null) {
          await memberDoc.ref.update({
            'taskReminder.lastRemindedAt': admin.firestore.FieldValue.delete(),
            'taskReminder.repeatCount': admin.firestore.FieldValue.delete(),
          });
        }
        continue;
      }

      // Reference = poslední připomenutí, nebo stáří nejstaršího úkolu (aby první nag přišel po intervalu).
      const oldest = Math.min(
        ...notesSnap.docs.map((d) => Number(d.data().timestamp) || now)
      );
      const reference = cfg.lastRemindedAt ?? oldest;
      if (now - reference < ms) continue;

      // Strop opakování (0/undefined = neomezeně). Když je dosažen, dál nepřipomínáme.
      const maxRepeats = cfg.maxRepeats;
      const repeatCount = cfg.repeatCount ?? 0;
      if (maxRepeats && maxRepeats > 0 && repeatCount >= maxRepeats) continue;

      // Tokeny členových zařízení.
      const userSettingsSnap = await db.collection('userSettings').doc(member.authUid).get();
      const tokens: string[] = userSettingsSnap.data()?.fcmTokens || [];
      if (tokens.length === 0) continue; // bez zařízení nemáme kam poslat; zkusí se příště

      const count = notesSnap.size;
      const firstContent = String(notesSnap.docs[0].data().content || '').slice(0, 60);
      const body =
        count === 1 && firstContent
          ? `Nezapomeň: ${firstContent}`
          : `Máš ${count} ${pluralUkol(count)}.`;

      const messageId = `taskreminder-${memberDoc.id}-${now}`;
      const messages = tokens.map((token) => ({
        data: {
          type: 'task_reminder',
          title: '🔁 Připomínka úkolů',
          body,
          messageId,
          timestamp: now.toString(),
        },
        token,
      }));

      try {
        const response = await admin.messaging().sendEach(messages);
        sent += response.successCount;
        if (response.failureCount > 0) {
          console.warn(`⚠️ Připomínka úkolů pro ${member.name}: selhalo ${response.failureCount}`);
        }
      } catch (err) {
        console.error(`❌ Připomínka úkolů pro ${member.name} selhala:`, err);
      }

      await memberDoc.ref.update({
        'taskReminder.lastRemindedAt': now,
        'taskReminder.repeatCount': repeatCount + 1,
      });
    }

    console.log(`✅ Připomínání úkolů: odesláno ${sent} notifikací`);
    return null;
  });
