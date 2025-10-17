// functions/src/checkReminders.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Pomocná funkce pro výpočet času připomínky
function calculateReminderTime(
  eventDate: string,
  eventTime: string | undefined,
  reminderValue: number,
  reminderUnit: string
): number {
  // Vytvoř datum události
  const eventDateTime = new Date(eventDate + 'T00:00:00Z');
  
  if (eventTime) {
    const [hours, minutes] = eventTime.split(':').map(Number);
    eventDateTime.setUTCHours(hours, minutes, 0, 0);
  } else {
    // Celodenní událost - připomínka v 8:00 UTC (10:00 Prague)
    eventDateTime.setUTCHours(8, 0, 0, 0);
  }
  
  const eventTimestamp = eventDateTime.getTime();
  
  // Výpočet času připomínky
  switch (reminderUnit) {
    case 'ontime':
      return eventTimestamp;
    case 'minutes':
      return eventTimestamp - (reminderValue * 60 * 1000);
    case 'hours':
      return eventTimestamp - (reminderValue * 60 * 60 * 1000);
    case 'days':
      return eventTimestamp - (reminderValue * 24 * 60 * 60 * 1000);
    case 'weeks':
      return eventTimestamp - (reminderValue * 7 * 24 * 60 * 60 * 1000);
    default:
      return eventTimestamp;
  }
}

// Pomocná funkce pro odeslání Push notifikace
async function sendPushNotification(
  db: admin.firestore.Firestore,
  familyMemberId: string | undefined,
  createdBy: string | undefined,
  title: string,
  body: string
    ): Promise<void> {
      try {
        // Najdi authUid podle familyMemberId nebo createdBy
        let authUid: string | null = null;

        if (familyMemberId) {
          const memberDoc = await db.collection('familyMembers').doc(familyMemberId).get();
          if (memberDoc.exists) {
            authUid = memberDoc.data()?.authUid;
          }
        }

        // Fallback na createdBy
        if (!authUid && createdBy) {
          authUid = createdBy;
        }

        if (!authUid) {
          console.warn('⚠️ Nelze určit authUid pro odeslání notifikace');
          return;
        }

        // Najdi FCM tokeny
        const userSettingsDoc = await db.collection('userSettings').doc(authUid).get();
        const tokens = userSettingsDoc.data()?.fcmTokens || [];

        if (tokens.length === 0) {
          console.warn(`⚠️ Žádné FCM tokeny pro uživatele ${authUid}`);
          return;
        }

        // Odešli notifikaci
        const messages = tokens.map((token: string) => ({
          notification: {
            title,
            body,
            icon: '/icon-192x192.png',
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
        }
      } catch (error) {
        console.error('❌ Chyba při odesílání Push notifikace:', error);
      }
    }

    // Hlavní Cloud Function
    export const checkReminders = functions
      .region('europe-west1')
      .runWith({ memory: '256MB', timeoutSeconds: 540 })
      .pubsub.schedule('every 5 minutes')
      .timeZone('Europe/Prague')
      .onRun(async () => {
        console.log('🔔 Spouštím kontrolu připomínek...');
        
        const now = Date.now();
        const db = admin.firestore();

        try {
          // Načti všechny události s připomínkami
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

              // Přeskoč už odeslané
              if (sentReminders.includes(reminder.id)) {
                continue;
              }

              // Vypočítej čas připomínky
              const reminderTime = calculateReminderTime(
                event.date,
                reminder.value,
                reminder.unit,
                event.time  // Optional parametr na konci
              );

              // Okno 5 minut (protože funkce běží každých 5 minut)
              const timeWindow = 5 * 60 * 1000;

              // Pokud je čas připomínky v okně, odešli notifikaci
              if (now >= reminderTime && now < reminderTime + timeWindow) {
                console.log(`⏰ Čas pro připomínku: ${event.title} (${reminder.value} ${reminder.unit})`);

                const title = `Připomínka: ${event.title}`;
                const body = event.time 
                  ? `${event.date} v ${event.time}`
                  : event.date;

                // Odešli podle typu
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

                if (reminder.type === 'email' || reminder.type === 'both') {
                  // TODO: Implementovat email
                  console.log('📧 Email notifikace zatím není implementován');
                }

                // Označ jako odeslanou
                await eventDoc.ref.update({
                  sentReminders: admin.firestore.FieldValue.arrayUnion(reminder.id),
                });

                console.log(`✅ Připomínka odeslána a označena: ${reminder.id}`);
              }
            }
          }

          console.log(`✅ Kontrola dokončena: ${processedCount} připomínek zkontrolováno, ${sentCount} odesláno`);
          return null;
        } catch (error) {
          console.error('❌ Chyba při kontrole připomínek:', error);
          return null;
        }
      });
