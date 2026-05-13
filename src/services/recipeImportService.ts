// src/services/recipeImportService.ts
// Volá Cloud Function parseRecipeUrl a vrací parsovaná data receptu.

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

export interface ImportedIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface ImportedRecipe {
  name: string;
  description: string;
  category: string;
  ingredients: ImportedIngredient[];
  steps: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  imageUrl: string;
  youtubeLinks: string[];
  tags: string[];
  missingFields: string[];
  sourceUrl: string;
  schemaFound: boolean;
}

const functionsInstance = getFunctions(app, 'europe-west1');

export async function parseRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  const fn = httpsCallable<{ url: string }, ImportedRecipe>(
    functionsInstance,
    'parseRecipeUrl',
  );
  const result = await fn({ url });
  return result.data;
}
