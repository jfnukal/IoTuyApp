// src/components/DashboardV2/mobileOrderConfig.ts
// Ukládá a aplikuje pořadí widgetů na mobilním dashboardu.
// Pořadí se ukládá do localStorage a aplikuje přes CSS custom properties --mo-*.

export type MobileWidgetKey =
  | 'greeting'
  | 'calendar'
  | 'shopping'
  | 'weather'
  | 'schedule'
  | 'dishwasher'
  | 'recipes';

export const MOBILE_WIDGET_LABELS: Record<MobileWidgetKey, string> = {
  greeting:  '👋 Ahoj rodino',
  calendar:  '📅 Kalendář',
  shopping:  '🛒 Nákupní seznam',
  weather:   '🌤️ Počasí',
  schedule:  '📚 Rozvrh',
  dishwasher:'🍽️ Myčka',
  recipes:   '👨‍🍳 Recepty',
};

export const DEFAULT_MOBILE_ORDER: MobileWidgetKey[] = [
  'greeting', 'calendar', 'shopping', 'weather', 'schedule', 'dishwasher', 'recipes',
];

const STORAGE_KEY = 'v2-mobile-order';

export const loadMobileOrder = (): MobileWidgetKey[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MobileWidgetKey[];
      // Ověř, že jsou všechny klíče přítomny (ochrana při budoucím přidání widgetů)
      const valid = DEFAULT_MOBILE_ORDER.every(k => parsed.includes(k)) &&
                    parsed.length === DEFAULT_MOBILE_ORDER.length;
      if (valid) return parsed;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_MOBILE_ORDER];
};

export const saveMobileOrder = (order: MobileWidgetKey[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
};

/** Zapíše pořadí jako CSS proměnné --mo-<key> na :root */
export const applyMobileOrder = (order: MobileWidgetKey[]) => {
  const root = document.documentElement;
  order.forEach((key, i) => {
    root.style.setProperty(`--mo-${key}`, String(i + 1));
  });
};
