// netlify/lib/familyAuth.cjs
// Ověření volajícího pro Netlify funkce + CORS jen pro vlastní web.
//
// Funkce ovládají zařízení v domě (zásuvky, topení, zvonek) a repo je veřejné,
// takže je nesmí volat kdokoli, kdo zná adresu (do 9/2026 šlo přesně tohle).
// Klient posílá Firebase ID token přihlášeného uživatele
// (hlavička Authorization: Bearer …) a tady se:
//   1) ověří podpis a platnost tokenu veřejnými klíči Google pro projekt
//      iotuyapp — totéž, co dělá firebase-admin, jen bez tajného klíče,
//   2) ověří, že jde o člena rodiny: s tím tokenem se sáhne do Firestore na
//      dokument appSettings/main, který smí číst jen rodina (isFamily() ve
//      firestore.rules). Seznam e-mailů tak zůstává na jednom místě a do
//      veřejného repa se nekopíruje. Nikde se nic nemusí nastavovat.
//
// Použití ve funkci: exports.handler = protect(handler, { methods: 'POST' });

const crypto = require('crypto');

const PROJECT_ID = 'iotuyapp';
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
// Dokument čitelný jen pro rodinu; maska na neexistující pole = nic se nestahuje.
// Název pole NESMÍ vypadat jako __něco__ — to má Firestore vyhrazené a vrací 400
// (ověřeno 24. 9. 2026 na ostrém Firestore: tahle adresa bez přihlášení → 403)
const FAMILY_PROBE_URL =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)` +
  '/documents/appSettings/main?mask.fieldPaths=overeniRodiny';

const CLOCK_TOLERANCE_S = 120; // hodiny Netlify a Googlu se můžou trochu rozcházet
const REQUEST_TIMEOUT_MS = 5000;
const CERTS_REFRESH_MIN_MS = 60 * 1000; // neznámý klíč → čerstvé klíče nejvýš 1× za minutu

// Odkud smí prohlížeč funkce volat: ostrý web a náhledy nasazení na Netlify.
// Appka volá funkce ze stejné domény (tam CORS nehraje roli) — jde o to, aby
// odpovědi nemohly číst cizí stránky.
const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+--)?iottuyapp\.netlify\.app$/;

class AuthError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Veřejné klíče Google (drží se v teplé instanci funkce) ───────────────
let certs = null; // { keys: { kid: KeyObject }, expiresAt, fetchedAt }

async function getPublicKey(kid) {
  if (!certs || Date.now() >= certs.expiresAt) {
    await loadCerts();
  } else if (!certs.keys[kid] && Date.now() - certs.fetchedAt >= CERTS_REFRESH_MIN_MS) {
    await loadCerts(); // Google klíče občas vymění
  }
  return certs.keys[kid];
}

async function loadCerts() {
  const response = await fetchWithTimeout(CERTS_URL);
  if (!response.ok) {
    throw new Error(`Veřejné klíče Google: HTTP ${response.status}`);
  }
  const pems = await response.json();
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1]);
  certs = {
    keys: Object.fromEntries(
      Object.entries(pems).map(([kid, pem]) => [kid, new crypto.X509Certificate(pem).publicKey])
    ),
    expiresAt: Date.now() + (maxAge > 0 ? maxAge : 3600) * 1000,
    fetchedAt: Date.now(),
  };
}

// ── 1) Podpis a platnost Firebase ID tokenu ──────────────────────────────
async function verifyIdToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError(401, 'Neplatný přihlašovací token');

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new AuthError(401, 'Neplatný přihlašovací token');
  }
  if (
    !header || typeof header !== 'object' || !payload || typeof payload !== 'object' ||
    header.alg !== 'RS256' || typeof header.kid !== 'string'
  ) {
    throw new AuthError(401, 'Neplatný přihlašovací token');
  }

  const publicKey = await getPublicKey(header.kid);
  if (!publicKey) throw new AuthError(401, 'Token nepodepsal Google');

  let signatureOk = false;
  try {
    signatureOk = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], 'base64url')
    );
  } catch {
    // poškozený podpis (třeba špatná délka) = neplatný
  }
  if (!signatureOk) throw new AuthError(401, 'Token nepodepsal Google');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== PROJECT_ID || payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) {
    throw new AuthError(401, 'Token je z jiného projektu');
  }
  if (typeof payload.sub !== 'string' || payload.sub === '') {
    throw new AuthError(401, 'Neplatný přihlašovací token');
  }
  if (
    typeof payload.exp !== 'number' || typeof payload.iat !== 'number' ||
    payload.exp + CLOCK_TOLERANCE_S <= now || payload.iat - CLOCK_TOLERANCE_S > now
  ) {
    throw new AuthError(401, 'Přihlašovací token vypršel');
  }
  return payload;
}

// ── 2) Je to člen rodiny? Rozhodnou pravidla Firestore (isFamily) ────────
// Výsledek se pamatuje, dokud token platí — teplá instance funkce se pak
// Firestore znovu neptá
const familyCache = new Map(); // token → { family, until }

async function isFamily(token, payload) {
  const cached = familyCache.get(token);
  if (cached && Date.now() < cached.until) return cached.family;

  const response = await fetchWithTimeout(FAMILY_PROBE_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let family;
  if (response.ok || response.status === 404) {
    family = true; // pravidla čtení pustila
  } else if (response.status === 401 || response.status === 403) {
    family = false;
  } else {
    throw new Error(`Firestore: HTTP ${response.status}`);
  }

  if (familyCache.size > 200) familyCache.clear();
  familyCache.set(token, { family, until: payload.exp * 1000 });
  return family;
}

async function checkCaller(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) throw new AuthError(401, 'Chybí přihlášení');

  const payload = await verifyIdToken(match[1]);
  if (!(await isFamily(match[1], payload))) {
    throw new AuthError(403, 'Tenhle účet nepatří do rodiny');
  }
  return payload;
}

// ── CORS ─────────────────────────────────────────────────────────────────
function corsHeaders(event, methods) {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (!origin || !ALLOWED_ORIGIN.test(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': `${methods}, OPTIONS`,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

// CORS hlavičky nastavuje jen protect() — co by poslala sama funkce, se zahodí
function withoutCors(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !/^access-control-/i.test(name))
  );
}

/**
 * Obalí handler funkce: pustí ho jen pro přihlášeného člena rodiny a odpovědi
 * doplní CORS jen pro vlastní web. Odmítnutí: 401 (chybí / neplatné
 * přihlášení), 403 (cizí účet), 503 (Google / Firestore teď neodpovídá).
 */
function protect(handler, { methods }) {
  return async (event, context) => {
    const cors = corsHeaders(event, methods);
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: cors, body: '' };
    }

    try {
      const caller = await checkCaller(event);
      console.log(`🔐 Volá: ${caller.email || caller.sub}`);
    } catch (error) {
      const statusCode = error instanceof AuthError ? error.statusCode : 503;
      console.warn(`⛔ Odmítnuto (${statusCode}): ${error.message}`);
      return {
        statusCode,
        headers: { 'Content-Type': 'application/json', ...cors },
        body: JSON.stringify({
          success: false,
          error:
            error instanceof AuthError
              ? error.message
              : 'Přihlášení teď nejde ověřit, zkus to za chvíli',
        }),
      };
    }

    const response = await handler(event, context);
    return { ...response, headers: { ...withoutCors(response.headers), ...cors } };
  };
}

module.exports = { protect };
