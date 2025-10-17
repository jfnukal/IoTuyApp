// /functions/src/checkReminders.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

function calculateReminderTime(
  eventDate: string,
  reminderValue: number,
  reminderUnit: string,
  eventTime?: string
): number {
  console.log('🔍 calculateReminderTime called with:', {
    eventDate,
    reminderValue,
    reminderUnit,
    eventTime,
  });

  // ✅ OPRAVA: Vytvoř datum jako UTC string a pak parsuj
  let dateTimeString = `${eventDate}T`;

  if (eventTime && typeof eventTime === 'string') {
    dateTimeString += `${eventTime}:00`;
  } else {
    dateTimeString += '08:00:00';
  }

  // Přidej timezone offset pro Prague (UTC+1 nebo UTC+2)
  // Zjednodušeně: Europe/Prague je UTC+1 v zimě, UTC+2 v létě
  // Pro přesnost bychom potřebovali moment-timezone, ale zjednodušíme to
  const eventDateTime = new Date(dateTimeString);

  // Získej offset serveru (který je v UTC)
  const serverOffset = eventDateTime.getTimezoneOffset(); // v minutách

  // Europe/Prague je UTC+1 (zimní čas) nebo UTC+2 (letní čas)
  // Zjistíme, jestli je letní čas pro dané datum
  const pragueOffset = -120; // UTC+2 (letní čas) - v minutách

  // Přidej rozdíl mezi Prague a serverem
  const offsetDifference = pragueOffset - -serverOffset;
  eventDateTime.setMinutes(eventDateTime.getMinutes() + offsetDifference);

  const eventTimestamp = eventDateTime.getTime();

  console.log('📅 Event timestamp:', {
    dateTimeString,
    eventDateTime: eventDateTime.toISOString(),
    eventTimestamp,
    currentTime: Date.now(),
    pragueOffset,
    serverOffset,
    offsetDifference,
  });

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

  console.log('⏰ Reminder time:', {
    reminderTime,
    reminderDateTime: new Date(reminderTime).toISOString(),
    shouldTriggerNow:
      Date.now() >= reminderTime && Date.now() < reminderTime + 5 * 60 * 1000,
  });

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

    console.log('👤 Hledám authUid pro:', { familyMemberId, createdBy });

    if (familyMemberId) {
      const memberDoc = await db
        .collection('familyMembers')
        .doc(familyMemberId)
        .get();
      if (memberDoc.exists) {
        authUid = memberDoc.data()?.authUid;
        console.log('✅ Nalezen authUid z familyMemberId:', authUid);
      }
    }

    if (!authUid && createdBy) {
      authUid = createdBy;
      console.log('✅ Použit authUid z createdBy:', authUid);
    }

    if (!authUid) {
      console.warn('⚠️ Nelze určit authUid pro odeslání notifikace');
      return;
    }

    const userSettingsDoc = await db
      .collection('userSettings')
      .doc(authUid)
      .get();
    const tokens = userSettingsDoc.data()?.fcmTokens || [];

    console.log('🔑 FCM tokeny:', { count: tokens.length, authUid });

    if (tokens.length === 0) {
      console.warn(`⚠️ Žádné FCM tokeny pro uživatele ${authUid}`);
      return;
    }

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

    console.log('📤 Odesílám push notifikace...', {
      messageCount: messages.length,
    });

    const response = await admin.messaging().sendEach(messages);
    console.log(
      `✅ Push notifikace odeslány: ${response.successCount}/${tokens.length}`
    );

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
    console.log('🕐 Aktuální čas (UTC):', new Date().toISOString());
    console.log(
      '🕐 Aktuální čas (Prague):',
      new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })
    );

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

        console.log('📅 Zpracovávám událost:', {
          id: eventDoc.id,
          title: event.title,
          date: event.date,
          time: event.time,
          familyMemberId: event.familyMemberId,
          createdBy: event.createdBy,
        });

        const reminders = event.reminders || [];
        const sentReminders = event.sentReminders || [];

        for (const reminder of reminders) {
          processedCount++;

          if (sentReminders.includes(reminder.id)) {
            console.log(
              `⏭️ Přeskakuji již odeslanou připomínku: ${reminder.id}`
            );
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
            console.log(
              `🎯 ČAS PRO PŘIPOMÍNKU: ${event.title} (${reminder.value} ${reminder.unit})`
            );

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

            console.log(`✅ Připomínka odeslána a označena: ${reminder.id}`);
          } else {
            const minutesUntil = Math.round((reminderTime - now) / 60000);
            console.log(
              `⏸️ Ještě není čas pro připomínku (${minutesUntil} minut)`
            );
          }
        }
      }

      console.log(
        `✅ Kontrola dokončena: ${processedCount} připomínek zkontrolováno, ${sentCount} odesláno`
      );
      return null;
    } catch (error) {
      console.error('❌ Chyba při kontrole připomínek:', error);
      return null;
    }
  });
