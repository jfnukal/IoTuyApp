import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { bakalariAPI } from '../../src/api/bakalariAPI';

// Inicializace Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// ================================================================= //
// FUNKCE 1: Aktualizace rozvrhu (zůstává beze změny)
// ================================================================= //
export const updateBakalariTimetable = functions
  .region('europe-west1')
  .pubsub.schedule('0 17 * * 1-5')
  .timeZone('Europe/Prague')
  .onRun(async () => {
    console.log('Spouštím automatickou aktualizaci rozvrhu z Bakalářů.');
    try {
      const freshTimetable = await bakalariAPI.getTimetable();
      if (!freshTimetable || freshTimetable.length === 0) {
        console.warn('Nepodařilo se načíst nový rozvrh, žádná data k zápisu.');
        return null;
      }
      const scheduleRef = db.collection('schedules').doc('johanka');
      await scheduleRef.set({
        days: freshTimetable,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(
        '✅ Rozvrh pro Johanku byl úspěšně aktualizován v Firestore.'
      );
      return null;
    } catch (error) {
      console.error('❌ Došlo k chybě při aktualizaci rozvrhu:', error);
      return null;
    }
  });

// ================================================================= //
// FUNKCE 2: Odeslání Push notifikace při nové zprávě
// ================================================================= //
export const sendPushOnNewMessage = functions
  .region('europe-west1')
  .firestore.document('familyMessages/{messageId}')
  .onCreate(
    async (
      snapshot: admin.firestore.QueryDocumentSnapshot,
      context: functions.EventContext<Record<string, string>>
    ) => {
      console.log(`Zpracovávám zprávu s ID: ${context.params.messageId}`);

      const messageData = snapshot.data();
      if (!messageData) {
        console.log('Nová zpráva nemá žádná data.');
        return;
      }

      const recipientsIds = messageData.recipients.filter(
        (id: string) => id !== messageData.senderId
      );

      if (recipientsIds.length === 0) {
        console.log('Žádní příjemci k odeslání notifikace.');
        return;
      }

      const authUidPromises = recipientsIds.map(async (memberId: string) => {
        const memberDoc = await db
          .collection('familyMembers')
          .doc(memberId)
          .get();

        if (memberDoc.exists) {
          return memberDoc.data()?.authUid;
        }
        console.warn(
          `Člen s id "${memberId}" nenalezen v kolekci familyMembers.`
        );
        return null;
      });

      const authUids = (await Promise.all(authUidPromises)).filter(
        (uid: string | null): uid is string => uid !== null
      );

      if (authUids.length === 0) {
        console.warn('⚠️ Žádné authUid nalezeny pro příjemce', recipientsIds);
        return;
      }
      console.log(
        `Nalezeno ${authUids.length} authUid pro příjemce:`,
        authUids
      );

      const userSettingsPromises = authUids.map((uid: string) =>
        db.collection('userSettings').doc(uid).get()
      );

      const userSettingsResults = await Promise.all(userSettingsPromises);

      const allTokens = userSettingsResults
        .flatMap((doc: admin.firestore.DocumentSnapshot) =>
          doc.exists ? doc.data()?.fcmTokens : []
        )
        .filter((token: string) => token);

      if (allTokens.length === 0) {
        console.log('Nenalezeny žádné FCM tokeny pro příjemce.');
        return;
      }

      console.log(`✅ Nalezeno celkem ${allTokens.length} FCM tokenů`);

      // ✅ OPRAVENO: Explicitní typy pro token
      const messages = allTokens.map((token: string) => ({
        notification: {
          title: `💬 Nová zpráva od ${messageData.senderName}`,
          body: messageData.message,
        },
        data: {
          messageId: context.params.messageId,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          urgent: messageData.urgent ? 'true' : 'false',
        },
        token: token,
      }));

      try {
        const response = await admin.messaging().sendEach(messages);

        console.log(
          `✅ Notifikace odeslány: ${response.successCount}/${allTokens.length}`
        );

        if (response.failureCount > 0) {
          console.warn(
            `⚠️ Některé notifikace selhaly: ${response.failureCount}`
          );

          // ✅ OPRAVENO: Explicitní typy pro resp a idx
          response.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
            if (!resp.success) {
              console.error(`❌ Token ${idx} selhal:`, resp.error);
            }
          });
        }
      } catch (error) {
        console.error('❌ Chyba při odesílání notifikací:', error);
      }
    }
  );

// ================================================================= //
// FUNKCE 3: Kontrola a odesílání připomínek z kalendáře
// ================================================================= //
export { checkReminders } from './checkReminders';
