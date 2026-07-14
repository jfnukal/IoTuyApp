// functions/src/parseRecipeUrl.ts
// Cloud Function — stáhne URL, parsuje Schema.org JSON-LD Recipe,
// při chybějících datech fallback na HTML scraping.

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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
  aiUsed?: boolean;
}

// ── Obecné utility ────────────────────────────────────────────────

/** Odstraní HTML tagy a dekóduje základní entity */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  'balení', 'balíček', 'sáček', 'sáčky', 'sáčku',
  'plátky', 'plátek', 'plátků',
  'stroužky', 'stroužek', 'stroužků',
  'větvička', 'větvičky', 'list', 'listy',
  'kapka', 'kapky', 'kapek',
]);

/** "200 g hladká mouka" → { name, amount, unit } */
function parseIngredient(raw: string): ParsedIngredient {
  const text = stripHtml(raw);
  const parts = text.split(/\s+/);
  let amount = '';
  let unit = '';
  let nameStart = 0;

  if (parts[0] && /^[\d.,/½⅓¼¾⅔⅛⅜⅝⅞]+$/.test(parts[0])) {
    amount = parts[0].replace(',', '.');
    nameStart = 1;
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

/** Extrahuje první string URL z image (string | object | array) */
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

// ── HTML Scraping Fallback ─────────────────────────────────────────

const ING_HEADING  = /suroviny|ingredien|ingredients?|složení/i;
const STEP_HEADING = /postup|návod|příprava|instrukc|kroky?|steps?|directions?|method/i;
const UNIT_PATTERN = /\b(\d[\d.,/]*)\s*(g|kg|ml|l|dl|ks|lžíce?|lžičky?|hrnek|hrnky?|špetka?|balení|sáček)/i;

/** Scraping surovin z HTML když JSON-LD chybí nebo je neúplné */
function scrapeIngredients(html: string): ParsedIngredient[] {
  const items: string[] = [];

  // 1. Kontejner s ingredient třídou/id
  const containerRe = /<(?:div|ul|ol|section)[^>]+(?:class|id)="[^"]*(?:suroviny|ingredien|ingredient|ing[-_]list)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|ul|ol|section)>/gi;
  for (const m of html.matchAll(containerRe)) {
    for (const li of m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1]);
      if (t && t.length < 150) items.push(t);
    }
    if (items.length >= 3) break;
  }

  // 2. ul/ol za headingem se "suroviny"
  if (items.length < 3) {
    const headingSplit = html.split(/<h[1-6][^>]*>/i);
    for (const chunk of headingSplit) {
      const htEnd = chunk.indexOf('<');
      if (htEnd < 0) continue;
      if (!ING_HEADING.test(stripHtml(chunk.slice(0, htEnd)))) continue;
      const ul = chunk.match(/<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i);
      if (ul) {
        for (const li of ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
          const t = stripHtml(li[1]);
          if (t && t.length < 150) items.push(t);
        }
        if (items.length >= 3) break;
      }
    }
  }

  // 3. li elementy které vypadají jako ingredience (číslo + jednotka)
  if (items.length < 3) {
    for (const li of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1]);
      if (UNIT_PATTERN.test(t) && t.length < 150) items.push(t);
    }
  }

  return items
    .map(parseIngredient)
    .filter((i) => i.name.length > 1)
    .slice(0, 35);
}

/** Scraping kroků postupu z HTML */
function scrapeSteps(html: string): string[] {
  const steps: string[] = [];

  // 1. Kontejner se step třídou/id
  const containerRe = /<(?:div|section|ol|ul)[^>]+(?:class|id)="[^"]*(?:postup|kroky?|příprava|instrukc|steps?|directions?|method|recipe[-_]step)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|ol|ul)>/gi;
  for (const m of html.matchAll(containerRe)) {
    for (const item of m[1].matchAll(/<(?:li|p)[^>]*>([\s\S]*?)<\/(?:li|p)>/gi)) {
      const t = stripHtml(item[1]);
      if (t && t.length > 15) steps.push(t);
    }
    if (steps.length >= 3) break;
  }

  // 2. ol/p za headingem se "postup"
  if (steps.length < 3) {
    const headingSplit = html.split(/<h[1-6][^>]*>/i);
    for (const chunk of headingSplit) {
      const htEnd = chunk.indexOf('<');
      if (htEnd < 0) continue;
      if (!STEP_HEADING.test(stripHtml(chunk.slice(0, htEnd)))) continue;
      const ol = chunk.match(/<(?:ol|ul)[^>]*>([\s\S]*?)<\/(?:ol|ul)>/i);
      if (ol) {
        for (const li of ol[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
          const t = stripHtml(li[1]);
          if (t && t.length > 15) steps.push(t);
        }
      }
      if (steps.length < 3) {
        for (const p of chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
          const t = stripHtml(p[1]);
          if (t && t.length > 20) steps.push(t);
        }
      }
      if (steps.length >= 3) break;
    }
  }

  return steps.filter((s) => s.length > 10).slice(0, 20);
}

