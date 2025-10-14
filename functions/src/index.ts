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

// NAHRAĎ CELOU TUTO FUNKCI
export const sendPushOnNewMessage = functions
  .region('europe-west1')
  .firestore.document('familyMessages/{messageId}')
  .onCreate(async (snapshot: admin.firestore.QueryDocumentSnapshot, context: functions.EventContext) => { // <-- PŘIDANÉ TYPY
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
      const memberQuery = await db
        .collection('familyMembers')
        .where('id', '==', memberId)
        .limit(1)
        .get();

      if (!memberQuery.empty) {
        return memberQuery.docs[0].data().authUid;
      }
      console.warn(`Člen s id "${memberId}" nenalezen v kolekci familyMembers.`);
      return null;
    });

    const authUids = (await Promise.all(authUidPromises)).filter(
      (uid: string | null): uid is string => uid !== null
    );

    if (authUids.length === 0) {
      console.warn('⚠️ Žádné authUid nalezeny pro příjemce', recipientsIds);
      return;
    }
    console.log(`Nalezeno ${authUids.length} authUid pro příjemce:`, authUids);


    const userSettingsPromises = authUids.map((uid: string) =>
      db.collection('userSettings').doc(uid).get()
    );

    const userSettingsResults = await Promise.all(userSettingsPromises);
    
    // Zde také přidáme typy pro větší jistotu
    const allTokens = userSettingsResults
      .flatMap((doc: admin.firestore.DocumentSnapshot) => (doc.exists ? doc.data()?.fcmTokens : []))
      .filter((token: any) => token);

    if (allTokens.length === 0) {
      console.log('Nenalezeny žádné FCM tokeny pro příjemce.');
      return;
    }

    console.log(`Nalezeno ${allTokens.length} tokenů pro odeslání.`);

    const message = {
      notification: {
        title: `💬 Nová zpráva od ${messageData.senderName}`,
        body: messageData.message,
      },
      tokens: allTokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log('✅ Notifikace úspěšně odeslány:', response.successCount);
      if (response.failureCount > 0) {
        console.warn(
          'Některé notifikace se nepodařilo odeslat:',
          response.failureCount
        );
      }
    } catch (error) {
      console.error('❌ Chyba při odesílání notifikací:', error);
    }
  });

// ================================================================= //
// PŮVODNÍ ČÁST KÓDU !!!!!!!!!!!!!!!!!!
// ================================================================= //

// ================================================================= //
// FUNKCE 2: Odeslání Push notifikace při nové zprávě (naše nová funkce)
// ================================================================= //
// NAHRAĎ CELOU TUTO FUNKCI
// export const sendPushOnNewMessage = functions
//   .region('europe-west1')
//   .firestore.document('familyMessages/{messageId}')
//   .onCreate(async (snapshot, context) => {
//     const messageData = snapshot.data();
//     if (!messageData) {
//       console.log('Nová zpráva nemá žádná data.');
//       return;
//     }
//     const recipients = messageData.recipients.filter(
//       (id: string) => id !== messageData.senderId
//     );
//     if (recipients.length === 0) {
//       console.log('Žádní příjemci k odeslání notifikace.');
//       return;
//     }
//     const userSettingsPromises = recipients.map((userId: string) =>
//       db.collection('userSettings').doc(userId).get()
//     );
//     const userSettingsResults = await Promise.all(userSettingsPromises);
//     const allTokens = userSettingsResults
//       .flatMap((doc) => (doc.exists ? doc.data()?.fcmTokens : []))
//       .filter((token) => token);

//     if (allTokens.length === 0) {
//       console.log('Nenalezeny žádné FCM tokeny pro příjemce.');
//       return;
//     }

//     console.log(`Zpracovávám zprávu s ID: ${context.params.messageId}`);
//     console.log(`Nalezeno ${allTokens.length} tokenů pro odeslání.`);

//     const message = {
//       notification: {
//         title: `💬 Nová zpráva od ${messageData.senderName}`,
//         body: messageData.message,
//       },
//       tokens: allTokens,
//     };

//     try {
//       const response = await admin.messaging().sendMulticast(message);
//       console.log('✅ Notifikace úspěšně odeslány:', response.successCount);
//       if (response.failureCount > 0) {
//         console.warn(
//           'Některé notifikace se nepodařilo odeslat:',
//           response.failureCount
//         );
//       }
//     } catch (error) {
//       console.error('❌ Chyba při odesílání notifikací:', error);
//     }
//   });
