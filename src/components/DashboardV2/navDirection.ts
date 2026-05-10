// src/components/DashboardV2/navDirection.ts
// Modul-level store pro směr navigace — čte se při renderu V2Shell, pak se smaže.
// Nepoužívá React state záměrně: musí být nastaven PŘED navigate(), přečten synchronně při renderu.

type NavDir = 'from-bottom' | 'from-top' | 'from-right' | 'from-left' | '';

let dir: NavDir = '';

export const setNavDir = (d: NavDir) => { dir = d; };
export const getNavDir = (): NavDir => dir;
export const clearNavDir = () => { dir = ''; };