// ── Gemini fallback ────────────────────────────────────────────────
// Poslední záchrana: když JSON-LD ani HTML scraping nedají suroviny/postup,
// pošleme text stránky do Gemini a necháme ho recept vytáhnout.

let cachedGeminiKey: string | null = null;
async function getGeminiKey(): Promise<string> {
  if (cachedGeminiKey) return cachedGeminiKey;
  const doc = await admin.firestore().collection('appConfig').doc('apiKeys').get();
  cachedGeminiKey = doc.data()?.gemini || '';
  return cachedGeminiKey || '';
}

interface GeminiRecipe {
  name?: string;
  description?: string;
  category?: string;
  ingredients?: { name?: string; amount?: string; unit?: string }[];
  steps?: string[];
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  tags?: string[];
}

// Modely zkoušíme postupně — Google je průběžně vypíná pro nové klíče,
// alias *-latest by měl mířit vždy na aktuální verzi.
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash', 'gemini-3-flash'];
let workingModel: string | null = null;

async function callGemini(key: string, body: unknown): Promise<Response | null> {
  const models = workingModel ? [workingModel, ...GEMINI_MODELS.filter(m => m !== workingModel)] : GEMINI_MODELS;
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (res.ok) {
      if (workingModel !== model) console.log(`Gemini: používám model ${model}`);
      workingModel = model;
      return res;
    }
    if (res.status === 404) {
      console.warn(`Gemini: model ${model} nedostupný (404), zkouším další…`);
      continue;
    }
    console.error(`Gemini: HTTP ${res.status}`, await res.text().catch(() => ''));
    return null;
  }
  console.error('Gemini: žádný z modelů není dostupný:', GEMINI_MODELS.join(', '));
  return null;
}

