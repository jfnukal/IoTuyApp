// src/components/Widgets/SchoolSchedule/holidayMode.ts
// Prázdninový režim rozvrhu — přes rozvrh se zobrazí sváteční nápis.
// Zobrazuje se, DOKUD je aktuální datum PŘED tímto dnem.
// Nastaveno ~týden před začátkem školy, ať zbyde čas načíst nové rozvrhy.
// Až prázdniny skončí, stačí datum posunout na příští rok (nebo smazat volání).

export const SUMMER_BREAK_UNTIL = new Date('2026-08-25T00:00:00');

export const isSummerBreak = (): boolean => new Date() < SUMMER_BREAK_UNTIL;
