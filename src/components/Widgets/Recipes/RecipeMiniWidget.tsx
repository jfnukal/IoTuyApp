// src/components/Widgets/Recipes/RecipeMiniWidget.tsx
import React, { useEffect, useState, useRef } from 'react';
import { firestoreService } from '../../../services/firestoreService';
import { seedRecipesToFirestore } from './seedRecipes';
import type { Recipe } from '../../../types';
import RecipeModal from './RecipeModal';
import RecipeForm from './RecipeForm';
import RecipeImportModal from './RecipeImportModal';
import RecipeListModal from './RecipeListModal';
import './RecipeMiniWidget.css';

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Opravdu smazat recept?')) return;
    await firestoreService.deleteRecipe(id);
  };

  const closeForm = () => { setShowForm(false); setEditRecipe(null); setImportPrefill(null); };

  // Prázdný stav
  if (!recipes.length) {
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
      <div className="recipe-mini">
        {/* Hlavička */}
        <div className="recipe-mini__header">
          <span className="recipe-mini__icon">📖</span>
          <span className="recipe-mini__title">Recepty</span>
          <div className="recipe-mini__actions">
            <button
              className="recipe-mini__btn recipe-mini__btn--list"
              onClick={() => setShowList(true)}
              title="Všechny recepty"
            >📋</button>
            <button
              className="recipe-mini__btn recipe-mini__btn--add"
              onClick={() => { setEditRecipe(null); setImportPrefill(null); setShowForm(true); }}
              title="Přidat recept"
            >＋</button>
            <button
              className="recipe-mini__btn recipe-mini__btn--import"
              onClick={() => setShowImport(true)}
              title="Import z URL"
            >🔗</button>
          </div>
        </div>

        {/* Seznam receptů */}
        <ul className="recipe-mini__list">
          {recipes.map((r) => (
            <li
              key={r.id}
              className="recipe-mini__item"
              onClick={() => setModalRecipe(r)}
              title={r.name}
            >
              <span className="recipe-mini__item-emoji">
                {CATEGORY_EMOJI[r.category] ?? '🍴'}
              </span>
              <span className="recipe-mini__item-name">{r.name}</span>
              {r.sourceUrl && <span className="recipe-mini__item-link" title="Uloženo jako odkaz">🔗</span>}
              {(r.prepTime || r.cookTime) && (
                <span className="recipe-mini__item-time">
                  {(r.prepTime ?? 0) + (r.cookTime ?? 0)}m
                </span>
              )}
            </li>
          ))}
        </ul>
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
