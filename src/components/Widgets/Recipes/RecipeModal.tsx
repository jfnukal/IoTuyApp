// src/components/Widgets/Recipes/RecipeModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Recipe } from '../../../types';
import './RecipeModal.css';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v');
    }
    if (!videoId) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose, onEdit, onDelete }) => {
  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
  const validYoutube = (recipe.youtubeLinks ?? [])
    .map((url) => ({ url, embed: getYoutubeEmbedUrl(url) }))
    .filter((x) => x.embed !== null) as { url: string; embed: string }[];

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="rmodal-overlay" onClick={onClose}>
      <div className="rmodal-notebook" onClick={(e) => e.stopPropagation()}>

        {/* Spirálová vazba — dekorace */}
        <div className="rmodal-spiral">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="rmodal-spiral__ring" />
          ))}
        </div>

        {/* Pravá strana zápisníku */}
        <div className="rmodal-page">

          {/* Záhlaví */}
          <div className="rmodal-header">
            {recipe.originalPhotoUrl && (
              <img
                src={recipe.originalPhotoUrl}
                alt="originál receptu"
                className="rmodal-header__original"
              />
            )}
            <div className="rmodal-header__text">
              <h2 className="rmodal-title">{recipe.name}</h2>
              {recipe.description && (
                <p className="rmodal-description">{recipe.description}</p>
              )}
              {recipe.sourceUrl && (
                <a
                  className="rmodal-source-link"
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                >
                  🔗 Otevřít originální recept ↗
                </a>
              )}
              <div className="rmodal-meta">
                {totalTime > 0 && <span>⏱ {totalTime} min</span>}
                {recipe.prepTime && recipe.cookTime && (
                  <span className="rmodal-meta__detail">
                    ({recipe.prepTime} příprava + {recipe.cookTime} vaření)
                  </span>
                )}
                {recipe.servings && <span>👤 {recipe.servings} porcí</span>}
                {recipe.category && <span className="rmodal-tag">{recipe.category}</span>}
              </div>
            </div>
          </div>

          {/* Dělicí čára — rukou kreslená */}
          <div className="rmodal-divider" />

          {/* Obsah — 2 sloupce */}
          <div className="rmodal-body">

            {/* Levý sloupec — ingredience (1/3) */}
            <aside className="rmodal-ingredients">
              <h3 className="rmodal-section-title">✍ Suroviny</h3>
              <ul className="rmodal-ing-list">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="rmodal-ing-item">
                    <span className="rmodal-ing-name">{ing.name}</span>
                    {ing.amount && (
                      <span className="rmodal-ing-amount">
                        {ing.amount} {ing.unit}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Tagy */}
              {recipe.tags.length > 0 && (
                <div className="rmodal-tags">
                  {recipe.tags.map((t) => (
                    <span key={t} className="rmodal-tag rmodal-tag--small">#{t}</span>
                  ))}
                </div>
              )}
            </aside>

            {/* Pravý sloupec — postup (2/3) */}
            <main className="rmodal-steps">
              <h3 className="rmodal-section-title">📜 Postup</h3>
              <ol className="rmodal-step-list">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="rmodal-step-item">
                    <span className="rmodal-step-number">{i + 1}</span>
                    <span className="rmodal-step-text">{step}</span>
                  </li>
                ))}
              </ol>

              {/* YouTube videa */}
              {validYoutube.length > 0 && (
                <div className="rmodal-videos">
                  <h3 className="rmodal-section-title">▶ Video</h3>
                  <div className="rmodal-video-tabs">
                    {validYoutube.map((_v, i) => (
                      <button
                        key={i}
                        className={`rmodal-video-tab ${activeVideo === i ? 'active' : ''}`}
                        onClick={() => setActiveVideo(activeVideo === i ? null : i)}
                      >
                        Video {i + 1}
                      </button>
                    ))}
                  </div>
                  {activeVideo !== null && validYoutube[activeVideo] && (
                    <div className="rmodal-video-frame">
                      <iframe
                        src={validYoutube[activeVideo].embed}
                        title={`Video ${activeVideo + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>

          {/* Patička — akce */}
          <div className="rmodal-footer">
            <button className="rmodal-btn rmodal-btn--edit" onClick={() => onEdit(recipe)}>
              ✏️ Upravit
            </button>
            <button
              className="rmodal-btn rmodal-btn--delete"
              onClick={() => onDelete(recipe.id)}
            >
              🗑️ Smazat
            </button>
            <button className="rmodal-btn rmodal-btn--close" onClick={onClose}>
              Zavřít
            </button>
          </div>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default RecipeModal;
