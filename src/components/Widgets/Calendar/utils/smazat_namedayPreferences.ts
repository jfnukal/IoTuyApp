// src/components/Widgets/Calendar/utils/namedayPreferences.ts

interface NamedayPreference {
  date: string;
  marked: boolean;
  note?: string;
}

export const markNameday = (date: Date, marked: boolean, note?: string) => {
  const key = `nameday_pref_${date.toISOString().split('T')[0]}`;
  const pref: NamedayPreference = {
    date: date.toISOString(),
    marked,
    note
  };
  localStorage.setItem(key, JSON.stringify(pref));
};

export const isNamedayMarked = (date: Date): boolean => {
  const key = `nameday_pref_${date.toISOString().split('T')[0]}`;
  const data = localStorage.getItem(key);
  if (!data) return false;
  try {
    const pref: NamedayPreference = JSON.parse(data);
    return pref.marked;
  } catch {
    return false;
  }
};

export const getNamedayPreference = (date: Date): NamedayPreference | null => {
  const key = `nameday_pref_${date.toISOString().split('T')[0]}`;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as NamedayPreference;
  } catch {
    return null;
  }
};