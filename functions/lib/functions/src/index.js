"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushOnNewMessage = exports.updateBakalariTimetable = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const bakalariAPI_1 = require("../../src/api/bakalariAPI");
// Inicializace Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
// ================================================================= //
// FUNKCE 1: Aktualizace rozvrhu (zůstává beze změny)
// ================================================================= //
exports.updateBakalariTimetable = functions
    .region('europe-west1')
    .pubsub.schedule('0 17 * * 1-5')
    .timeZone('Europe/Prague')
    .onRun(async () => {
    console.log('Spouštím automatickou aktualizaci rozvrhu z Bakalářů.');
    try {
        const freshTimetable = await bakalariAPI_1.bakalariAPI.getTimetable();
        if (!freshTimetable || freshTimetable.length === 0) {
            console.warn('Nepodařilo se načíst nový rozvrh, žádná data k zápisu.');
            return null;
        }
        const scheduleRef = db.collection('schedules').doc('johanka');
        await scheduleRef.set({
            days: freshTimetable,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Rozvrh pro Johanku byl úspěšně aktualizován v Firestore.');
        return null;
    }
    catch (error) {
        console.error('❌ Došlo k chybě při aktualizaci rozvrhu:', error);
        return null;
    }
});
// ================================================================= //
// FUNKCE 2: Odeslání Push notifikace při nové zprávě (naše nová funkce)
// ================================================================= //
// NAHRAĎ CELOU TUTO FUNKCI
exports.sendPushOnNewMessage = functions
    .region('europe-west1')
    .firestore.document('familyMessages/{messageId}')
    .onCreate(async (snapshot, context) => {
    // ... (kód pro získání messageData a recipients zůstává stejný) ...
    const messageData = snapshot.data();
    if (!messageData) {
        console.log('Nová zpráva nemá žádná data.');
        return;
    }
    const recipients = messageData.recipients.filter((id) => id !== messageData.senderId);
    if (recipients.length === 0) {
        console.log('Žádní příjemci k odeslání notifikace.');
        return;
    }
    const userSettingsPromises = recipients.map((userId) => db.collection('userSettings').doc(userId).get());
    const userSettingsResults = await Promise.all(userSettingsPromises);
    const allTokens = userSettingsResults
        .flatMap((doc) => { var _a; return (doc.exists ? (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.fcmTokens : []); })
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
            console.warn('Některé notifikace se nepodařilo odeslat:', response.failureCount);
        }
    }
    catch (error) {
        console.error('❌ Chyba při odesílání notifikací:', error);
    }
    // --- KONEC ZMĚNY ---
});
//# sourceMappingURL=index.js.map