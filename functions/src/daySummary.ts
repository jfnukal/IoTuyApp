// /functions/src/daySummary.ts
// „Souhrn dne" — denní push notifikace v čas nastavený adminem pro každého člena.
// Obsah: označené svátky + narozeniny v rodině + dnešní události + osobní úkoly.
// Config je na členovi: familyMembers/{memberId}.daySummary {enabled,time,lastSentDate}.
// VÝCHOZÍ STAV = ZAPNUTO (chybějící config → enabled, čas 07:00).

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getNameDay } from 'namedays-cs';

// Kolik minut po nastaveném čase ještě smíme souhrn poslat (tolerance výpadku scheduleru).
const GRACE_MINUTES = 60;
// Výchozí čas, když admin žádný nenastavil.
const DEFAULT_TIME = '07:00';

interface DaySummaryCfg {
  enabled?: boolean;
  time?: string; // "HH:MM"
  lastSentDate?: string; // "YYYY-MM-DD"
}

// Rozloží aktuální okamžik na části v pražském čase (řeší letní/zimní čas).
function pragueParts(now: Date) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(now)) p[part.type] = part.value;
  // Intl vrací hodinu 24 o půlnoci v některých enginech → normalizuj na 00.
  const hour = Number(p.hour) % 24;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    dateStr: `${p.year}-${p.month}-${p.day}`, // YYYY-MM-DD
    mmdd: `${p.month}-${p.day}`, // MM-DD
    minutes: hour * 60 + Number(p.minute),
  };
}

function parseTimeToMinutes(t: string | undefined): number | null {
  if (!t || typeof t !== 'string') return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Vytáhne MM-DD z narozenin (podporuje 'YYYY-MM-DD' i jiný Date-parsovatelný formát).
function birthdayMMDD(birthday: string): string | null {
  const iso = birthday.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}-${iso[3]}`;
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function pluralUkol(n: number): string {
  if (n === 1) return 'úkol';
  if (n >= 2 && n <= 4) return 'úkoly';
  return 'úkolů';
}

export const daySummary = functions
  .region('europe-west1')
  .runWith({ memory: '256MB', timeoutSeconds: 300 })
  .pubsub.schedule('every 5 minutes')
  .timeZone('Europe/Prague')
  .onRun(async () => {
    const db = admin.firestore();
    const now = pragueParts(new Date());

    // Config Souhrnu dne je na členovi (familyMembers/{id}.daySummary), nastavuje admin.
    const membersSnap = await db.collection('familyMembers').get();
    const members = membersSnap.docs.map((d) => ({
      id: d.id,
      ref: d.ref,
      ...(d.data() as any),
    }));

    // Kdo je "na řadě" teď: VÝCHOZÍ zapnuto (jen enabled===false vypíná), má účet, nastal čas, dnes ještě neodesláno.
    const dueMembers = members.filter((m) => {
      if (!m.authUid) return false; // bez účtu nemá kam poslat
      const cfg = (m.daySummary || {}) as DaySummaryCfg;
      if (cfg.enabled === false) return false;
      const sched = parseTimeToMinutes(cfg.time || DEFAULT_TIME);
      if (sched === null) return false;
      if (cfg.lastSentDate === now.dateStr) return false; // dnes už odesláno
      // Pošli, jakmile nastal čas, ale jen v toleranci (ať pozdní zapnutí nespustí souhrn v divný čas).
      return now.minutes >= sched && now.minutes < sched + GRACE_MINUTES;
    });

    if (dueMembers.length === 0) return null;

    // --- Sdílená data pro dnešek (spočítej jednou) ---
    // Jméno(a) svátku pro dnešek (poledne UTC → getNameDay čte měsíc/den bez posunu).
    const noon = new Date(Date.UTC(now.year, now.month - 1, now.day, 12, 0, 0));
    const todaysNames: string[] = getNameDay(noon) || [];

    const birthdayNames = members
      .filter((m) => m.birthday && birthdayMMDD(String(m.birthday)) === now.mmdd)
      .map((m) => m.name as string)
      .filter(Boolean);

    const eventsSnap = await db
      .collection('calendarEvents')
      .where('date', '==', now.dateStr)
      .get();
    const eventTitles = eventsSnap.docs
      .map((d) => d.data())
      .filter((e) => e.type !== 'personal') // osobní události nejsou pro sdílený souhrn
      .map((e) => e.title as string)
      .filter(Boolean);

    let sent = 0;
    for (const member of dueMembers) {
      const authUid = member.authUid as string;

      // Tokeny členových zařízení z userSettings/{authUid}.
      const userSettingsSnap = await db.collection('userSettings').doc(authUid).get();
      const tokens: string[] = userSettingsSnap.data()?.fcmTokens || [];
      if (tokens.length === 0) continue; // bez zařízení nemáme kam poslat; zkusí se příště

      // Označené svátky (per-uživatel) — porovnáváme podle MM-DD (nezávisle na roce).
      let namedayPart = '';
      if (todaysNames.length > 0) {
        const prefSnap = await db.collection('namedayPreferences').doc(authUid).get();
        const marked: string[] = prefSnap.data()?.markedDates || [];
        const markedMMDD = new Set(marked.map((d) => (d || '').slice(5))); // YYYY-MM-DD → MM-DD
        if (markedMMDD.has(now.mmdd)) {
          namedayPart = `Svátek: ${todaysNames.join(', ')}`;
        }
      }

      // Osobní úkoly = sticky notes adresované tomuto členovi (podle jména).
      let tasksPart = '';
      if (member.name) {
        const notesSnap = await db
          .collection('stickyNotes')
          .where('author', '==', member.name)
          .get();
        if (notesSnap.size > 0) {
          tasksPart = `📝 ${notesSnap.size} ${pluralUkol(notesSnap.size)}`;
        }
      }

      const parts: string[] = [];
      if (namedayPart) parts.push(namedayPart);
      if (birthdayNames.length > 0) parts.push(`🎂 ${birthdayNames.join(', ')}`);
      if (eventTitles.length > 0) parts.push(`📅 ${eventTitles.slice(0, 3).join(', ')}`);
      if (tasksPart) parts.push(tasksPart);

      const body =
        parts.length > 0
          ? parts.join(' · ')
          : 'Dnes tě nic zvláštního nečeká 🙂 Hezký den!';

      // DATA-ONLY zpráva — zobrazí ji service worker; stabilní messageId brání duplikátům.
      const messageId = `daysummary-${authUid}-${now.dateStr}`;
      const messages = tokens.map((token) => ({
        data: {
          type: 'day_summary',
          title: '☀️ Souhrn dne',
          body,
          messageId,
          timestamp: Date.now().toString(),
        },
        token,
      }));

      try {
        const response = await admin.messaging().sendEach(messages);
        sent += response.successCount;
        if (response.failureCount > 0) {
          console.warn(`⚠️ Souhrn dne pro ${authUid}: selhalo ${response.failureCount}`);
        }
      } catch (err) {
        console.error(`❌ Souhrn dne pro ${authUid} selhal:`, err);
      }

      // Označ jako odesláno pro dnešek (i kdyby část tokenů selhala — jinak by chodil dokola).
      await member.ref.update({ 'daySummary.lastSentDate': now.dateStr });
    }

    console.log(`✅ Souhrn dne: odesláno ${sent} notifikací (${dueMembers.length} členů)`);
    return null;
  });
