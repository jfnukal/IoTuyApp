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
// FUNKCE 2: Odeslání Push notifikace při nové zprávě (naše nová funkce)
// ================================================================= //
// NAHRAĎ CELOU TUTO FUNKCI
export const sendPushOnNewMessage = functions
  .region('europe-west1')
  .firestore.document('familyMessages/{messageId}')
  .onCreate(async (snapshot, context) => {
    // ... (kód pro získání messageData a recipients zůstává stejný) ...
    const messageData = snapshot.data();
    if (!messageData) {
      console.log('Nová zpráva nemá žádná data.');
      return;
    }
    const recipients = messageData.recipients.filter(
      (id: string) => id !== messageData.senderId
    );
    if (recipients.length === 0) {
      console.log('Žádní příjemci k odeslání notifikace.');
      return;
    }
    const userSettingsPromises = recipients.map((userId: string) =>
      db.collection('userSettings').doc(userId).get()
    );
    const userSettingsResults = await Promise.all(userSettingsPromises);
    const allTokens = userSettingsResults
      .flatMap((doc) => (doc.exists ? doc.data()?.fcmTokens : []))
      .filter((token) => token);

    if (allTokens.length === 0) {
      console.log('Nenalezeny žádné FCM tokeny pro příjemce.');
      return;
    }

    console.log(`Zpracovávám zprávu s ID: ${context.params.messageId}`);

    console.log(`Nalezeno ${allTokens.length} tokenů pro odeslání.`);

    // --- ZAČÁTEK ZMĚNY ---
    // Připravíme zprávu pro novou metodu sendMulticast
    const message = {
      notification: {
        title: `💬 Nová zpráva od ${messageData.senderName}`,
        body: messageData.message,
      },
      tokens: allTokens, // Místo payloadu posíláme tokeny přímo ve zprávě
    };

    try {
      // Použijeme novou metodu "sendMulticast"
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
    // --- KONEC ZMĚNY ---
  });
