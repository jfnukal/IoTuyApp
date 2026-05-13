// src/components/Widgets/Recipes/RecipeImportModal.tsx
// Import receptu z URL — stáhne, naparsuje, ukáže náhled, umožní uložit nebo editovat.

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { firestoreService } from '../../../services/firestoreService';
import { parseRecipeFromUrl, type ImportedRecipe } from '../../../services/recipeImportService';
import type { Recipe, RecipeFormData, RecipeCategory } from '../../../types';
import './RecipeImportModal.css';

interface RecipeImportModalProps {
  onClose: () => void;
  /** Zavolá se s předvyplněnými daty → otevře RecipeForm */
  onEdit: (prefill: Partial<Recipe>) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name:        'Název',
  description: 'Popis',
  ingredients: 'Suroviny',
  steps:       'Postup',
  servings:    'Počet porcí',
  times:       'Čas přípravy',
  imageUrl:    'Fotka',
};

const CATEGORY_LABELS: Record<string, string> = {
  'polévka':     '🍲 Polévka',
  'hlavní jídlo':'🍽️ Hlavní jídlo',
  'dezert':      '🍰 Dezert',
  'pečení':      '🥐 Pečení',
  'salát':       '🥗 Salát',
  'příloha':     '🥔 Příloha',
  'nápoj':       '🥤 Nápoj',
  'ostatní':     '🍴 Ostatní',
};

