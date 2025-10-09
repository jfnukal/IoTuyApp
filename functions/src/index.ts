import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { bakalariAPI } from "./bakalariAPI";

// Inicializace Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Definice naší automatické funkce
export const updateBakalariTimetable = functions
  // Nastavení časové zóny a plánu spouštění
  .region("europe-west1") // Doporučeno pro Evropu
  .pubsub.schedule("0 17 * * 1-5") // Spustí se v 17:00, od pondělí do pátku
  .timeZone("Europe/Prague") // Důležité pro správný čas!
  .onRun(async (context) => {
    console.log("Spouštím automatickou aktualizaci rozvrhu z Bakalářů.");

    try {
      // Krok 1: Načtení dat z Bakaláři API
      const freshTimetable = await bakalariAPI.getTimetable();

      if (!freshTimetable || freshTimetable.length === 0) {
        console.warn("Nepodařilo se načíst nový rozvrh, žádná data k zápisu.");
        return null;
      }

      // Krok 2: Zápis do Firestore
      // Používáme .set() s { merge: true }, což zajistí "inkrementální"
      // update - přepíše celý dokument, ale zachová ho, pokud existuje.
      // Pro náš případ "přepsat změny" je to ideální.
      const scheduleRef = db.collection("schedules").doc("johanka");
      await scheduleRef.set({
        days: freshTimetable,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Rozvrh pro Johanku byl úspěšně aktualizován v Firestore.");
      return null;

    } catch (error) {
      console.error("❌ Došlo k chybě při aktualizaci rozvrhu:", error);
      return null;
    }
  });