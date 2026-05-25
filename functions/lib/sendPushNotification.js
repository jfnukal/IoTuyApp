"use strict";
// functions/src/sendPushNotification.ts
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
exports.sendPushNotification = sendPushNotification;
const admin = __importStar(require("firebase-admin"));
async function sendPushNotification(familyMemberId, title, body) {
    var _a, _b;
    const db = admin.firestore();
    // Najdi family membera
    const memberQuery = await db
        .collection('familyMembers')
        .doc(familyMemberId)
        .get();
    if (!memberQuery.exists)
        return;
    const authUid = (_a = memberQuery.data()) === null || _a === void 0 ? void 0 : _a.authUid;
    if (!authUid)
        return;
    // Najdi FCM tokeny
    const userSettingsDoc = await db
        .collection('userSettings')
        .doc(authUid)
        .get();
    const tokens = ((_b = userSettingsDoc.data()) === null || _b === void 0 ? void 0 : _b.fcmTokens) || [];
    if (tokens.length === 0)
        return;
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
    await admin.messaging().sendEachForMulticast(Object.assign({ tokens }, message));
}
//# sourceMappingURL=sendPushNotification.js.map