async function geminiRecipeFallback(html: string, url: string): Promise<GeminiRecipe | null> {
  const key = await getGeminiKey();
  if (!key) {
    console.warn('Gemini fallback: chybí klíč ve Firestore appConfig/apiKeys');
    return null;
  }

  // HTML → čistý text, omezený na rozumnou délku (recepty jsou krátké)
  const pageText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40000);

  const prompt = `Z následujícího textu webové stránky (${url}) vytáhni recept.
Odpověz POUZE validním JSON objektem s těmito poli (chybějící vynech):
{
  "name": "název receptu",
  "description": "krátký popis (1-2 věty)",
  "category": "jedna z: polévka | salát | nápoj | příloha | dezert | pečení | hlavní jídlo",
  "ingredients": [{ "name": "hladká mouka", "amount": "200", "unit": "g" }],
  "steps": ["krok 1", "krok 2"],
  "servings": 4,
  "prepTime": 20,
  "cookTime": 60,
  "tags": ["štítek"]
}
prepTime a cookTime jsou v minutách. Suroviny a kroky přepiš věrně, nic nevymýšlej.
Pokud text žádný recept neobsahuje, vrať {}.

TEXT STRÁNKY:
${pageText}`;

  try {
    const res = await callGemini(key, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    if (!res) return null;
    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as GeminiRecipe;
    // Prázdný objekt = Gemini na stránce recept nenašel
    if (!parsed || (!parsed.ingredients?.length && !parsed.steps?.length)) return null;
    return parsed;
  } catch (e) {
    console.error('Gemini fallback selhal:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Cloud Function ────────────────────────────────────────────────

export const parseRecipeUrl = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
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

    // ── JSON-LD ────────────────────────────────────────────────
    let schema: Record<string, unknown> | null = null;
    for (const block of html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )) {
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
      } catch { /* přeskočíme nevalidní JSON */ }
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
      result.name        = stripHtml(String(schema.name        || ''));
      result.description = stripHtml(String(schema.description || ''));

      if (schema.recipeCategory) {
        result.category = mapCategory(schema.recipeCategory as string | string[]);
      }
      if (schema.recipeYield) {
        const y = Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield;
        const n = parseInt(String(y));
        if (!isNaN(n) && n > 0) result.servings = n;
      }
      if (schema.prepTime) result.prepTime = parseDuration(String(schema.prepTime));
      if (schema.cookTime) result.cookTime  = parseDuration(String(schema.cookTime));
      if (!result.prepTime && !result.cookTime && schema.totalTime) {
        result.prepTime = parseDuration(String(schema.totalTime));
      }
      if (Array.isArray(schema.recipeIngredient)) {
        result.ingredients = (schema.recipeIngredient as string[]).map(parseIngredient);
      }
      if (Array.isArray(schema.recipeInstructions)) {
        result.steps = (schema.recipeInstructions as unknown[]).flatMap((s) => {
          if (typeof s === 'string') return [stripHtml(s)];
          if (s && typeof s === 'object') {
            const o = s as Record<string, unknown>;
            if (o['@type'] === 'HowToSection' && Array.isArray(o.itemListElement)) {
              return (o.itemListElement as unknown[]).map((item) => {
                const i = item as Record<string, unknown>;
                return stripHtml(String(i.text || i.name || ''));
              });
            }
            return [stripHtml(String(o.text || o.name || ''))];
          }
          return [String(s).trim()];
        }).filter(Boolean);
      }
      result.imageUrl = extractImageUrl(schema.image);
      if (schema.video) {
        const yt = extractYouTube(schema.video);
        if (yt) result.youtubeLinks.push(yt);
      }
      if (schema.keywords) {
        const kw = Array.isArray(schema.keywords)
          ? (schema.keywords as string[]).join(',')
          : String(schema.keywords);
        result.tags = kw.split(/[,;]/).map((t) => t.trim()).filter(Boolean).slice(0, 10);
      }
    } else {
      // Fallback: Open Graph / meta tagy
      const pick = (re: RegExp) => { const m = html.match(re); return m ? m[1].trim() : ''; };
      result.name        = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                        || pick(/<title>([^<]+)<\/title>/i);
      result.description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                        || pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      result.imageUrl    = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    }

    // ── HTML scraping fallback pro chybějící suroviny / postup ─
    if (!result.ingredients.length) {
      result.ingredients = scrapeIngredients(html);
    }
    if (!result.steps.length) {
      result.steps = scrapeSteps(html);
    }
    // Zkusíme doplnit obrázek z og:image pokud JSON-LD ho nemělo
    if (!result.imageUrl) {
      const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (m) result.imageUrl = m[1];
    }
    // YouTube z iframe v HTML
    if (!result.youtubeLinks.length) {
      const iframeYt = html.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (iframeYt) result.youtubeLinks.push(`https://www.youtube.com/watch?v=${iframeYt[1]}`);
    }

    // ── Gemini fallback: když stále chybí suroviny nebo postup ─
    if (!result.ingredients.length || !result.steps.length || !result.name) {
      console.log('🤖 Scraping nestačil, zkouším Gemini fallback…');
      const ai = await geminiRecipeFallback(html, url);
      if (ai) {
        result.aiUsed = true;
        if (!result.name && ai.name)               result.name = ai.name;
        if (!result.description && ai.description) result.description = ai.description;
        if (ai.category && !schema?.recipeCategory) result.category = mapCategory(ai.category);
        if (!result.ingredients.length && ai.ingredients?.length) {
          result.ingredients = ai.ingredients
            .map((i) => ({
              name: String(i.name || '').trim(),
              amount: String(i.amount ?? '').trim(),
              unit: String(i.unit ?? '').trim(),
            }))
            .filter((i) => i.name.length > 1)
            .slice(0, 35);
        }
        if (!result.steps.length && ai.steps?.length) {
          result.steps = ai.steps.map((s) => String(s).trim()).filter((s) => s.length > 3).slice(0, 20);
        }
        if (!result.servings && ai.servings && ai.servings > 0) result.servings = ai.servings;
        if (!result.prepTime && ai.prepTime && ai.prepTime > 0)  result.prepTime = ai.prepTime;
        if (!result.cookTime && ai.cookTime && ai.cookTime > 0)  result.cookTime = ai.cookTime;
        if (!result.tags.length && ai.tags?.length) {
          result.tags = ai.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
        }
        console.log(`🤖 Gemini doplnil: ${result.ingredients.length} surovin, ${result.steps.length} kroků`);
      }
    }

    // ── Chybějící pole ─────────────────────────────────────────
    if (!result.name)               result.missingFields.push('name');
    if (!result.description)        result.missingFields.push('description');
    if (!result.ingredients.length) result.missingFields.push('ingredients');
    if (!result.steps.length)       result.missingFields.push('steps');
    if (!result.servings)           result.missingFields.push('servings');
    if (!result.prepTime && !result.cookTime) result.missingFields.push('times');
    if (!result.imageUrl)           result.missingFields.push('imageUrl');

    return result;
  });
