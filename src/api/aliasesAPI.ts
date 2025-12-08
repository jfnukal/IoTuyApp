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
    console.log(`[AliasesAPI] Načteno ${cachedAliases.length} aliasů`);

    return cachedAliases;
  } catch (error) {
    console.error('[AliasesAPI] Chyba při načítání aliasů:', error);
    return cachedAliases || [];
  }
};

// Najde kanonický název pro alias
export const findCanonical = async (searchTerm: string): Promise<string[]> => {
  const aliases = await loadAliases();
  const normalized = searchTerm.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  const canonicals: string[] = [];

  for (const word of words) {
    const match = aliases.find((a) => a.alias === word);
    if (match) {
      canonicals.push(match.canonical);
    }
  }

  return canonicals;
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
export const deleteAliasBySearch = async (searchTerm: string): Promise<number> => {
  const aliases = await loadAliases();
  const normalized = searchTerm.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  let deletedCount = 0;
  
  for (const word of words) {
    // Najdeme všechny aliasy kde alias = word
    const matches = aliases.filter(a => a.alias === word);
    
    for (const match of matches) {
      try {
        const docRef = doc(db, 'productAliases', match.id);
        await deleteDoc(docRef);
        deletedCount++;
        console.log(`[AliasesAPI] Smazán alias: ${match.alias} → ${match.canonical}`);
      } catch (error) {
        console.error(`[AliasesAPI] Chyba při mazání aliasu ${match.id}:`, error);
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