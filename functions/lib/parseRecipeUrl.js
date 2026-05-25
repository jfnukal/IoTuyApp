"use strict";
// functions/src/parseRecipeUrl.ts
// Cloud Function — stáhne URL, parsuje Schema.org JSON-LD Recipe,
// při chybějících datech fallback na HTML scraping.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRecipeUrl = void 0;
const functions = __importStar(require("firebase-functions"));
// ── Obecné utility ────────────────────────────────────────────────
/** Odstraní HTML tagy a dekóduje základní entity */
function stripHtml(s) {
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
function parseDuration(iso) {
    if (!iso)
        return undefined;
    const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
    if (!m)
        return undefined;
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
function parseIngredient(raw) {
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
function mapCategory(raw) {
    const s = (Array.isArray(raw) ? raw.join(' ') : String(raw)).toLowerCase();
    if (/polévka|soup|vývar/.test(s))
        return 'polévka';
    if (/salát|salad/.test(s))
        return 'salát';
    if (/nápoj|drink|beverage|smoothie|koktejl/.test(s))
        return 'nápoj';
    if (/příloha|side|garnish/.test(s))
        return 'příloha';
    if (/dezert|dessert|zmrzlin|sladkost|pudink|mousse/.test(s))
        return 'dezert';
    if (/pečení|baking|cake|bread|závin|koláč|vafle|waffle|palačink|muffin|croissant|strudl|roll|bun/.test(s))
        return 'pečení';
    return 'hlavní jídlo';
}
/** Extrahuje YouTube watch URL z různých formátů embed */
function extractYouTube(video) {
    if (!video)
        return null;
    const candidates = [];
    const pushFromObj = (v) => {
        ['embedUrl', 'contentUrl', 'url', '@id'].forEach((k) => {
            if (v[k])
                candidates.push(String(v[k]));
        });
    };
    if (typeof video === 'string')
        candidates.push(video);
    else if (Array.isArray(video)) {
        video.forEach((v) => {
            if (typeof v === 'string')
                candidates.push(v);
            else if (v && typeof v === 'object')
                pushFromObj(v);
        });
    }
    else if (typeof video === 'object' && video !== null) {
        pushFromObj(video);
    }
    for (const url of candidates) {
        const m = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (m)
            return `https://www.youtube.com/watch?v=${m[1]}`;
    }
    return null;
}
/** Extrahuje první string URL z image (string | object | array) */
function extractImageUrl(img) {
    if (!img)
        return '';
    if (typeof img === 'string')
        return img;
    if (Array.isArray(img))
        return extractImageUrl(img[0]);
    if (typeof img === 'object' && img !== null) {
        const o = img;
        return String(o.url || o['@id'] || o.contentUrl || '');
    }
    return '';
}
// ── HTML Scraping Fallback ─────────────────────────────────────────
const ING_HEADING = /suroviny|ingredien|ingredients?|složení/i;
const STEP_HEADING = /postup|návod|příprava|instrukc|kroky?|steps?|directions?|method/i;
const UNIT_PATTERN = /\b(\d[\d.,/]*)\s*(g|kg|ml|l|dl|ks|lžíce?|lžičky?|hrnek|hrnky?|špetka?|balení|sáček)/i;
/** Scraping surovin z HTML když JSON-LD chybí nebo je neúplné */
function scrapeIngredients(html) {
    const items = [];
    // 1. Kontejner s ingredient třídou/id
    const containerRe = /<(?:div|ul|ol|section)[^>]+(?:class|id)="[^"]*(?:suroviny|ingredien|ingredient|ing[-_]list)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|ul|ol|section)>/gi;
    for (const m of html.matchAll(containerRe)) {
        for (const li of m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
            const t = stripHtml(li[1]);
            if (t && t.length < 150)
                items.push(t);
        }
        if (items.length >= 3)
            break;
    }
    // 2. ul/ol za headingem se "suroviny"
    if (items.length < 3) {
        const headingSplit = html.split(/<h[1-6][^>]*>/i);
        for (const chunk of headingSplit) {
            const htEnd = chunk.indexOf('<');
            if (htEnd < 0)
                continue;
            if (!ING_HEADING.test(stripHtml(chunk.slice(0, htEnd))))
                continue;
            const ul = chunk.match(/<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i);
            if (ul) {
                for (const li of ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
                    const t = stripHtml(li[1]);
                    if (t && t.length < 150)
                        items.push(t);
                }
                if (items.length >= 3)
                    break;
            }
        }
    }
    // 3. li elementy které vypadají jako ingredience (číslo + jednotka)
    if (items.length < 3) {
        for (const li of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
            const t = stripHtml(li[1]);
            if (UNIT_PATTERN.test(t) && t.length < 150)
                items.push(t);
        }
    }
    return items
        .map(parseIngredient)
        .filter((i) => i.name.length > 1)
        .slice(0, 35);
}
/** Scraping kroků postupu z HTML */
function scrapeSteps(html) {
    const steps = [];
    // 1. Kontejner se step třídou/id
    const containerRe = /<(?:div|section|ol|ul)[^>]+(?:class|id)="[^"]*(?:postup|kroky?|příprava|instrukc|steps?|directions?|method|recipe[-_]step)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|ol|ul)>/gi;
    for (const m of html.matchAll(containerRe)) {
        for (const item of m[1].matchAll(/<(?:li|p)[^>]*>([\s\S]*?)<\/(?:li|p)>/gi)) {
            const t = stripHtml(item[1]);
            if (t && t.length > 15)
                steps.push(t);
        }
        if (steps.length >= 3)
            break;
    }
    // 2. ol/p za headingem se "postup"
    if (steps.length < 3) {
        const headingSplit = html.split(/<h[1-6][^>]*>/i);
        for (const chunk of headingSplit) {
            const htEnd = chunk.indexOf('<');
            if (htEnd < 0)
                continue;
            if (!STEP_HEADING.test(stripHtml(chunk.slice(0, htEnd))))
                continue;
            const ol = chunk.match(/<(?:ol|ul)[^>]*>([\s\S]*?)<\/(?:ol|ul)>/i);
            if (ol) {
                for (const li of ol[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
                    const t = stripHtml(li[1]);
                    if (t && t.length > 15)
                        steps.push(t);
                }
            }
            if (steps.length < 3) {
                for (const p of chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
                    const t = stripHtml(p[1]);
                    if (t && t.length > 20)
                        steps.push(t);
                }
            }
            if (steps.length >= 3)
                break;
        }
    }
    return steps.filter((s) => s.length > 10).slice(0, 20);
}
// ── Cloud Function ────────────────────────────────────────────────
exports.parseRecipeUrl = functions
    .region('europe-west1')
    .runWith({ timeoutSeconds: 30, memory: '256MB' })
    .https.onCall(async (data) => {
    const { url } = data;
    if (!url || typeof url !== 'string' || !/^https?:\/\/.+/.test(url)) {
        throw new functions.https.HttpsError('invalid-argument', 'Neplatná URL adresa.');
    }
    // ── Fetch HTML ──────────────────────────────────────────────
    let html;
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml',
                'Accept-Language': 'cs,en;q=0.9',
            },
            signal: AbortSignal.timeout(10000),
            redirect: 'follow',
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        html = await res.text();
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', `Nepodařilo se načíst stránku: ${e instanceof Error ? e.message : String(e)}`);
    }
    // ── JSON-LD ────────────────────────────────────────────────
    let schema = null;
    for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const parsed = JSON.parse(block[1]);
            const candidates = (parsed === null || parsed === void 0 ? void 0 : parsed['@graph'])
                ? parsed['@graph']
                : [parsed];
            for (const c of candidates) {
                if (c && typeof c === 'object') {
                    const t = c['@type'];
                    if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) {
                        schema = c;
                        break;
                    }
                }
            }
            if (schema)
                break;
        }
        catch ( /* přeskočíme nevalidní JSON */_a) { /* přeskočíme nevalidní JSON */ }
    }
    // ── Sestavujeme výsledek ───────────────────────────────────
    const result = {
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
        result.name = stripHtml(String(schema.name || ''));
        result.description = stripHtml(String(schema.description || ''));
        if (schema.recipeCategory) {
            result.category = mapCategory(schema.recipeCategory);
        }
        if (schema.recipeYield) {
            const y = Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield;
            const n = parseInt(String(y));
            if (!isNaN(n) && n > 0)
                result.servings = n;
        }
        if (schema.prepTime)
            result.prepTime = parseDuration(String(schema.prepTime));
        if (schema.cookTime)
            result.cookTime = parseDuration(String(schema.cookTime));
        if (!result.prepTime && !result.cookTime && schema.totalTime) {
            result.prepTime = parseDuration(String(schema.totalTime));
        }
        if (Array.isArray(schema.recipeIngredient)) {
            result.ingredients = schema.recipeIngredient.map(parseIngredient);
        }
        if (Array.isArray(schema.recipeInstructions)) {
            result.steps = schema.recipeInstructions.flatMap((s) => {
                if (typeof s === 'string')
                    return [stripHtml(s)];
                if (s && typeof s === 'object') {
                    const o = s;
                    if (o['@type'] === 'HowToSection' && Array.isArray(o.itemListElement)) {
                        return o.itemListElement.map((item) => {
                            const i = item;
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
            if (yt)
                result.youtubeLinks.push(yt);
        }
        if (schema.keywords) {
            const kw = Array.isArray(schema.keywords)
                ? schema.keywords.join(',')
                : String(schema.keywords);
            result.tags = kw.split(/[,;]/).map((t) => t.trim()).filter(Boolean).slice(0, 10);
        }
    }
    else {
        // Fallback: Open Graph / meta tagy
        const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : ''; };
        result.name = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
            || pick(/<title>([^<]+)<\/title>/i);
        result.description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
            || pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        result.imageUrl = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
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
        if (m)
            result.imageUrl = m[1];
    }
    // YouTube z iframe v HTML
    if (!result.youtubeLinks.length) {
        const iframeYt = html.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (iframeYt)
            result.youtubeLinks.push(`https://www.youtube.com/watch?v=${iframeYt[1]}`);
    }
    // ── Chybějící pole ─────────────────────────────────────────
    if (!result.name)
        result.missingFields.push('name');
    if (!result.description)
        result.missingFields.push('description');
    if (!result.ingredients.length)
        result.missingFields.push('ingredients');
    if (!result.steps.length)
        result.missingFields.push('steps');
    if (!result.servings)
        result.missingFields.push('servings');
    if (!result.prepTime && !result.cookTime)
        result.missingFields.push('times');
    if (!result.imageUrl)
        result.missingFields.push('imageUrl');
    return result;
});
//# sourceMappingURL=parseRecipeUrl.js.map