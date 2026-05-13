// src/components/Widgets/Recipes/RecipeForm.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { firestoreService } from '../../../services/firestoreService';
import type { Recipe, RecipeFormData, RecipeCategory, RecipeIngredient } from '../../../types';
import './RecipeForm.css';

interface RecipeFormProps {
  recipe?: Recipe;
  /** Předvyplnění bez editačního módu (import z URL) */
  prefill?: Partial<Recipe>;
  onClose: () => void;
}

const CATEGORIES: RecipeCategory[] = [
  'polévka', 'hlavní jídlo', 'dezert', 'pečení', 'salát', 'příloha', 'nápoj', 'ostatní',
];

const MONTH_LABELS = [
  'Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn',
  'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro',
];

const emptyIngredient = (): RecipeIngredient => ({ name: '', amount: '', unit: '' });

const RecipeForm: React.FC<RecipeFormProps> = ({ recipe, prefill, onClose }) => {
  const isEdit = !!recipe;
  // Zdroj dat: editace existujícího receptu NEBO předvyplnění z importu
  const src = recipe ?? prefill;

  const [name, setName] = useState(src?.name ?? '');
  const [description, setDescription] = useState(src?.description ?? '');
  const [category, setCategory] = useState<RecipeCategory>(src?.category ?? 'hlavní jídlo');
  const [seasonMonths, setSeasonMonths] = useState<number[]>(src?.seasonMonths ?? []);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    src?.ingredients?.length ? src.ingredients : [emptyIngredient()]
  );
  const [steps, setSteps] = useState<string[]>(
    src?.steps?.length ? src.steps : ['']
  );
  const [prepTime, setPrepTime] = useState(src?.prepTime?.toString() ?? '');
  const [cookTime, setCookTime] = useState(src?.cookTime?.toString() ?? '');
  const [servings, setServings] = useState(src?.servings?.toString() ?? '');
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>(
    src?.youtubeLinks?.length ? src.youtubeLinks : ['', '']
  );
  const [tags, setTags] = useState(src?.tags?.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleMonth = (m: number) => {
    setSeasonMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    );
  };

  // Ingredience
  const updateIng = (i: number, field: keyof RecipeIngredient, val: string) => {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));
  };
  const addIng = () => setIngredients((prev) => [...prev, emptyIngredient()]);
  const removeIng = (i: number) => setIngredients((prev) => prev.filter((_, idx) => idx !== i));

  // Kroky
  const updateStep = (i: number, val: string) => {
    setSteps((prev) => prev.map((s, idx) => idx === i ? val : s));
  };
  const addStep = () => setSteps((prev) => [...prev, '']);
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name.trim()) { setError('Název receptu je povinný.'); return; }
    setSaving(true);
    setError('');

    const data: RecipeFormData = {
      name: name.trim(),
      description: description.trim(),
      category,
      seasonMonths,
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.trim()),
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      youtubeLinks: youtubeLinks.filter((l) => l.trim()),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      addedBy: 'user',
      originalPhotoUrl: recipe?.originalPhotoUrl ?? '',
      imageUrl: recipe?.imageUrl ?? '',
    };

    try {
      if (isEdit && recipe) {
        await firestoreService.updateRecipe(recipe.id, data);
      } else {
        await firestoreService.addRecipe(data);
      }
      onClose();
    } catch (e) {
      console.error('RecipeForm save error:', e);
      setError('Chyba při ukládání. Zkus to znovu.');
    } finally {
      setSaving(false);
    }
  };

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="rform-overlay" onClick={onClose}>
      <div className="rform-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="rform-header">
          <h2 className="rform-title">{isEdit ? '✏️ Upravit recept' : '📖 Nový recept'}</h2>
          <button className="rform-close" onClick={onClose}>✕</button>
        </div>

        <div className="rform-body">
          {/* Název + kategorie */}
          <div className="rform-row rform-row--2col">
            <div className="rform-field">
              <label className="rform-label">Název *</label>
              <input
                className="rform-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Název receptu"
              />
            </div>
            <div className="rform-field">
              <label className="rform-label">Kategorie</label>
              <select className="rform-input" value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Popis */}
          <div className="rform-field">
            <label className="rform-label">Popis (volitelný)</label>
            <textarea
              className="rform-input rform-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krátký popis..."
            />
          </div>

          {/* Sezona */}
          <div className="rform-field">
            <label className="rform-label">Sezóna (prázdné = celý rok)</label>
            <div className="rform-months">
              {MONTH_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`rform-month ${seasonMonths.includes(idx + 1) ? 'active' : ''}`}
                  onClick={() => toggleMonth(idx + 1)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Časy + porce */}
          <div className="rform-row rform-row--3col">
            <div className="rform-field">
              <label className="rform-label">Příprava (min)</label>
              <input className="rform-input" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="20" />
            </div>
            <div className="rform-field">
              <label className="rform-label">Vaření (min)</label>
              <input className="rform-input" type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="60" />
            </div>
            <div className="rform-field">
              <label className="rform-label">Počet porcí</label>
              <input className="rform-input" type="number" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
            </div>
          </div>

          {/* Ingredience */}
          <div className="rform-field">
            <label className="rform-label">Suroviny</label>
            <div className="rform-ing-list">
              {ingredients.map((ing, i) => (
                <div key={i} className="rform-ing-row">
                  <input
                    className="rform-input rform-ing-name"
                    value={ing.name}
                    onChange={(e) => updateIng(i, 'name', e.target.value)}
                    placeholder="Surovina"
                  />
                  <input
                    className="rform-input rform-ing-amount"
                    value={ing.amount}
                    onChange={(e) => updateIng(i, 'amount', e.target.value)}
                    placeholder="Množství"
                  />
                  <input
                    className="rform-input rform-ing-unit"
                    value={ing.unit}
                    onChange={(e) => updateIng(i, 'unit', e.target.value)}
                    placeholder="Jedn."
                  />
                  <button type="button" className="rform-remove-btn" onClick={() => removeIng(i)}>✕</button>
                </div>
              ))}
              <button type="button" className="rform-add-btn" onClick={addIng}>+ Přidat surovinu</button>
            </div>
          </div>

          {/* Postup */}
          <div className="rform-field">
            <label className="rform-label">Postup</label>
            <div className="rform-steps-list">
              {steps.map((step, i) => (
                <div key={i} className="rform-step-row">
                  <span className="rform-step-num">{i + 1}.</span>
                  <textarea
                    className="rform-input rform-textarea rform-step-input"
                    rows={2}
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Krok ${i + 1}...`}
                  />
                  <button type="button" className="rform-remove-btn" onClick={() => removeStep(i)}>✕</button>
                </div>
              ))}
              <button type="button" className="rform-add-btn" onClick={addStep}>+ Přidat krok</button>
            </div>
          </div>

          {/* YouTube */}
          <div className="rform-field">
            <label className="rform-label">YouTube videa (max 2)</label>
            {[0, 1].map((i) => (
              <input
                key={i}
                className="rform-input"
                style={{ marginBottom: 6 }}
                value={youtubeLinks[i] ?? ''}
                onChange={(e) => {
                  const next = [...youtubeLinks];
                  next[i] = e.target.value;
                  setYoutubeLinks(next);
                }}
                placeholder={`https://youtube.com/watch?v=...`}
              />
            ))}
          </div>

          {/* Tagy */}
          <div className="rform-field">
            <label className="rform-label">Tagy (oddělené čárkou)</label>
            <input
              className="rform-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="česká klasika, hovězí, nedělní oběd"
            />
          </div>

          {error && <p className="rform-error">{error}</p>}
        </div>

        <div className="rform-footer">
          <button className="rform-btn rform-btn--cancel" onClick={onClose}>Zrušit</button>
          <button className="rform-btn rform-btn--save" onClick={handleSave} disabled={saving}>
            {saving ? 'Ukládám...' : isEdit ? '💾 Uložit změny' : '📖 Přidat recept'}
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default RecipeForm;
