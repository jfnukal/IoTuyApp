//src/config/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
// import { getAnalytics } from 'firebase/analytics';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

/* ── OFFLINE PAMĚŤ FIRESTORE ────────────────────────────────────────────────
   Data se drží v prohlížeči (IndexedDB), takže:

   1) PŘI VÝPADKU SÍTĚ appka ukáže poslední známý stav místo prázdna
      a zápisy (odškrtnutí úkolu, vzkaz) se odešlou samy, až se síť vrátí.

   2) UŠETŘÍ TO PLACENÁ ČTENÍ. Firestore neúčtuje dotazy, ale PŘEČTENÉ
      DOKUMENTY — a letákové ceny (`priceDeals`) jsou přes dva tisíce
      dokumentů, které se dosud stahovaly při KAŽDÉM otevření appky.
      S offline pamětí se čtou z prohlížeče a `pricesAPI.ts` sáhne na server,
      jen když razítko `priceIndex/aktualni` hlásí novou dávku.

   `persistentMultipleTabManager` = zvládne víc otevřených panelů naráz;
   bez něj by druhý panel offline paměť nezapnul vůbec.

   POZOR: `initializeFirestore` musí proběhnout PŘED prvním `getFirestore`,
   proto to je tady u založení `db`, a ne v komponentě.

   Když se to nepovede (soukromé okno, zaplněné úložiště, starý prohlížeč),
   spadneme na běžný online režim — appka funguje jako dosud, jen dráž. */
function pripojDatabazi() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        // 100 MB místo výchozích ~40 MB — čím víc se udrží, tím míň
        // placených čtení po denním obnovení v 5:00. Firestore si při
        // zaplnění sám uklidí nejstarší (LRU).
        cacheSizeBytes: 100 * 1024 * 1024,
      }),
    });
  } catch (error) {
    console.warn('⚠️ Offline paměť se nepodařilo zapnout, jedeme jen online:', error);
    return getFirestore(app);
  }
}

// Initialize Cloud Firestore
export const db = pripojDatabazi();

// Initialize Firebase Cloud Messaging - s kontrolou podpory
let messagingInstance: ReturnType<typeof getMessaging> | null = null;
let messagingInitialized = false;

// Inicializuj messaging asynchronně
const initMessaging = async () => {
  if (messagingInitialized) return;

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      messagingInitialized = true;
      console.log('✅ Firebase Messaging je podporováno');
    } else {
      console.warn('⚠️ Firebase Messaging není podporováno v tomto prostředí');
    }
  } catch (error) {
    console.warn('⚠️ Chyba při inicializaci Firebase Messaging:', error);
  }
};

// Spusť inicializaci
initMessaging();

// Exportuj funkci která vrací messaging instance
export const getMessagingInstance = (): ReturnType<
  typeof getMessaging
> | null => {
  return messagingInstance;
};

// Export pro zpětnou kompatibilitu (deprecated)
export const messaging = messagingInstance;

export default app;
