// src/AI/services/recipeService.ts
import type { Recipe } from '../../types';

let cache: Recipe[] = [];

export const syncRecipes = (recipes: Recipe[]) => {
  cache = recipes;
};

/** Vrátí přehled receptů (max 10 názvů) */
export const getRecipeList = (): string => {
  if (cache.length === 0) return 'Kuchařka je prázdná.';
  const names = cache.slice(0, 10).map(r => r.name).join(', ');
  const more = cache.length > 10 ? ` a ${cache.length - 10} dalších` : '';
  return `V kuchařce máme ${cache.length} receptů: ${names}${more}.`;
};

/** Vyhledá recepty podle názvu nebo ingredience */
export const searchRecipes = (query: string): string => {
  if (cache.length === 0) return 'Kuchařka je prázdná.';
  const q = query.toLowerCase();
  const found = cache.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.description?.toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q)) ||
    r.ingredients.some(i => i.name.toLowerCase().includes(q))
  );
  if (found.length === 0) return `Recept obsahující "${query}" jsem nenašel.`;
  if (found.length === 1) {
    const r = found[0];
    const time = [r.prepTime && `příprava ${r.prepTime} min`, r.cookTime && `vaření ${r.cookTime} min`]
      .filter(Boolean).join(', ');
    const ing = r.ingredients.slice(0, 5).map(i => i.name).join(', ');
    return `${r.name}: ${r.description ?? ''}. Ingredience: ${ing}${r.ingredients.length > 5 ? ' a další' : ''}. ${time ? `Čas: ${time}.` : ''}`;
  }
  return `Našel jsem ${found.length} receptů: ${found.map(r => r.name).join(', ')}.`;
};

/** Vrátí detail jednoho receptu */
export const getRecipeDetail = (name: string): string => {
  const r = cache.find(r => r.name.toLowerCase().includes(name.toLowerCase()));
  if (!r) return `Recept "${name}" jsem nenašel. Zkus searchRecipes pro hledání.`;
  const ing = r.ingredients.map(i => `${i.name}${i.amount ? ` ${i.amount}${i.unit ?? ''}` : ''}`).join(', ');
  const time = [r.prepTime && `příprava ${r.prepTime} min`, r.cookTime && `vaření ${r.cookTime} min`]
    .filter(Boolean).join(', ');
  return `${r.name}: ${r.description ?? ''}. Ingredience: ${ing}. ${time ? `Čas: ${time}.` : ''} ${r.servings ? `Porce: ${r.servings}.` : ''}`;
};
