// src/components/Widgets/Recipes/RecipeListModal.tsx
// Přehled všech receptů — otevře se z miniwidgetu tlačítkem 📋

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Recipe } from '../../../types';
import './RecipeListModal.css';

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

interface Props {
  recipes: Recipe[];
  onClose: () => void;
  onOpen: (recipe: Recipe) => void;
}

const RecipeListModal: React.FC<Props> = ({ recipes, onClose, onOpen }) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const categories = useMemo(() =>
    [...new Set(recipes.map(r => r.category))].sort(),
    [recipes]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return recipes.filter(r => {
      const matchCat = !filterCat || r.category === filterCat;
      const matchSearch = !q
        || r.name.toLowerCase().includes(q)
        || r.tags?.some(t => t.toLowerCase().includes(q))
        || r.description?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [recipes, search, filterCat]);

  return createPortal(
    <div className="rlm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rlm-dialog">

        {/* Záhlaví */}
        <div className="rlm-header">
          <span className="rlm-title">📖 Kuchařka ({recipes.length})</span>
          <button className="rlm-close" onClick={onClose}>✕</button>
        </div>

        {/* Filtrování */}
        <div className="rlm-filters">
          <input
            className="rlm-search"
            type="search"
            placeholder="Hledat recept…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <select
            className="rlm-cat-select"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">Vše</option>
            {categories.map(c => (
              <option key={c} value={c}>{CATEGORY_EMOJI[c] ?? '🍴'} {c}</option>
            ))}
          </select>
        </div>

        {/* Seznam */}
        <div className="rlm-list">
          {filtered.length === 0 && (
            <div className="rlm-empty">Žádný recept nenalezen</div>
          )}
          {filtered.map(recipe => (
            <button
              key={recipe.id}
              className="rlm-card"
              onClick={() => { onOpen(recipe); onClose(); }}
            >
              {recipe.imageUrl ? (
                <img className="rlm-card-img" src={recipe.imageUrl} alt={recipe.name} loading="lazy" />
              ) : (
                <div className="rlm-card-img rlm-card-img--placeholder">
                  {CATEGORY_EMOJI[recipe.category] ?? '🍴'}
                </div>
              )}
              <div className="rlm-card-body">
                <div className="rlm-card-name">{recipe.name}</div>
                <div className="rlm-card-meta">
                  <span>{CATEGORY_EMOJI[recipe.category] ?? '🍴'} {recipe.category}</span>
                  {(recipe.prepTime || recipe.cookTime) && (
                    <span>⏱ {(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min</span>
                  )}
                  {recipe.servings && <span>👤 {recipe.servings}</span>}
                </div>
                {recipe.tags?.length > 0 && (
                  <div className="rlm-card-tags">
                    {recipe.tags.slice(0, 3).map(t => (
                      <span key={t} className="rlm-tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>,
    document.getElementById('modal-root') ?? document.body,
  );
};

export default RecipeListModal;
