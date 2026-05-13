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

const PAGE_SIZE = 12;

interface Props {
  recipes: Recipe[];
  onClose: () => void;
  onOpen:   (recipe: Recipe) => void;
  onEdit:   (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onAdd:    () => void;
}

const RecipeListModal: React.FC<Props> = ({ recipes, onClose, onOpen, onEdit, onDelete, onAdd }) => {
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [page, setPage]           = useState(0);

  const categories = useMemo(() =>
    [...new Set(recipes.map(r => r.category))].sort(),
    [recipes]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return recipes.filter(r => {
      const matchCat    = !filterCat || r.category === filterCat;
      const matchSearch = !q
        || r.name.toLowerCase().includes(q)
        || r.tags?.some(t => t.toLowerCase().includes(q))
        || r.description?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [recipes, search, filterCat]);

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleEdit = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    onEdit(recipe);
    onClose();
  };

  return createPortal(
    <div className="rlm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rlm-dialog">

        {/* Záhlaví */}
        <div className="rlm-header">
          <span className="rlm-title">📖 Kuchařka ({recipes.length})</span>
          <div className="rlm-header-actions">
            <button className="rlm-add-btn" onClick={() => { onAdd(); onClose(); }} title="Přidat recept">＋ Přidat</button>
            <button className="rlm-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Filtrování */}
        <div className="rlm-filters">
          <input
            className="rlm-search"
            type="search"
            placeholder="🔍 Hledat podle názvu, tagu nebo popisu…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            autoFocus
          />
          <select
            className="rlm-cat-select"
            value={filterCat}
            onChange={e => { setFilterCat(e.target.value); setPage(0); }}
          >
            <option value="">Vše kategorie</option>
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
          {paginated.map(recipe => (
            <div
              key={recipe.id}
              className="rlm-card"
              onClick={() => { onOpen(recipe); onClose(); }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && (onOpen(recipe), onClose())}
            >
              {recipe.imageUrl ? (
                <img className="rlm-card-img" src={recipe.imageUrl} alt={recipe.name} loading="lazy" />
              ) : (
                <div className="rlm-card-img rlm-card-img--placeholder">
                  {CATEGORY_EMOJI[recipe.category] ?? '🍴'}
                </div>
              )}
              <div className="rlm-card-body">
                <div className="rlm-card-name">
                  {recipe.sourceUrl && <span className="rlm-link-badge" title="Uloženo jako odkaz">🔗</span>}
                  {recipe.name}
                </div>
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
              <div className="rlm-card-controls" onClick={e => e.stopPropagation()}>
                <button
                  className="rlm-ctrl-btn rlm-ctrl-btn--edit"
                  onClick={e => handleEdit(e, recipe)}
                  title="Upravit"
                >✏️</button>
                <button
                  className="rlm-ctrl-btn rlm-ctrl-btn--del"
                  onClick={e => handleDelete(e, recipe.id)}
                  title="Smazat"
                >🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Stránkování */}
        {totalPages > 1 && (
          <div className="rlm-pagination">
            <button
              className="rlm-page-btn"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >‹ Předchozí</button>
            <span className="rlm-page-info">{page + 1} / {totalPages}</span>
            <button
              className="rlm-page-btn"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >Další ›</button>
          </div>
        )}

      </div>
    </div>,
    document.getElementById('modal-root') ?? document.body,
  );
};

export default RecipeListModal;
