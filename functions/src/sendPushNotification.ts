// functions/src/sendPushNotification.ts

import * as admin from 'firebase-admin';

export async function sendPushNotification(
  familyMemberId: string,
  title: string,
  body: string
): Promise<void> {  // ← OPRAVA{
  const db = admin.firestore();
  
  // Najdi family membera
  const memberQuery = await db
    .collection('familyMembers')
    .doc(familyMemberId)
    .get();
  
  if (!memberQuery.exists) return;
  
  const authUid = memberQuery.data()?.authUid;
  if (!authUid) return;
  
  // Najdi FCM tokeny
  const userSettingsDoc = await db
    .collection('userSettings')
    .doc(authUid)
    .get();
  
  const tokens = userSettingsDoc.data()?.fcmTokens || [];
  
  if (tokens.length === 0) return;
  
  // DATA-ONLY zpráva — žádné notification pole = žádné automatické zobrazení browserem.
  // Service worker onBackgroundMessage ji ukáže jednou se stabilním tagem.
  const messageId = `reminder-${familyMemberId}-${Date.now()}`;
  const message = {
    data: {
      type: 'calendar_reminder',
      title,
      body,
      messageId,
      timestamp: Date.now().toString(),
    },
  };

  await admin.messaging().sendEachForMulticast({
    tokens,
    ...message,
  });
}