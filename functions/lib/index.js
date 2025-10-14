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
exports.sendPushOnNewMessage = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.sendPushOnNewMessage = functions
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
    const recipients = messageData.recipients.filter((id) => id !== messageData.senderId);
    if (recipients.length === 0) {
        console.log('ℹ️ Žádní příjemci k odeslání notifikace.');
        return;
    }
    console.log(`👥 Příjemci: ${recipients.join(', ')}`);
    const familyMemberPromises = recipients.map((memberId) => db.collection('familyMembers').doc(memberId).get());
    const familyMemberDocs = await Promise.all(familyMemberPromises);
    const authUids = familyMemberDocs
        .filter(doc => { var _a; return doc.exists && ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.authUid); })
        .map(doc => doc.data().authUid);
    console.log(`👥 Nalezeno ${authUids.length} authUid pro příjemce`);
    if (authUids.length === 0) {
        console.log('⚠️ Žádné authUid nalezeny pro příjemce');
        return;
    }
    const userSettingsPromises = authUids.map((authUid) => db.collection('userSettings').doc(authUid).get());
    const userSettingsResults = await Promise.all(userSettingsPromises);
    const allTokens = userSettingsResults
        .flatMap((doc) => {
        var _a;
        if (!doc.exists) {
            console.log(`⚠️ Nastavení pro authUid ${doc.id} neexistují`);
            return [];
        }
        const tokens = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.fcmTokens) || [];
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
    }
    catch (error) {
        console.error('❌ Chyba při odesílání notifikací:', error);
    }
});
//# sourceMappingURL=index.js.map