// In-memory storage místo localStorage (který nefunguje v artifacts)
const markedNamedays = new Map<string, boolean>();

export const markNameday = (date: Date, marked: boolean) => {
  const key = date.toISOString().split('T')[0];
  if (marked) {
    markedNamedays.set(key, true);
  } else {
    markedNamedays.delete(key);
  }
};

export const isNamedayMarked = (date: Date): boolean => {
  const key = date.toISOString().split('T')[0];
  return markedNamedays.get(key) || false;
};

export const getMarkedNamedays = () => {
  return Array.from(markedNamedays.keys());
};