const RecipeImportModal: React.FC<RecipeImportModalProps> = ({ onClose, onEdit }) => {
  const [url, setUrl]             = useState('');
  const [status, setStatus]       = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [data, setData]           = useState<ImportedRecipe | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [linkName, setLinkName]   = useState('');  // název pro "uložit jen odkaz"
  const inputRef                  = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus('loading');
    setErrorMsg('');
    setData(null);
    try {
      const result = await parseRecipeFromUrl(trimmed);
      setData(result);
      setLinkName(result.name || '');
      setStatus('done');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg.includes('internal') ? 'Stránku se nepodařilo načíst. Zkus jinou URL.' : msg);
      setStatus('error');
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const formData: RecipeFormData = {
        name:             data.name || 'Bez názvu',
        description:      data.description,
        category:         (data.category as RecipeCategory) || 'hlavní jídlo',
        seasonMonths:     [],
        ingredients:      data.ingredients,
        steps:            data.steps,
        ...(data.prepTime != null && { prepTime: data.prepTime }),
        ...(data.cookTime != null && { cookTime: data.cookTime }),
        ...(data.servings != null && { servings: data.servings }),
        youtubeLinks:     data.youtubeLinks,
        tags:             data.tags,
        imageUrl:         data.imageUrl || '',
        originalPhotoUrl: '',
        addedBy:          'url-import',
      };
      await firestoreService.addRecipe(formData);
      onClose();
    } catch (e) {
      console.error('RecipeImportModal save error:', e);
      setErrorMsg('Chyba při ukládání. Zkus to znovu.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    if (!data) return;
    // Sestavíme Partial<Recipe> pro předvyplnění RecipeForm
    const prefill: Partial<Recipe> = {
      name:         data.name,
      description:  data.description,
      category:     (data.category as RecipeCategory) || 'hlavní jídlo',
      seasonMonths: [],
      ingredients:  data.ingredients,
      steps:        data.steps,
      ...(data.prepTime != null && { prepTime: data.prepTime }),
      ...(data.cookTime != null && { cookTime: data.cookTime }),
      ...(data.servings != null && { servings: data.servings }),
      youtubeLinks: data.youtubeLinks,
      tags:         data.tags,
      imageUrl:     data.imageUrl || '',
      originalPhotoUrl: '',
      addedBy:      'url-import',
    } as Partial<Recipe>;
    onEdit(prefill);
  };

  const handleSaveLink = async () => {
    const name = linkName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const formData: RecipeFormData = {
        name,
        description:  data?.description || '',
        category:     ((data?.category as RecipeCategory) || 'ostatní'),
        seasonMonths: [],
        ingredients:  data?.ingredients ?? [],
        steps:        data?.steps ?? [],
        ...(data?.prepTime != null && { prepTime: data.prepTime }),
        ...(data?.cookTime != null && { cookTime: data.cookTime }),
        ...(data?.servings != null && { servings: data.servings }),
        youtubeLinks: data?.youtubeLinks ?? [],
        tags:         data?.tags ?? [],
        imageUrl:     data?.imageUrl || '',
        originalPhotoUrl: '',
        sourceUrl:    url.trim(),
        addedBy:      'url-link',
      };
      await firestoreService.addRecipe(formData);
      onClose();
    } catch (e) {
      console.error('RecipeImportModal saveLink error:', e);
      setErrorMsg('Chyba při ukládání. Zkus to znovu.');
    } finally {
      setSaving(false);
    }
  };

  const allFields = Object.keys(FIELD_LABELS);
  const missingSet = new Set(data?.missingFields ?? []);

  const modalRoot = document.getElementById('modal-root') ?? document.body;

  return createPortal(
    <div className="rim-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rim-dialog">

        {/* Záhlaví */}
        <div className="rim-header">
          <span className="rim-title">🔗 Import z URL</span>
          <button className="rim-close" onClick={onClose}>✕</button>
        </div>

        {/* URL vstup */}
        <div className="rim-url-row">
          <input
            ref={inputRef}
            className="rim-url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="https://www.example.com/recepty/gulash/"
            autoFocus
          />
          <button
            className="rim-analyze-btn"
            onClick={handleAnalyze}
            disabled={status === 'loading' || !url.trim()}
          >
            {status === 'loading' ? '⏳' : '🔍 Analyzovat'}
          </button>
        </div>

        {/* Stav načítání */}
        {status === 'loading' && (
          <div className="rim-loading">
            <div className="rim-spinner" />
            <span>Načítám a parsuju stránku…</span>
          </div>
        )}

        {/* Chyba */}
        {status === 'error' && (
          <div className="rim-error">❌ {errorMsg}</div>
        )}

        {/* Výsledek — náhled */}
        {status === 'done' && data && (
          <div className="rim-result">

            {/* Schema.org upozornění */}
            {!data.schemaFound && (
              <div className="rim-warn">
                ⚠️ Stránka neobsahuje strukturovaná data (JSON-LD). Data jsou pouze z meta tagů — pravděpodobně bude potřeba ruční doplnění.
              </div>
            )}

            {/* Hlavní info */}
            <div className="rim-recipe-head">
              {data.imageUrl && (
                <img className="rim-thumb" src={data.imageUrl} alt={data.name} loading="lazy" />
              )}
              <div className="rim-recipe-info">
                <div className="rim-recipe-name">{data.name || <em>bez názvu</em>}</div>
                <div className="rim-recipe-cat">{CATEGORY_LABELS[data.category] ?? data.category}</div>
                <div className="rim-recipe-meta">
                  {data.prepTime && <span>⏱ příprava {data.prepTime} min</span>}
                  {data.cookTime && <span>🔥 vaření {data.cookTime} min</span>}
                  {data.servings && <span>👤 {data.servings} porcí</span>}
                </div>
              </div>
            </div>

            {/* Přehled nalezených polí */}
            <div className="rim-fields">
              {allFields.map((field) => {
                const missing = missingSet.has(field);
                let detail = '';
                if (!missing) {
                  if (field === 'ingredients') detail = `${data.ingredients.length} položek`;
                  else if (field === 'steps')  detail = `${data.steps.length} kroků`;
                  else if (field === 'times')  detail = [data.prepTime && `${data.prepTime} min příprava`, data.cookTime && `${data.cookTime} min vaření`].filter(Boolean).join(' + ');
                  else if (field === 'servings') detail = String(data.servings);
                  else if (field === 'imageUrl') detail = '✓';
                  else if (field === 'name') detail = data.name;
                  else if (field === 'description') detail = data.description.slice(0, 60) + (data.description.length > 60 ? '…' : '');
                }
                return (
                  <div key={field} className={`rim-field ${missing ? 'rim-field--missing' : 'rim-field--ok'}`}>
                    <span className="rim-field-icon">{missing ? '❌' : '✅'}</span>
                    <span className="rim-field-label">{FIELD_LABELS[field]}</span>
                    {detail && <span className="rim-field-detail">{detail}</span>}
                  </div>
                );
              })}
            </div>

            {/* YouTube */}
            {data.youtubeLinks.length > 0 && (
              <div className="rim-yt">
                🎬 Video nalezeno: <a href={data.youtubeLinks[0]} target="_blank" rel="noopener noreferrer">{data.youtubeLinks[0]}</a>
              </div>
            )}

            {/* Tagy */}
            {data.tags.length > 0 && (
              <div className="rim-tags">
                {data.tags.map((t) => <span key={t} className="rim-tag">{t}</span>)}
              </div>
            )}

            {/* Ingredience — preview */}
            {data.ingredients.length > 0 && (
              <details className="rim-details">
                <summary>Suroviny ({data.ingredients.length})</summary>
                <ul className="rim-ing-list">
                  {data.ingredients.map((ing, i) => (
                    <li key={i}>
                      {ing.amount && <strong>{ing.amount} {ing.unit}</strong>}{' '}
                      {ing.name}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Postup — preview */}
            {data.steps.length > 0 && (
              <details className="rim-details">
                <summary>Postup ({data.steps.length} kroků)</summary>
                <ol className="rim-steps-list">
                  {data.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </details>
            )}

            {errorMsg && <div className="rim-error">{errorMsg}</div>}
          </div>
        )}

        {/* Sekce: Uložit jen odkaz */}
        {status === 'done' && data && (
          <div className="rim-save-link">
            <div className="rim-save-link__label">
              🔗 <strong>Uložit jen jako odkaz</strong>
              <span className="rim-save-link__hint">— uloží URL, recepty doplníš ručně později</span>
            </div>
            <div className="rim-save-link__row">
              <input
                className="rim-save-link__input"
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
                placeholder="Název receptu (povinný) *"
              />
              <button
                className="rim-btn rim-btn--link"
                onClick={handleSaveLink}
                disabled={saving || !linkName.trim()}
              >
                {saving ? 'Ukládám…' : '🔗 Uložit odkaz'}
              </button>
            </div>
          </div>
        )}

        {/* Patička */}
        {status === 'done' && data && (
          <div className="rim-footer">
            <button className="rim-btn rim-btn--cancel" onClick={onClose}>✕ Zrušit</button>
            <div className="rim-footer-right">
              <button className="rim-btn rim-btn--edit" onClick={handleEdit}>
                ✏️ Editovat
              </button>
              <button
                className="rim-btn rim-btn--save"
                onClick={handleSave}
                disabled={saving || !data.name}
              >
                {saving ? 'Ukládám…' : '💾 Uložit vše'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    modalRoot,
  );
};

export default RecipeImportModal;
