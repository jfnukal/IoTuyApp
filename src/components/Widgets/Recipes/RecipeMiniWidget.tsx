// src/components/Widgets/Recipes/RecipeMiniWidget.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { firestoreService } from '../../../services/firestoreService';
import { seedRecipesToFirestore } from './seedRecipes';
import type { Recipe } from '../../../types';
import RecipeModal from './RecipeModal';
import RecipeForm from './RecipeForm';
import RecipeImportModal from './RecipeImportModal';
import RecipeListModal from './RecipeListModal';
import './RecipeMiniWidget.css';

const ROTATION_INTERVAL = 10 * 60 * 1000; // 10 minut

function getSeasonScore(recipe: Recipe, month: number): number {
  if (!recipe.seasonMonths || recipe.seasonMonths.length === 0) return 1;
  if (recipe.seasonMonths.includes(month)) return 3;
  const closest = recipe.seasonMonths.reduce((min, m) => {
    const diff = Math.min(Math.abs(m - month), 12 - Math.abs(m - month));
    return Math.min(min, diff);
  }, 99);
  if (closest <= 1) return 2;
  if (closest <= 2) return 1;
  return 0;
}

function pickSeasonalRecipe(recipes: Recipe[], excludeId?: string): Recipe | null {
  if (!recipes.length) return null;
  const month = new Date().getMonth() + 1;
  const scored = recipes
    .filter((r) => r.id !== excludeId)
    .map((r) => ({ recipe: r, score: getSeasonScore(r, month) }))
    .filter((x) => x.score > 0);
  if (!scored.length) return recipes.find((r) => r.id !== excludeId) ?? null;
  const total = scored.reduce((s, x) => s + x.score, 0);
  let rand = Math.random() * total;
  for (const x of scored) {
    rand -= x.score;
    if (rand <= 0) return x.recipe;
  }
  return scored[scored.length - 1].recipe;
}

const CATEGORY_EMOJI: Record<string, string> = {
  'polévka':     '🍲',
  'hlavní jídlo':'🍽️',
  'dezert':      '🍰',
  'pečení':      '🥐',
  'salát':       '🥗',
  'příloha':     '🥔',
  'nápoj':       '🥤',
  'ostatní':     '🍴',
};

const RecipeMiniWidget: React.FC = () => {
  const [recipes, setRecipes]         = useState<Recipe[]>([]);
  const [current, setCurrent]         = useState<Recipe | null>(null);
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [editRecipe, setEditRecipe]   = useState<Recipe | null>(null);
  const [showImport, setShowImport]   = useState(false);
  const [showList, setShowList]       = useState(false);
  const [importPrefill, setImportPrefill] = useState<Partial<Recipe> | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    const unsub = firestoreService.subscribeToRecipes((data) => {
      setRecipes(data);
      if (data.length === 0 && !seeded.current) {
        seeded.current = true;
        seedRecipesToFirestore();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!recipes.length) return;
    setCurrent((prev) => prev ?? pickSeasonalRecipe(recipes));
  }, [recipes]);

  const rotate = useCallback(() => {
    setCurrent((prev) => pickSeasonalRecipe(recipes, prev?.id ?? undefined));
  }, [recipes]);

  useEffect(() => {
    const id = setInterval(rotate, ROTATION_INTERVAL);
    return () => clearInterval(id);
  }, [rotate]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Opravdu smazat recept?')) return;
    await firestoreService.deleteRecipe(id);
    setCurrent(null);
  };

  const closeForm = () => { setShowForm(false); setEditRecipe(null); setImportPrefill(null); };

  if (!current && !recipes.length) {
    return (
      <div className="recipe-mini recipe-mini--empty">
        <div className="recipe-mini__empty-icon">📖</div>
        <p className="recipe-mini__empty-text">Zatím žádné recepty</p>
        <button className="recipe-mini__add-btn" onClick={() => setShowForm(true)}>
          + Přidat první recept
        </button>
        {showForm && <RecipeForm onClose={closeForm} />}
      </div>
    );
  }

  return (
    <>
      <div className="recipe-mini" onClick={() => current && setModalRecipe(current)}>
        {/* Hlavička */}
        <div className="recipe-mini__header">
          <span className="recipe-mini__icon">
            {current ? CATEGORY_EMOJI[current.category] ?? '🍴' : '📖'}
          </span>
          <span className="recipe-mini__title">{current?.name ?? '...'}</span>
          <div className="recipe-mini__actions" onClick={(e) => e.stopPropagation()}>
            <button className="recipe-mini__btn recipe-mini__btn--rotate" onClick={rotate} title="Jiný recept">↻</button>
            <button className="recipe-mini__btn recipe-mini__btn--list"   onClick={() => setShowList(true)}    title="Všechny recepty">📋</button>
            <button className="recipe-mini__btn recipe-mini__btn--add"    onClick={() => { setEditRecipe(null); setShowForm(true); }} title="Přidat recept">＋</button>
            <button className="recipe-mini__btn recipe-mini__btn--import" onClick={() => setShowImport(true)}  title="Import z URL">🔗</button>
          </div>
        </div>

        {/* Ingredience — první 3 */}
        {current && (
          <ul className="recipe-mini__ingredients">
            {current.ingredients.slice(0, 3).map((ing, i) => (
              <li key={i} className="recipe-mini__ingredient">
                <span className="recipe-mini__ing-name">{ing.name}</span>
                {ing.amount && (
                  <span className="recipe-mini__ing-amount">{ing.amount} {ing.unit}</span>
                )}
              </li>
            ))}
            {current.ingredients.length > 3 && (
              <li className="recipe-mini__more">+{current.ingredients.length - 3} dalších surovin</li>
            )}
          </ul>
        )}

        {/* Meta */}
        {current && (
          <div className="recipe-mini__meta">
            {current.prepTime && <span>⏱ {current.prepTime + (current.cookTime ?? 0)} min</span>}
            {current.servings && <span>👤 {current.servings} porcí</span>}
            <span className="recipe-mini__hint">👆 detail</span>
          </div>
        )}
      </div>

      {/* Seznam všech receptů */}
      {showList && (
        <RecipeListModal
          recipes={recipes}
          onClose={() => setShowList(false)}
          onOpen={(r) => setModalRecipe(r)}
          onEdit={(r) => { setEditRecipe(r); setImportPrefill(null); setShowForm(true); }}
          onDelete={(id) => handleDelete(id)}
          onAdd={() => { setEditRecipe(null); setImportPrefill(null); setShowForm(true); }}
        />
      )}

      {/* Detail receptu */}
      {modalRecipe && (
        <RecipeModal
          recipe={modalRecipe}
          onClose={() => setModalRecipe(null)}
          onEdit={(r) => { setModalRecipe(null); setEditRecipe(r); setShowForm(true); }}
          onDelete={(id) => { setModalRecipe(null); handleDelete(id); }}
        />
      )}

      {/* Formulář přidat/editovat */}
      {showForm && (
        <RecipeForm
          recipe={editRecipe ?? undefined}
          prefill={importPrefill ?? undefined}
          onClose={closeForm}
        />
      )}

      {/* Import z URL */}
      {showImport && (
        <RecipeImportModal
          onClose={() => setShowImport(false)}
          onEdit={(prefill) => {
            setShowImport(false);
            setImportPrefill(prefill);
            setEditRecipe(null);
            setShowForm(true);
          }}
        />
      )}
    </>
  );
};

export default RecipeMiniWidget;
