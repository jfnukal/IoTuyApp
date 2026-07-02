// /functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
export { parseRecipeUrl } from './parseRecipeUrl';

// ✅ Inicializace Firebase Admin SDK
admin.initializeApp();

function calculateReminderTime(
  eventDate: string,
  reminderValue: number,
  reminderUnit: string,
  eventTime?: string
): number {
  const [year, monthNum, day] = eventDate.split('-').map(Number);
  const eventDateTime = new Date(year, monthNum - 1, day, 0, 0, 0, 0);

  if (eventTime && typeof eventTime === 'string') {
    const [hours, minutes] = eventTime.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
  } else {
    eventDateTime.setHours(8, 0, 0, 0);
  }

  // ✅ PRAGUE TIMEZONE: Automatická detekce letního/zimního času
  const eventMonth = eventDateTime.getMonth(); // 0-11
  // Letní čas v ČR: duben-říjen = UTC+2, listopad-březen = UTC+1
  const isSummerTime = eventMonth >= 3 && eventMonth <= 9;
  const pragueOffsetMinutes = isSummerTime ? -120 : -60;

  const serverOffsetMinutes = eventDateTime.getTimezoneOffset();
  const offsetDifference = pragueOffsetMinutes - -serverOffsetMinutes;
  eventDateTime.setMinutes(eventDateTime.getMinutes() + offsetDifference);

  const eventTimestamp = eventDateTime.getTime();

  let reminderTime: number;

  switch (reminderUnit) {
    case 'ontime':
      reminderTime = eventTimestamp;
      break;
    case 'minutes':
      reminderTime = eventTimestamp - reminderValue * 60 * 1000;
      break;
    case 'hours':
      reminderTime = eventTimestamp - reminderValue * 60 * 60 * 1000;
      break;
    case 'days':
      reminderTime = eventTimestamp - reminderValue * 24 * 60 * 60 * 1000;
      break;
    case 'weeks':
      reminderTime = eventTimestamp - reminderValue * 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      reminderTime = eventTimestamp;
  }

  return reminderTime;
}

async function sendPushNotification(
  db: admin.firestore.Firestore,
  familyMemberId: string | undefined,
  createdBy: string | undefined,
  title: string,
  body: string
): Promise<void> {
  try {
    let authUid: string | null = null;

    if (familyMemberId) {
      const memberDoc = await db
        .collection('familyMembers')
        .doc(familyMemberId)
        .get();
      if (memberDoc.exists) {
        authUid = memberDoc.data()?.authUid;
      }
    }

    if (!authUid && createdBy) {
      authUid = createdBy;
    }

    if (!authUid) {
      console.warn('⚠️ Nelze určit authUid');
      return;
    }

    const userSettingsDoc = await db
      .collection('userSettings')
      .doc(authUid)
      .get();
    const tokens = userSettingsDoc.data()?.fcmTokens || [];

    if (tokens.length === 0) {
      console.warn(`⚠️ Žádné FCM tokeny`);
      return;
    }

    // DATA-ONLY zpráva — browser neukáže notifikaci automaticky,
    // ukáže ji pouze service worker onBackgroundMessage (→ žádné duplikáty)
    const messageId = `reminder-${familyMemberId || createdBy}-${Date.now()}`;
    const messages = tokens.map((token: string) => ({
      data: {
        type: 'calendar_reminder',
        title,
        body,
        messageId,
        timestamp: Date.now().toString(),
      },
      token,
    }));

    const response = await admin.messaging().sendEach(messages);

    if (response.failureCount > 0) {
      console.warn(`⚠️ Selhalo: ${response.failureCount}`);
    }
  } catch (error) {
    console.error('❌ Chyba Push:', error);
  }
}

export const checkReminders = functions
  .region('europe-west1')
  .runWith({ memory: '256MB', timeoutSeconds: 540 })
  .pubsub.schedule('every 5 minutes')
  .timeZone('Europe/Prague')
  .onRun(async () => {

         new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });

    const now = Date.now();
    const db = admin.firestore();

    try {
      const eventsSnapshot = await db
        .collection('calendarEvents')
        .where('reminders', '!=', null)
        .get();

      let sent = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data();
        const reminders = event.reminders || [];
        const sentReminders = event.sentReminders || [];

        for (const reminder of reminders) {
          if (sentReminders.includes(reminder.id)) continue;

          const reminderTime = calculateReminderTime(
            event.date,
            reminder.value,
            reminder.unit,
            event.time
          );

          const timeWindow = 5 * 60 * 1000;

          if (now >= reminderTime && now < reminderTime + timeWindow) {

            const title = `Připomínka: ${event.title}`;
            const body = event.time
              ? `${event.date} v ${event.time}`
              : event.date;

            if (reminder.type === 'push' || reminder.type === 'both') {
              await sendPushNotification(
                db,
                event.familyMemberId,
                event.createdBy,
                title,
                body
              );
              sent++;
            }

            await eventDoc.ref.update({
              sentReminders: admin.firestore.FieldValue.arrayUnion(reminder.id),
            });
          }
        }
      }

      console.log(`✅ DONE: ${sent} odesláno`);
      return null;
    } catch (error) {
      console.error('❌ ERROR:', error);
      return null;
    }
  });

// ==================== TRIGGER: NOVÁ UDÁLOST ====================

