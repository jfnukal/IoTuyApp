"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analytics = exports.messaging = exports.db = exports.auth = void 0;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const analytics_1 = require("firebase/analytics");
const messaging_1 = require("firebase/messaging");
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
const app = (0, app_1.initializeApp)(firebaseConfig);
// Initialize Firebase Authentication and get a reference to the service
exports.auth = (0, auth_1.getAuth)(app);
// Initialize Cloud Firestore and get a reference to the service
exports.db = (0, firestore_1.getFirestore)(app);
// Initialize Firebase Cloud Messaging and get a reference to the service
exports.messaging = (0, messaging_1.getMessaging)(app);
// Initialize Analytics (volitelné)
exports.analytics = typeof window !== 'undefined' ? (0, analytics_1.getAnalytics)(app) : null;
exports.default = app;
//# sourceMappingURL=firebase.js.map