"use strict";
// /functions/src/index.ts
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
exports.onNewCalendarEvent = exports.checkReminders = exports.parseRecipeUrl = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
var parseRecipeUrl_1 = require("./parseRecipeUrl");
Object.defineProperty(exports, "parseRecipeUrl", { enumerable: true, get: function () { return parseRecipeUrl_1.parseRecipeUrl; } });
// ✅ Inicializace Firebase Admin SDK
admin.initializeApp();
function calculateReminderTime(eventDate, reminderValue, reminderUnit, eventTime) {
    const [year, monthNum, day] = eventDate.split('-').map(Number);
    const eventDateTime = new Date(year, monthNum - 1, day, 0, 0, 0, 0);
    if (eventTime && typeof eventTime === 'string') {
        const [hours, minutes] = eventTime.split(':').map(Number);
        eventDateTime.setHours(hours, minutes, 0, 0);
    }
    else {
        eventDateTime.setHours(8, 0, 0, 0);
    }
    // ✅ PRAGUE TIMEZONE: Automatická detekce letního/zimního času
    const eventMonth = eventDateTime.getMonth(); // 0-11
    // Letní čas v ČR: duben-říjen = UTC+2, listopad-březen = UTC+1
    const isSummerTime = eventMonth >= 3 && eventMonth <= 9;
    const pragueOffsetMinutes = isSummerTime ? -120 : -60;
    const serverOffsetMinutes = eventDateTime.getTimezoneOffset();
    const offsetDifference = pragueOffsetMinutes - -serverOffsetMinutes;
    eventDateTime.setMinutes(eventDateTime.getMinutes() + offsetDifference);
    const eventTimestamp = eventDateTime.getTime();
    let reminderTime;
    switch (reminderUnit) {
        case 'ontime':
            reminderTime = eventTimestamp;
            break;
        case 'minutes':
            reminderTime = eventTimestamp - reminderValue * 60 * 1000;
            break;
        case 'hours':
            reminderTime = eventTimestamp - reminderValue * 60 * 60 * 1000;
            break;
        case 'days':
            reminderTime = eventTimestamp - reminderValue * 24 * 60 * 60 * 1000;
            break;
        case 'weeks':
            reminderTime = eventTimestamp - reminderValue * 7 * 24 * 60 * 60 * 1000;
            break;
        default:
            reminderTime = eventTimestamp;
    }
    return reminderTime;
}
async function sendPushNotification(db, familyMemberId, createdBy, title, body) {
    var _a, _b;
    try {
        let authUid = null;
        if (familyMemberId) {
            const memberDoc = await db
                .collection('familyMembers')
                .doc(familyMemberId)
                .get();
            if (memberDoc.exists) {
                authUid = (_a = memberDoc.data()) === null || _a === void 0 ? void 0 : _a.authUid;
            }
        }
        if (!authUid && createdBy) {
            authUid = createdBy;
        }
        if (!authUid) {
            console.warn('⚠️ Nelze určit authUid');
            return;
        }
        const userSettingsDoc = await db
            .collection('userSettings')
            .doc(authUid)
            .get();
        const tokens = ((_b = userSettingsDoc.data()) === null || _b === void 0 ? void 0 : _b.fcmTokens) || [];
        if (tokens.length === 0) {
            console.warn(`⚠️ Žádné FCM tokeny`);
            return;
        }
        // DATA-ONLY zpráva — browser neukáže notifikaci automaticky,
        // ukáže ji pouze service worker onBackgroundMessage (→ žádné duplikáty)
        const messageId = `reminder-${familyMemberId || createdBy}-${Date.now()}`;
        const messages = tokens.map((token) => ({
            data: {
                type: 'calendar_reminder',
                title,
                body,
                messageId,
                timestamp: Date.now().toString(),
            },
            token,
        }));
        const response = await admin.messaging().sendEach(messages);
        if (response.failureCount > 0) {
            console.warn(`⚠️ Selhalo: ${response.failureCount}`);
        }
    }
    catch (error) {
        console.error('❌ Chyba Push:', error);
    }
}
exports.checkReminders = functions
    .region('europe-west1')
    .runWith({ memory: '256MB', timeoutSeconds: 540 })
    .pubsub.schedule('every 5 minutes')
    .timeZone('Europe/Prague')
    .onRun(async () => {
    new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
    const now = Date.now();
    const db = admin.firestore();
    try {
        const eventsSnapshot = await db
            .collection('calendarEvents')
            .where('reminders', '!=', null)
            .get();
        let sent = 0;
        for (const eventDoc of eventsSnapshot.docs) {
            const event = eventDoc.data();
            const reminders = event.reminders || [];
            const sentReminders = event.sentReminders || [];
            for (const reminder of reminders) {
                if (sentReminders.includes(reminder.id))
                    continue;
                const reminderTime = calculateReminderTime(event.date, reminder.value, reminder.unit, event.time);
                const timeWindow = 5 * 60 * 1000;
                if (now >= reminderTime && now < reminderTime + timeWindow) {
                    const title = `Připomínka: ${event.title}`;
                    const body = event.time
                        ? `${event.date} v ${event.time}`
                        : event.date;
                    if (reminder.type === 'push' || reminder.type === 'both') {
                        await sendPushNotification(db, event.familyMemberId, event.createdBy, title, body);
                        sent++;
                    }
                    await eventDoc.ref.update({
                        sentReminders: admin.firestore.FieldValue.arrayUnion(reminder.id),
                    });
                }
            }
        }
        console.log(`✅ DONE: ${sent} odesláno`);
        return null;
    }
    catch (error) {
        console.error('❌ ERROR:', error);
        return null;
    }
});
// ==================== TRIGGER: NOVÁ UDÁLOST ====================
exports.onNewCalendarEvent = functions
    .region('europe-west1')
    .firestore.document('calendarEvents/{eventId}')
    .onCreate(async (snapshot, context) => {
    var _a;
    console.log('📅 Nová událost vytvořena:', context.params.eventId);
    const event = snapshot.data();
    if (!event) {
        return null;
    }
    // Přeskoč osobní události
    if (event.type === 'personal') {
        return null;
    }
    const db = admin.firestore();
    const authorId = event.createdBy;
    // Získej jméno autora
    let authorName = 'Někdo';
    if (authorId) {
        const membersSnapshot = await db
            .collection('familyMembers')
            .where('authUid', '==', authorId)
            .limit(1)
            .get();
        if (!membersSnapshot.empty) {
            authorName = membersSnapshot.docs[0].data().name || 'Někdo';
        }
    }
    // Získej všechny členy rodiny
    const allMembersSnapshot = await db.collection('familyMembers').get();
    let sentCount = 0;
    for (const memberDoc of allMembersSnapshot.docs) {
        const member = memberDoc.data();
        const memberAuthUid = member.authUid;
        // Přeskoč autora - ten notifikaci nedostane
        if (memberAuthUid === authorId) {
            console.log(`⏭️ Přeskakuji autora: ${member.name}`);
            continue;
        }
        // Získej FCM tokeny pro tohoto člena
        if (!memberAuthUid) {
            continue;
        }
        const userSettingsDoc = await db
            .collection('userSettings')
            .doc(memberAuthUid)
            .get();
        const tokens = ((_a = userSettingsDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmTokens) || [];
        if (tokens.length === 0) {
            console.log(`⚠️ Člen ${member.name} nemá FCM tokeny`);
            continue;
        }
        // Sestav notifikaci
        const title = '📅 Nová událost v kalendáři';
        // Přidej datum do textu notifikace
        const eventDateStr = event.time
            ? `${event.date} v ${event.time}`
            : event.date;
        const body = `${event.title} (${eventDateStr}) — přidal/a ${authorName}`;
        // DATA-ONLY zpráva — browser neukáže notifikaci automaticky.
        // Service worker onBackgroundMessage ji ukáže jednou.
        // Stabilní messageId zajistí, že OS deduplikuje případné duplikáty.
        const messageId = `cal-${context.params.eventId}-${memberDoc.id}`;
        const messages = tokens.map((token) => ({
            data: {
                type: 'new_calendar_event',
                title,
                body,
                messageId,
                eventId: context.params.eventId,
                timestamp: Date.now().toString(),
            },
            token,
        }));
        try {
            const response = await admin.messaging().sendEach(messages);
            sentCount += response.successCount;
            // Loguj jednotlivé chyby
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    var _a;
                    if (!resp.success) {
                        console.error(`❌ Token ${idx} pro ${member.name} selhal:`, (_a = resp.error) === null || _a === void 0 ? void 0 : _a.message);
                    }
                });
            }
        }
        catch (error) {
            console.error(`❌ Chyba push pro ${member.name}:`, error);
        }
    }
    return null;
});
//# sourceMappingURL=index.js.map