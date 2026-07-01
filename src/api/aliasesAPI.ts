// src/api/aliasesAPI.ts
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  increment,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { normalizeText, tokenize, isStopWord } from './productDictionary';

interface ProductAlias {
  id: string;
  alias: string;
  canonical: string;
  count: number;
}

// Cache pro aliasy
let cachedAliases: ProductAlias[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hodina

// Načte všechny aliasy
export const loadAliases = async (): Promise<ProductAlias[]> => {
  const now = Date.now();

  if (cachedAliases && now - cacheTimestamp < CACHE_DURATION) {
    return cachedAliases;
  }

  try {
    const aliasesRef = collection(db, 'productAliases');
    const snapshot = await getDocs(aliasesRef);

    cachedAliases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductAlias[];

    cacheTimestamp = now;
    // console.log(`[AliasesAPI] Načteno ${cachedAliases.length} aliasů`);

    // Jednorázový úklid odpadních aliasů (stop-slova jako "bez", "celku"…)
    triggerCleanupOnce();

    return cachedAliases;
  } catch (error) {
    console.error('[AliasesAPI] Chyba při načítání aliasů:', error);
    return cachedAliases || [];
  }
};

// Najde kanonický název pro alias (normalizovaně, bez stop-slov)
export const findCanonical = async (searchTerm: string): Promise<string[]> => {
  const aliases = await loadAliases();
  const words = tokenize(searchTerm); // bez diakritiky, bez stop-slov

  const canonicals: string[] = [];

  for (const word of words) {
    const match = aliases.find((a) => normalizeText(a.alias) === word);
    if (match) {
      canonicals.push(normalizeText(match.canonical));
    }
  }

  return canonicals;
};

// Smaže aliasy, jejichž levá strana je stop-slovo (předložka apod.) — čistí odpad
export const cleanupBadAliases = async (): Promise<number> => {
  const aliases = await loadAliases();
  const bad = aliases.filter((a) => isStopWord(a.alias));

  let deleted = 0;
  for (const a of bad) {
    try {
      await deleteDoc(doc(db, 'productAliases', a.id));
      deleted++;
      console.log(`[AliasesAPI] Smazán odpadní alias: ${a.alias} → ${a.canonical}`);
    } catch (err) {
      console.error('[AliasesAPI] Chyba při čištění aliasu:', err);
    }
  }

  if (deleted > 0) {
    cachedAliases = null;
    cacheTimestamp = 0;
  }
  return deleted;
};

// Smaže VŠECHNY naučené aliasy (auto-učení je vypnuté, staré aliasy jsou jen odpad,
// který přesměrovává hledání na blbost — např. "mouka → vejce"). Ruční aliasy si
// uživatel přidá znovu v Nastavení; synonyma pokrývá vestavěný slovník.
export const resetAllLearnedAliases = async (): Promise<number> => {
  const aliases = await loadAliases();
  let deleted = 0;
  for (const a of aliases) {
    try {
      await deleteDoc(doc(db, 'productAliases', a.id));
      deleted++;
    } catch (err) {
      console.error('[AliasesAPI] Chyba při mazání aliasu:', err);
    }
  }
  if (deleted > 0) {
    cachedAliases = null;
    cacheTimestamp = 0;
  }
  return deleted;
};

// Spustí úklid jen jednou za běh aplikace (guard přes localStorage)
let cleanupTriggered = false;
const triggerCleanupOnce = () => {
  if (cleanupTriggered) return;
  cleanupTriggered = true;
  try {
    if (localStorage.getItem('aliases-reset-v2')) return;
  } catch { /* ignore */ }
  // Jednorázový úplný reset odpadních naučených aliasů
  resetAllLearnedAliases()
    .then((n) => {
      try { localStorage.setItem('aliases-reset-v2', '1'); } catch { /* ignore */ }
      if (n > 0) console.log(`[AliasesAPI] Reset: smazáno ${n} naučených aliasů`);
    })
    .catch(() => { /* ignore */ });
};

// Uloží nový alias (učení)
export const learnAlias = async (
  alias: string,
  canonical: string
): Promise<void> => {
  const aliasNorm = alias.toLowerCase().trim();
  const canonicalNorm = canonical.toLowerCase().trim();

  // Nechceme ukládat pokud jsou stejné
  if (aliasNorm === canonicalNorm) return;

  // Nechceme ukládat příliš krátké aliasy
  if (aliasNorm.length < 3 || canonicalNorm.length < 3) return;

  const docId = `${aliasNorm}-${canonicalNorm}`.replace(/[^a-z0-9-]/g, '');
  const docRef = doc(db, 'productAliases', docId);

  try {
    // Zkusíme aktualizovat count, pokud existuje
    await updateDoc(docRef, {
      count: increment(1),
      updatedAt: new Date(),
    });
    console.log(
      `[AliasesAPI] Aktualizován alias: ${aliasNorm} → ${canonicalNorm}`
    );
  } catch {
    // Dokument neexistuje, vytvoříme nový
    await setDoc(docRef, {
      alias: aliasNorm,
      canonical: canonicalNorm,
      count: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`[AliasesAPI] Vytvořen alias: ${aliasNorm} → ${canonicalNorm}`);
  }

  // Invalidujeme cache
  cachedAliases = null;
};

// Vymaže cache
export const clearAliasCache = (): void => {
  cachedAliases = null;
  cacheTimestamp = 0;
};

// Smaže všechny aliasy pro daný hledaný výraz
export const deleteAliasBySearch = async (
  searchTerm: string
): Promise<number> => {
  const aliases = await loadAliases();
  const normalized = searchTerm.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  let deletedCount = 0;

  for (const word of words) {
    // Najdeme všechny aliasy kde alias = word
    const matches = aliases.filter((a) => a.alias === word);

    for (const match of matches) {
      try {
        const docRef = doc(db, 'productAliases', match.id);
        await deleteDoc(docRef);
        deletedCount++;
        console.log(
          `[AliasesAPI] Smazán alias: ${match.alias} → ${match.canonical}`
        );
      } catch (error) {
        console.error(
          `[AliasesAPI] Chyba při mazání aliasu ${match.id}:`,
          error
        );
      }
    }
  }

  // Invalidujeme cache
  if (deletedCount > 0) {
    cachedAliases = null;
    cacheTimestamp = 0;
  }

  return deletedCount;
};
