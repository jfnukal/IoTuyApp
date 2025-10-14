import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Firebase Cloud Messaging - s kontrolou podpory
let messagingInstance: ReturnType<typeof getMessaging> | null = null;

(async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      console.log('✅ Firebase Messaging je podporováno');
    } else {
      console.warn('⚠️ Firebase Messaging není podporováno v tomto prostředí');
    }
  } catch (error) {
    console.warn('⚠️ Chyba při inicializaci Firebase Messaging:', error);
  }
})();

export const messaging = messagingInstance;

// Initialize Analytics (volitelné)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;