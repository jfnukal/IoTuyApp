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

/* ⚠️ ODSTRANĚN `ensureResetOnce()` (29. 9. 2026, převzato z Family-Dashboard).
   Byl to jednorázový vymazávač z 1. 7. 2026, který při prvním otevření appky
   V KAŽDÉM PROHLÍŽEČI smazal všechny aliasy (odpad z vypnutého auto-učení,
   např. „mouka → vejce"). Svůj úkol splnil, ale zůstal v kódu — nový tablet,
   telefon nebo anonymní okno by smazaly i ruční aliasy z Nastavení a volby
   „jaký druh myslíš?" (ty se ukládají jako alias). */

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

  /* CELÁ POLOŽKA (29. 9. 2026). Volba ze seznamu po „✕ Špatný" se ukládá
     k celému názvu položky („sýr eidam" → vybraný produkt). Dokud se
     porovnávala jen jednotlivá slova, víceslovný alias se nikdy netrefil
     a appka si volbu „pamatovala" jen u jednoslovných položek. */
  const cela = normalizeText(searchTerm);
  const celaShoda = cela.includes(' ')
    ? aliases.find((a) => normalizeText(a.alias) === cela)
    : undefined;
  if (celaShoda) canonicals.push(normalizeText(celaShoda.canonical));

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

/**
 * Uloží alias „když píšu ALIAS, myslím CANONICAL".
 *
 * Volá se JEN po vědomé volbě ze seznamu u cenovky — výběr druhu („káva" →
 * „mletá káva") a výběr jiného nalezeného produktu po „✕ Špatný". Ruční
 * hledání lupou se schválně NEUČÍ: právě z něj vznikal odpad typu „bez → maso"
 * (auto-učení vypnuté 1. 7. 2026). Smazat jde v Nastavení → Nákupní seznam
 * nebo tlačítkem „✕ Špatný" v detailu ceny.
 */
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

  // Předložky a spojky do slovníku nepatří — přesně tímhle vznikal odpad.
  if (isStopWord(aliasNorm)) return;

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

// Smaže všechny aliasy pro daný hledaný výraz („✕ Špatný" v detailu ceny)
export const deleteAliasBySearch = async (
  searchTerm: string
): Promise<number> => {
  const aliases = await loadAliases();
  /* Maže přesně to, co `findCanonical` pro tuhle položku používá: celou
     položku i jednotlivá slova, obojí BEZ DIAKRITIKY. Dřív se porovnávalo
     s háčky a jen po slovech, takže „Špatný" nesmazal alias „kava" u položky
     „káva" ani víceslovnou volbu — a appka dál hledala podle nich. */
  const cela = normalizeText(searchTerm);
  const hledane = new Set([cela, ...cela.split(/\s+/)]);
  const matches = aliases.filter((a) => hledane.has(normalizeText(a.alias)));

  let deletedCount = 0;

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

  // Invalidujeme cache
  if (deletedCount > 0) {
    cachedAliases = null;
    cacheTimestamp = 0;
  }

  return deletedCount;
};
