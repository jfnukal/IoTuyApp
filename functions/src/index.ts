import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

export const sendPushOnNewMessage = functions
  .region('europe-west1')
  .firestore.document('familyMessages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const messageData = snapshot.data();
    
    if (!messageData) {
      console.log('❌ Nová zpráva nemá žádná data.');
      return;
    }

    console.log(`📨 Zpracovávám zprávu s ID: ${context.params.messageId}`);
    console.log(`👤 Odesílatel: ${messageData.senderName}`);
    console.log(`💬 Zpráva: ${messageData.message}`);

    const recipients = messageData.recipients.filter(
      (id: string) => id !== messageData.senderId
    );

    if (recipients.length === 0) {
      console.log('ℹ️ Žádní příjemci k odeslání notifikace.');
      return;
    }

    console.log(`👥 Příjemci: ${recipients.join(', ')}`);

    const familyMemberPromises = recipients.map((memberId: string) =>
      db.collection('familyMembers').doc(memberId).get()
    );

    const familyMemberDocs = await Promise.all(familyMemberPromises);

    const authUids = familyMemberDocs
      .filter(doc => doc.exists && doc.data()?.authUid)
      .map(doc => doc.data()!.authUid);

    console.log(`👥 Nalezeno ${authUids.length} authUid pro příjemce`);

    if (authUids.length === 0) {
      console.log('⚠️ Žádné authUid nalezeny pro příjemce');
      return;
    }

    const userSettingsPromises = authUids.map((authUid: string) =>
      db.collection('userSettings').doc(authUid).get()
    );

    const userSettingsResults = await Promise.all(userSettingsPromises);

    const allTokens = userSettingsResults
      .flatMap((doc) => {
        if (!doc.exists) {
          console.log(`⚠️ Nastavení pro authUid ${doc.id} neexistují`);
          return [];
        }
        const tokens = doc.data()?.fcmTokens || [];
        console.log(`🔑 AuthUid ${doc.id} má ${tokens.length} tokenů`);
        return tokens;
      })
      .filter((token) => token);

    if (allTokens.length === 0) {
      console.log('⚠️ Nenalezeny žádné FCM tokeny pro příjemce.');
      return;
    }

    console.log(`✅ Nalezeno celkem ${allTokens.length} FCM tokenů`);

    const message = {
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
      tokens: allTokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      
      console.log(`✅ Notifikace odeslány: ${response.successCount}/${allTokens.length}`);
      
      if (response.failureCount > 0) {
        console.warn(`⚠️ Některé notifikace selhaly: ${response.failureCount}`);
        
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`❌ Token ${idx} selhal:`, resp.error);
          }
        });
      }
    } catch (error) {
      console.error('❌ Chyba při odesílání notifikací:', error);
    }
  });
