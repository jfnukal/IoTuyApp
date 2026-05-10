// src/AI/services/dishwasherService.ts
import type { DishwasherState } from '../../types';

let cache: DishwasherState | null = null;

export const syncDishwasher = (state: DishwasherState | null) => {
  cache = state;
};

const formatDate = (ts: number | null) => {
  if (!ts) return 'nikdy';
  const d = new Date(ts);
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
};

export const getDishwasherStatus = (): string => {
  if (!cache) return 'Stav myčky není dostupný.';

  const next = `${cache.nextPersonName} ${cache.nextPersonEmoji}`;
  const last = cache.lastCompletedByName
    ? `Naposledy myl ${cache.lastCompletedByName} ${cache.lastCompletedByEmoji} — ${formatDate(cache.lastCompletedAt)}.`
    : 'Ještě nikdo nemyl.';

  return `Na řadě s myčkou je ${next}. ${last}`;
};

// Handler registrovaný z DishwasherBridge
type MarkDoneFn = () => Promise<void>;
let markDoneHandler: MarkDoneFn | null = null;

export const registerMarkDoneHandler = (fn: MarkDoneFn) => {
  markDoneHandler = fn;
};

export const markDishwasherDone = async (): Promise<string> => {
  if (!markDoneHandler) {
    console.error('[DishwasherService] markDoneHandler není registrován');
    return 'Chyba: myčka není propojena.';
  }
  if (!cache) return 'Stav myčky není dostupný.';

  const who = `${cache.nextPersonName} ${cache.nextPersonEmoji}`;
  try {
    await markDoneHandler();
    return `Hotovo! Zaznamenáno, že ${who} umyl nádobí.`;
  } catch (err) {
    console.error('[DishwasherService] Chyba při zápisu:', err);
    return 'Nepodařilo se zaznamenat myčku.';
  }
};