export const onNewCalendarEvent = functions
  .region('europe-west1')
  .firestore.document('calendarEvents/{eventId}')
  .onCreate(
    async (
      snapshot: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext
    ) => {
      console.log('📅 Nová událost vytvořena:', context.params.eventId);

      const event = snapshot.data();
      if (!event) {
        return null;
      }

      // Přeskoč osobní události
      if (event.type === 'personal') {
        return null;
      }

      const db = admin.firestore();
      const authorId = event.createdBy;

      // Získej jméno autora
      let authorName = 'Někdo';
      if (authorId) {
        const membersSnapshot = await db
          .collection('familyMembers')
          .where('authUid', '==', authorId)
          .limit(1)
          .get();

        if (!membersSnapshot.empty) {
          authorName = membersSnapshot.docs[0].data().name || 'Někdo';
        }
      }

      // Získej všechny členy rodiny
      const allMembersSnapshot = await db.collection('familyMembers').get();

      let sentCount = 0;

      for (const memberDoc of allMembersSnapshot.docs) {
        const member = memberDoc.data();
        const memberAuthUid = member.authUid;

        // Přeskoč autora - ten notifikaci nedostane
        if (memberAuthUid === authorId) {
          console.log(`⏭️ Přeskakuji autora: ${member.name}`);
          continue;
        }

        // Získej FCM tokeny pro tohoto člena
        if (!memberAuthUid) {
          continue;
        }

        const userSettingsDoc = await db
          .collection('userSettings')
          .doc(memberAuthUid)
          .get();

        const tokens = userSettingsDoc.data()?.fcmTokens || [];

        if (tokens.length === 0) {
          console.log(`⚠️ Člen ${member.name} nemá FCM tokeny`);
          continue;
        }

        // Sestav notifikaci
        const title = '📅 Nová událost v kalendáři';
        // Přidej datum do textu notifikace
        const eventDateStr = event.time
          ? `${event.date} v ${event.time}`
          : event.date;
        const body = `${event.title} (${eventDateStr}) — přidal/a ${authorName}`;

        // DATA-ONLY zpráva — browser neukáže notifikaci automaticky.
        // Service worker onBackgroundMessage ji ukáže jednou.
        // Stabilní messageId zajistí, že OS deduplikuje případné duplikáty.
        const messageId = `cal-${context.params.eventId}-${memberDoc.id}`;
        const messages = tokens.map((token: string) => ({
          data: {
            type: 'new_calendar_event',
            title,
            body,
            messageId,
            eventId: context.params.eventId,
            timestamp: Date.now().toString(),
          },
          token,
        }));

        try {
          const response = await admin.messaging().sendEach(messages);
          sentCount += response.successCount;
          
          // Loguj jednotlivé chyby
          if (response.failureCount > 0) {
            response.responses.forEach((resp: any, idx: number) => {
              if (!resp.success) {
                console.error(`❌ Token ${idx} pro ${member.name} selhal:`, resp.error?.message);
              }
            });
          }
        } catch (error) {
          console.error(`❌ Chyba push pro ${member.name}:`, error);
        }
      }

      return null;
    }
  );

// ==================== TRIGGER: NOVÝ VZKAZ / ÚKOL (sticky note) ====================

export const onNewStickyNote = functions
  .region('europe-west1')
  .firestore.document('stickyNotes/{noteId}')
  .onCreate(
    async (
      snapshot: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext
    ) => {
      const note = snapshot.data();
      if (!note) return null;

      const db = admin.firestore();

      // Přepínač v nastavení (appSettings/main → widgets.stickyNotes.notifyOnNew)
      try {
        const settingsDoc = await db.collection('appSettings').doc('main').get();
        const notifyOnNew =
          settingsDoc.data()?.widgets?.stickyNotes?.notifyOnNew;
        if (notifyOnNew === false) {
          console.log('🔕 Notifikace vzkazů vypnuté v nastavení');
          return null;
        }
      } catch (err) {
        console.warn('⚠️ Nelze načíst nastavení, pokračuji s notifikací:', err);
      }

      // Komu je vzkaz určen = note.author (jméno člena rodiny)
      const targetName: string = note.author;
      if (!targetName) return null;

      const membersSnapshot = await db
        .collection('familyMembers')
        .where('name', '==', targetName)
        .limit(1)
        .get();

      if (membersSnapshot.empty) {
        console.log(`⚠️ Člen "${targetName}" nenalezen`);
        return null;
      }

      const authUid = membersSnapshot.docs[0].data().authUid;
      if (!authUid) {
        console.log(`⚠️ Člen "${targetName}" nemá authUid`);
        return null;
      }

      const userSettingsDoc = await db.collection('userSettings').doc(authUid).get();
      const tokens = userSettingsDoc.data()?.fcmTokens || [];
      if (tokens.length === 0) {
        console.log(`⚠️ "${targetName}" nemá FCM tokeny`);
        return null;
      }

      const title = '📝 Nový vzkaz pro tebe';
      const body =
        (note.content || '').length > 80
          ? `${note.content.substring(0, 80)}…`
          : note.content || 'Máš nový vzkaz.';

      const messageId = `note-${context.params.noteId}`;
      const messages = tokens.map((token: string) => ({
        data: {
          type: 'new_sticky_note',
          title,
          body,
          messageId,
          noteId: context.params.noteId,
          timestamp: Date.now().toString(),
        },
        token,
      }));

      try {
        const response = await admin.messaging().sendEach(messages);
        console.log(`✅ Vzkaz pro "${targetName}": odesláno ${response.successCount}`);
      } catch (error) {
        console.error(`❌ Chyba push vzkazu pro "${targetName}":`, error);
      }

      return null;
    }
  );
