// src/utils/bezpecnyReload.ts
// Bezpečná obnova stránky — obnoví ji, až svítí displej a server opravdu
// odpovídá. Jinak nechá běžet, co je na obrazovce, a zkusí to znovu.
//
// Samotná logika je ve skriptu přímo v index.html, protože musí fungovat,
// i když se zbytek aplikace vůbec nestáhne. Tady je jen typovaný obal.

export interface VolbyObnovy {
  /** Obnova kvůli chybě — nečeká, až lidi přestanou sahat na displej. */
  poChybe?: boolean;
  /** Tlačítko „Zkusit znovu" — bez jakéhokoli čekání. */
  hned?: boolean;
}

declare global {
  interface Window {
    bezpecnyReload?: (duvod: string, volby?: VolbyObnovy) => void;
  }
}

export function bezpecnyReload(duvod: string, volby?: VolbyObnovy): void {
  if (window.bezpecnyReload) {
    window.bezpecnyReload(duvod, volby);
  } else {
    // Nemělo by nastat (skript je v index.html) — radši obyčejná obnova než žádná
    console.warn('[BezpecnyReload] chybí skript z index.html, obnovuji napřímo:', duvod);
    window.location.reload();
  }
}
