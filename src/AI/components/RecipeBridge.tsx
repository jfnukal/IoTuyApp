// src/AI/components/RecipeBridge.tsx
// Neviditelná komponenta — synchronizuje recepty z Firestore do recipeService cache
import React, { useEffect } from 'react';
import { firestoreService } from '../../services/firestoreService';
import { syncRecipes } from '../services/recipeService';

export const RecipeBridge: React.FC = () => {
  useEffect(() => {
    const unsubscribe = firestoreService.subscribeToRecipes((recipes) => {
      syncRecipes(recipes);
    });
    return () => unsubscribe();
  }, []);

  return null;
};
