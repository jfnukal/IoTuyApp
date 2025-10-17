// /functions/src/checkReminders.ts


import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

function calculateReminderTime(
  eventDate: string,
  reminderValue: number,
  reminderUnit: string,
  eventTime?: string
): number {
  // Parse date components
  const [year, month, day] = eventDate.split('-').map(Number);
  
  // Create date at midnight in local timezone
  const eventDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  // Set time if provided
  if (eventTime && typeof eventTime === 'string') {
    const [hours, minutes] = eventTime.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
  } else {
    eventDateTime.setHours(8, 0, 0, 0);
  }
  
  // ✅ OPRAVA: Adjust for Prague timezone (UTC+2 in summer, UTC+1 in winter)
  // Server runs in UTC, so we need to subtract 2 hours to get Prague time
  const pragueOffsetMinutes = -120; // UTC+2 (summer time)
  const serverOffsetMinutes = eventDateTime.getTimezoneOffset(); // 0 for UTC
  const offsetDifference = pragueOffsetMinutes - (-serverOffsetMinutes);
  
  eventDateTime.setMinutes(eventDateTime.getMinutes() + offsetDifference);
  
  const eventTimestamp = eventDateTime.getTime();
  
  let reminderTime: number;
  
  switch (reminderUnit) {
    case 'ontime':
      reminderTime = eventTimestamp;
      break;
    case 'minutes':
      reminderTime = eventTimestamp - (reminderValue * 60 * 1000);
      break;
    case 'hours':
      reminderTime = eventTimestamp - (reminderValue * 60 * 60 * 1000);
      break;
    case 'days':
      reminderTime = eventTimestamp - (reminderValue * 24 * 60 * 60 * 1000);
      break;
    case 'weeks':
      reminderTime = eventTimestamp - (reminderValue * 7 * 24 * 60 * 60 * 1000);
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
      const memberDoc = await db.collection('familyMembers').doc(familyMemberId).get();
      if (memberDoc.exists) {
        authUid = memberDoc.data()?.authUid;
      }
    }

    if (!authUid && createdBy) {
      authUid = createdBy;
    }

    if (!authUid) {
      console.warn('⚠️ Nelze určit authUid pro odeslání notifikace');
      return;
    }

    const userSettingsDoc = await db.collection('userSettings').doc(authUid).get();
    const tokens = userSettingsDoc.data()?.fcmTokens || [];

    if (tokens.length === 0) {
      console.warn(`⚠️ Žádné FCM tokeny pro uživatele ${authUid}`);
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
    console.log(`✅ Push notifikace odeslány: ${response.successCount}/${tokens.length}`);

    if (response.failureCount > 0) {
      console.warn(`⚠️ Některé notifikace selhaly: ${response.failureCount}`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Token ${idx} selhal:`, resp.error);
        }
      });
    }
  } catch (error) {
    console.error('❌ Chyba při odesílání Push notifikace:', error);
  }
}

export const checkReminders = functions
  .region('europe-west1')
  .runWith({ memory: '256MB', timeoutSeconds: 540 })
  .pubsub.schedule('every 5 minutes')
  .timeZone('Europe/Prague')
  .onRun(async () => {
    console.log('🔔 Spouštím kontrolu připomínek...');
    console.log('🕐 Prague čas:', new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }));
    
    const now = Date.now();
    const db = admin.firestore();

    try {
      const eventsSnapshot = await db
        .collection('calendarEvents')
        .where('reminders', '!=', null)
        .get();

      console.log(`📋 Nalezeno ${eventsSnapshot.size} událostí s připomínkami`);

      let processedCount = 0;
      let sentCount = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data();

        const reminders = event.reminders || [];
        const sentReminders = event.sentReminders || [];

        for (const reminder of reminders) {
          processedCount++;

          if (sentReminders.includes(reminder.id)) {
            continue;
          }

          const reminderTime = calculateReminderTime(
            event.date,
            reminder.value,
            reminder.unit,
            event.time
          );

          const timeWindow = 5 * 60 * 1000;

          if (now >= reminderTime && now < reminderTime + timeWindow) {
            console.log(`🎯 ČAS PRO PŘIPOMÍNKU: ${event.title}`);

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
              sentCount++;
            }

            await eventDoc.ref.update({
              sentReminders: admin.firestore.FieldValue.arrayUnion(reminder.id),
            });

            console.log(`✅ Připomínka odeslána`);
          }
        }
      }

      console.log(`✅ Kontrola dokončena: ${processedCount} připomínek, ${sentCount} odesláno`);
      return null;
    } catch (error) {
      console.error('❌ Chyba při kontrole připomínek:', error);
      return null;
    }
  });
