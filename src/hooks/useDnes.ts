// src/hooks/useDnes.ts
// „Dnešek", který se sám posune — o půlnoci i během dne (rozvrh ve 14:00).
//
// Tablet na zdi má stránku otevřenou celé hodiny: obnovuje se v 5:00, po
// probuzení a přes den nejdřív po 4 hodinách. Widget, který si „dnes"
// spočítá jen při načtení, by do té doby ukazoval starý stav. Hodnota se
// tu přepočítává každou minutu a hned po rozsvícení displeje; komponenta
// se ale překreslí, jen když se opravdu změní.

import { useEffect, useRef, useState } from 'react';

const KAZDOU_MINUTU = 60 * 1000;

/**
 * Hodnota spočítaná z aktuálního času, která se sama drží aktuální.
 * `vypocet` vrací jednoduchou hodnotu (číslo, text) — objekt by byl
 * pokaždé jiný a komponenta by se překreslovala každou minutu.
 */
export function useAktualni<T extends string | number | boolean>(vypocet: () => T): T {
  const [hodnota, setHodnota] = useState(vypocet);
  const vypocetRef = useRef(vypocet);
  vypocetRef.current = vypocet;

  useEffect(() => {
    const prepocitej = () => setHodnota(vypocetRef.current());
    const casovac = setInterval(prepocitej, KAZDOU_MINUTU);
    // Při zhasnutém displeji časovače stojí — po rozsvícení přepočítat hned
    document.addEventListener('visibilitychange', prepocitej);
    return () => {
      clearInterval(casovac);
      document.removeEventListener('visibilitychange', prepocitej);
    };
  }, []);

  return hodnota;
}

/** Dnešní datum jako 'RRRR-MM-DD' — o půlnoci se samo posune. */
export function useDnes(): string {
  return useAktualni(dnesniDatum);
}

function dnesniDatum(): string {
  const d = new Date();
  const mesic = String(d.getMonth() + 1).padStart(2, '0');
  const den = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mesic}-${den}`;
}
