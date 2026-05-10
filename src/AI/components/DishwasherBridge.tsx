// src/AI/components/DishwasherBridge.tsx
// Neviditelná komponenta — propojuje Firestore dishwasher ↔ dishwasherService
import React, { useEffect } from 'react';
import { firestoreService } from '../../services/firestoreService';
import {
  syncDishwasher,
  registerMarkDoneHandler,
} from '../services/dishwasherService';

export const DishwasherBridge: React.FC = () => {
  useEffect(() => {
    // Přihlásit se k realtime aktualizacím myčky
    const unsubscribe = firestoreService.subscribeToDishwasher((state) => {
      syncDishwasher(state);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Registrovat handler pro označení myčky jako hotové
    registerMarkDoneHandler(async () => {
      await firestoreService.completeDishwasherDuty();
    });
  }, []);

  return null;
};
