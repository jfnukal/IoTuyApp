// /functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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

    const messages = tokens.map((token: string) => ({
      notification: {
        title,
        body,
      },
      data: {
        type: 'calendar_reminder',
        timestamp: Date.now().toString(),
      },
      token,
    }));

    const response = await admin.messaging().sendEach(messages);
    console.log(`✅ Push odeslány: ${response.successCount}/${tokens.length}`);

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
    console.log('🔔 START');
    console.log(
      '🕐 Prague:',
      new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })
    );

    const now = Date.now();
    const db = admin.firestore();

    try {
      const eventsSnapshot = await db
        .collection('calendarEvents')
        .where('reminders', '!=', null)
        .get();

      console.log(`📋 Události: ${eventsSnapshot.size}`);

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
            console.log(`🎯 TRIGGER: ${event.title}`);

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
        console.log('⚠️ Prázdná data události');
        return null;
      }

      // Přeskoč osobní události
      if (event.type === 'personal') {
        console.log('⏭️ Osobní událost - přeskakuji notifikace');
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
          console.log(`⚠️ Člen ${member.name} nemá authUid`);
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
        const title = '📅 Nová událost';
        const body = `${event.title} - přidal/a ${authorName}`;

        const messages = tokens.map((token: string) => ({
          notification: {
            title,
            body,
          },
          webpush: {
            notification: {
              icon: '/icon-192x192.png',
            },
          },
          data: {
            type: 'new_calendar_event',
            eventId: context.params.eventId,
            timestamp: Date.now().toString(),
          },
          token,
        }));

        try {
          const response = await admin.messaging().sendEach(messages);
          console.log(`✅ Push pro ${member.name}: ${response.successCount}/${tokens.length}`);
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

      console.log(`✅ Celkem odesláno: ${sentCount} notifikací`);
      return null;
    }
  );
