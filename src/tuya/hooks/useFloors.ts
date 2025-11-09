// src/tuya/hooks/useFloors.ts
import { useState, useEffect, useCallback } from 'react';
import { firestoreService } from '../../services/firestoreService';

export const useFloors = (floorId: string) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscribe k layoutu
  useEffect(() => {
    console.log(`🏠 Floors: Připojuji k layoutu "${floorId}"...`);
    
    const unsubscribe = firestoreService.subscribeToFloorLayout(
      floorId,
      (roomsFromDB) => {
        console.log(`✅ Floors: Načteno ${roomsFromDB.length} místností`);
        setRooms(roomsFromDB);
        setIsLoading(false);
      }
    );

    return () => {
      console.log(`🏠 Floors: Odpojuji od layoutu "${floorId}"`);
      unsubscribe();
    };
  }, [floorId]);

  /**
   * Uložení layoutu do Firebase
   */
  const saveLayout = useCallback(
    async (updatedRooms: any[]) => {
      try {
        setError(null);
        console.log(`💾 Ukládám layout "${floorId}"...`);
        await firestoreService.saveFloorLayout(floorId, updatedRooms);
        console.log('✅ Layout uložen!');
      } catch (err: any) {
        console.error('❌ Chyba při ukládání layoutu:', err);
        setError(err.message || 'Nepodařilo se uložit layout');
        throw err;
      }
    },
    [floorId]
  );

  return {
    rooms,
    isLoading,
    error,
    saveLayout,
  };
};