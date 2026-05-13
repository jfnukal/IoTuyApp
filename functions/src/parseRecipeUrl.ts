// functions/src/parseRecipeUrl.ts
// Cloud Function — stáhne URL, parsuje Schema.org JSON-LD Recipe,
// vrátí strukturovaná data pro import do kuchařky.

import * as functions from 'firebase-functions';

// ── Typy ─────────────────────────────────────────────────────────

export interface ParsedIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface ParsedRecipeResult {
  name: string;
  description: string;
  category: string;
  ingredients: ParsedIngredient[];
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

// ── Pomocné funkce ────────────────────────────────────────────────

/** ISO 8601 duration → minuty. PT1H30M → 90, PT20M → 20 */
function parseDuration(iso: string): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const d = parseInt(m[1] || '0');
  const h = parseInt(m[2] || '0');
  const min = parseInt(m[3] || '0');
  const total = d * 24 * 60 + h * 60 + min;
  return total > 0 ? total : undefined;
}

/** Česky i anglicky — běžné jednotky */
const UNITS = new Set([
  'g', 'kg', 'mg', 'ml', 'l', 'dl', 'cl',
  'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb',
  'lžíce', 'lžičky', 'lžička', 'hrnek', 'hrnky', 'hrnku',
  'ks', 'kus', 'kusy', 'kusů',
  'špetka', 'špetky', 'špetku',
  'balíček', 'sáček', 'sáčky', 'sáčku',
  'plátky', 'plátek', 'plátků',
  'stroužky', 'stroužek', 'stroužků',
  'větvička', 'větvičky', 'list', 'listy',
  'kapka', 'kapky', 'kapek',
]);

/** "200 g hladká mouka" → { name, amount, unit } */
function parseIngredient(raw: string): ParsedIngredient {
  const text = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const parts = text.split(/\s+/);
  let amount = '';
  let unit = '';
  let nameStart = 0;

  // První token číslicový? (200, 1/2, ½, ¾, …)
  if (parts[0] && /^[\d.,/½⅓¼¾⅔⅛⅜⅝⅞]+$/.test(parts[0])) {
    amount = parts[0].replace(',', '.');
    nameStart = 1;
    // Druhý token jednotka?
    if (parts[1] && UNITS.has(parts[1].toLowerCase())) {
      unit = parts[1];
      nameStart = 2;
    }
  }

  return {
    name: parts.slice(nameStart).join(' ') || text,
    amount,
    unit,
  };
}

/** Schema.org kategorie → naše RecipeCategory */
function mapCategory(raw: string | string[]): string {
  const s = (Array.isArray(raw) ? raw.join(' ') : String(raw)).toLowerCase();
  if (/polévka|soup|vývar/.test(s)) return 'polévka';
  if (/salát|salad/.test(s)) return 'salát';
  if (/nápoj|drink|beverage|smoothie|koktejl/.test(s)) return 'nápoj';
  if (/příloha|side|garnish/.test(s)) return 'příloha';
  if (/dezert|dessert|zmrzlin|sladkost|pudink|mousse/.test(s)) return 'dezert';
  if (/pečení|baking|cake|bread|závin|koláč|vafle|waffle|palačink|muffin|croissant|strudl|roll|bun/.test(s)) return 'pečení';
  return 'hlavní jídlo';
}

/** Extrahuje YouTube watch URL z různých formátů embed */
function extractYouTube(video: unknown): string | null {
  if (!video) return null;
  const candidates: string[] = [];

  const pushFromObj = (v: Record<string, unknown>) => {
    ['embedUrl', 'contentUrl', 'url', '@id'].forEach((k) => {
      if (v[k]) candidates.push(String(v[k]));
    });
  };

  if (typeof video === 'string') candidates.push(video);
  else if (Array.isArray(video)) {
    video.forEach((v) => {
      if (typeof v === 'string') candidates.push(v);
      else if (v && typeof v === 'object') pushFromObj(v as Record<string, unknown>);
    });
  } else if (typeof video === 'object' && video !== null) {
    pushFromObj(video as Record<string, unknown>);
  }

  for (const url of candidates) {
    const m = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
  }
  return null;
}

/** Extrahuje první string URL z image pole (string | object | array) */
function extractImageUrl(img: unknown): string {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return extractImageUrl(img[0]);
  if (typeof img === 'object' && img !== null) {
    const o = img as Record<string, unknown>;
    return String(o.url || o['@id'] || o.contentUrl || '');
  }
  return '';
}

// ── Cloud Function ────────────────────────────────────────────────

