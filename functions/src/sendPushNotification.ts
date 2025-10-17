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
  
  // Pošli notifikaci
  const message = {
    notification: {
      title,
      body,
      icon: '/icons/calendar-192x192.png'
    },
    data: {
      type: 'calendar_reminder',
      timestamp: Date.now().toString()
    }
  };
  
  await admin.messaging().sendEachForMulticast({
    tokens,
    ...message
  });
}