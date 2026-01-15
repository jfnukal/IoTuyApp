// src/utils/migrateGridLayout.ts
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Migrace gridLayout z starého systému (cols=4, rowHeight=150)
 * na nový systém (cols=12, rowHeight=50)
 * 
 * Přepočet:
 * - x: násobíme 3 (4 sloupce → 12 sloupců)
 * - y: násobíme 3 (150px → 50px, takže 3x více řádků)
 * - w: násobíme 3 (1 stará buňka = 3 nové)
 * - h: násobíme 3 (150px = 3 * 50px)
 */
export async function migrateGridLayouts(): Promise<{
  success: boolean;
  migratedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    console.log('🚀 Spouštím migraci gridLayout...');
    
    const devicesRef = collection(db, 'devices');
    const snapshot = await getDocs(devicesRef);
    
    if (snapshot.empty) {
      console.log('⚠️ Žádná zařízení k migraci');
      return { success: true, migratedCount: 0, errors: [] };
    }

    const batch = writeBatch(db);
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const oldLayout = data.gridLayout;
      
      // Přeskoč zařízení bez layoutu nebo už migrovaná
      if (!oldLayout) {
        console.log(`⏭️ ${data.name}: Nemá gridLayout, přeskakuji`);
        return;
      }
      
      // Detekce: pokud x >= 12 nebo w >= 6, už je migrováno
      // (starý systém měl max x=3, w=4)
      if (oldLayout.x >= 4 || oldLayout.w >= 4) {
        console.log(`⏭️ ${data.name}: Již migrováno, přeskakuji`);
        return;
      }

      // Přepočet
      const newLayout = {
        x: oldLayout.x * 3,
        y: oldLayout.y * 3,
        w: oldLayout.w * 3,
        h: oldLayout.h * 3,
      };

      console.log(`📐 ${data.name}: [${oldLayout.x},${oldLayout.y},${oldLayout.w},${oldLayout.h}] → [${newLayout.x},${newLayout.y},${newLayout.w},${newLayout.h}]`);
      
      batch.update(doc(devicesRef, docSnap.id), {
        gridLayout: newLayout,
        gridLayoutMigrated: true,  // Flag pro kontrolu
        gridLayoutMigratedAt: Date.now(),
      });
      
      migratedCount++;
    });

    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Migrace dokončena: ${migratedCount} zařízení`);
    } else {
      console.log('ℹ️ Žádná zařízení k migraci');
    }

    return { success: true, migratedCount, errors };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('❌ Chyba migrace:', errorMsg);
    errors.push(errorMsg);
    return { success: false, migratedCount, errors };
  }
}

/**
 * Vrátí migraci zpět (pro případ problémů)
 */
export async function rollbackGridLayouts(): Promise<void> {
  console.log('🔄 Spouštím rollback migrace...');
  
  const devicesRef = collection(db, 'devices');
  const snapshot = await getDocs(devicesRef);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    
    if (data.gridLayoutMigrated && data.gridLayout) {
      const oldLayout = {
        x: Math.round(data.gridLayout.x / 3),
        y: Math.round(data.gridLayout.y / 3),
        w: Math.round(data.gridLayout.w / 3),
        h: Math.round(data.gridLayout.h / 3),
      };
      
      batch.update(doc(devicesRef, docSnap.id), {
        gridLayout: oldLayout,
        gridLayoutMigrated: false,
      });
    }
  });
  
  await batch.commit();
  console.log('✅ Rollback dokončen');
}