export const parseRecipeUrl = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data: { url: string }) => {
    const { url } = data;

    if (!url || typeof url !== 'string' || !/^https?:\/\/.+/.test(url)) {
      throw new functions.https.HttpsError('invalid-argument', 'Neplatná URL adresa.');
    }

    // ── Fetch HTML ──────────────────────────────────────────────
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'cs,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (e: unknown) {
      throw new functions.https.HttpsError(
        'internal',
        `Nepodařilo se načíst stránku: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // ── Hledáme JSON-LD ────────────────────────────────────────
    const jsonLdBlocks = [...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )];

    let schema: Record<string, unknown> | null = null;

    for (const block of jsonLdBlocks) {
      try {
        const parsed = JSON.parse(block[1]);
        const candidates: unknown[] = parsed?.['@graph']
          ? (parsed['@graph'] as unknown[])
          : [parsed];
        for (const c of candidates) {
          if (c && typeof c === 'object') {
            const t = (c as Record<string, unknown>)['@type'];
            if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) {
              schema = c as Record<string, unknown>;
              break;
            }
          }
        }
        if (schema) break;
      } catch { /* nevalidní JSON, přeskočíme */ }
    }

    // ── Sestavujeme výsledek ───────────────────────────────────
    const result: ParsedRecipeResult = {
      name: '',
      description: '',
      category: 'hlavní jídlo',
      ingredients: [],
      steps: [],
      youtubeLinks: [],
      tags: [],
      imageUrl: '',
      missingFields: [],
      sourceUrl: url,
      schemaFound: !!schema,
    };

    if (schema) {
      // Název
      result.name = String(schema.name || '').replace(/<[^>]+>/g, '').trim();

      // Popis
      result.description = String(schema.description || '').replace(/<[^>]+>/g, '').trim();

      // Kategorie
      if (schema.recipeCategory) {
        result.category = mapCategory(schema.recipeCategory as string | string[]);
      }

      // Porce
      if (schema.recipeYield) {
        const y = Array.isArray(schema.recipeYield)
          ? schema.recipeYield[0]
          : schema.recipeYield;
        const num = parseInt(String(y));
        if (!isNaN(num) && num > 0) result.servings = num;
      }

      // Časy
      if (schema.prepTime) result.prepTime = parseDuration(String(schema.prepTime));
      if (schema.cookTime) result.cookTime = parseDuration(String(schema.cookTime));
      if (!result.prepTime && !result.cookTime && schema.totalTime) {
        const total = parseDuration(String(schema.totalTime));
        if (total) result.prepTime = total;
      }

      // Suroviny
      if (Array.isArray(schema.recipeIngredient)) {
        result.ingredients = (schema.recipeIngredient as string[]).map(parseIngredient);
      }

      // Postup
      if (Array.isArray(schema.recipeInstructions)) {
        result.steps = (schema.recipeInstructions as unknown[]).flatMap((s) => {
          if (typeof s === 'string') return [s.replace(/<[^>]+>/g, '').trim()];
          if (s && typeof s === 'object') {
            const o = s as Record<string, unknown>;
            // HowToSection má itemListElement
            if (o['@type'] === 'HowToSection' && Array.isArray(o.itemListElement)) {
              return (o.itemListElement as unknown[]).map((item) => {
                if (typeof item === 'string') return item.trim();
                const i = item as Record<string, unknown>;
                return String(i.text || i.name || '').replace(/<[^>]+>/g, '').trim();
              });
            }
            return [String(o.text || o.name || '').replace(/<[^>]+>/g, '').trim()];
          }
          return [String(s).trim()];
        }).filter(Boolean);
      }

      // Obrázek
      result.imageUrl = extractImageUrl(schema.image);

      // Video → YouTube
      if (schema.video) {
        const yt = extractYouTube(schema.video);
        if (yt) result.youtubeLinks.push(yt);
      }

      // Tagy / klíčová slova
      if (schema.keywords) {
        const kw = Array.isArray(schema.keywords)
          ? (schema.keywords as string[]).join(',')
          : String(schema.keywords);
        result.tags = kw
          .split(/[,;]/)
          .map((t: string) => t.trim())
          .filter(Boolean)
          .slice(0, 10);
      }
    } else {
      // Fallback: Open Graph meta tagy
      const pick = (pattern: RegExp) => {
        const m = html.match(pattern);
        return m ? m[1].trim() : '';
      };
      result.name = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
        || pick(/<title>([^<]+)<\/title>/i);
      result.description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
        || pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      result.imageUrl = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    }

    // ── Chybějící pole ─────────────────────────────────────────
    if (!result.name)                 result.missingFields.push('name');
    if (!result.description)          result.missingFields.push('description');
    if (!result.ingredients.length)   result.missingFields.push('ingredients');
    if (!result.steps.length)         result.missingFields.push('steps');
    if (!result.servings)             result.missingFields.push('servings');
    if (!result.prepTime && !result.cookTime) result.missingFields.push('times');
    if (!result.imageUrl)             result.missingFields.push('imageUrl');

    return result;
  });
