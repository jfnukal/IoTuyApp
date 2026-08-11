// src/components/Widgets/SchoolSchedule/holidayMode.ts
// Prázdninový režim rozvrhu — přes rozvrh se zobrazí sváteční nápis.
// Zobrazuje se, DOKUD je aktuální datum PŘED tímto dnem.
// Nastaveno ~týden před začátkem školy, ať zbyde čas načíst nové rozvrhy.
//
// RUČNĚ VYPNUTO 11. 8. 2026 (datum posunuto do minulosti) → rozvrh se zobrazuje.
// Pro PŘÍŠTÍ prázdniny nastav datum na den, kdy zase začíná škola (např. '2027-08-25').

export const SUMMER_BREAK_UNTIL = new Date('2026-08-11T00:00:00');

export const isSummerBreak = (): boolean => new Date() < SUMMER_BREAK_UNTIL;
