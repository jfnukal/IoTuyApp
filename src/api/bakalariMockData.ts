// src/api/bakalariMockData.ts

import type { TimetableDay } from './bakalariAPI';

// Mock rozvrh pro celý týden (Pondělí - Pátek)
export const MOCK_TIMETABLE: TimetableDay[] = [
  {
    date: '2025-10-01',
    dayOfWeek: 1,
    dayDescription: 'Pondělí',
    lessons: [
      { subjecttext: 'Matematika', teacher: 'Nov', room: 'U12', begintime: '08:00', endtime: '08:45', theme: 'Kvadratické rovnice' },
      { subjecttext: 'Čeština', teacher: 'Svo', room: 'U15', begintime: '09:00', endtime: '09:45', theme: 'Literární romantismus' },
      { subjecttext: 'Přestávka', teacher: '', room: '', begintime: '10:00', endtime: '10:15', theme: '' },
      { subjecttext: 'Angličtina', teacher: 'Dvo', room: 'U8', begintime: '10:15', endtime: '11:00', theme: 'Present Perfect' },
      { subjecttext: 'Tělocvik', teacher: 'Krá', room: 'Těl', begintime: '11:15', endtime: '12:00', theme: 'Basketbal' },
    ],
  },
  {
    date: '2025-10-02',
    dayOfWeek: 2,
    dayDescription: 'Úterý',
    lessons: [
      { subjecttext: 'Přírodopis', teacher: 'Hor', room: 'U23', begintime: '08:00', endtime: '08:45', theme: 'Ekosystémy' },
      { subjecttext: 'Dějepis', teacher: 'Mal', room: 'U17', begintime: '09:00', endtime: '09:45', theme: '1. světová válka' },
      { subjecttext: 'Matematika', teacher: 'Nov', room: 'U12', begintime: '10:00', endtime: '10:45', theme: 'Rovnice' },
      { subjecttext: 'Informatika', teacher: 'Bla', room: 'U5', begintime: '11:00', endtime: '11:45', theme: 'Python základy' },
    ],
  },
  {
    date: '2025-10-03',
    dayOfWeek: 3,
    dayDescription: 'Středa',
    lessons: [
      { subjecttext: 'Čeština', teacher: 'Svo', room: 'U15', begintime: '08:00', endtime: '08:45', theme: 'Skladba' },
      { subjecttext: 'Fyzika', teacher: 'Hor', room: 'U23', begintime: '09:00', endtime: '09:45', theme: 'Newtonovy zákony' },
      { subjecttext: 'Chemie', teacher: 'Kub', room: 'U20', begintime: '10:00', endtime: '10:45', theme: 'Kyseliny a zásady' },
      { subjecttext: 'Výtvarka', teacher: 'Bar', room: 'U18', begintime: '11:00', endtime: '11:45', theme: 'Krajina' },
    ],
  },
  {
    date: '2025-10-04',
    dayOfWeek: 4,
    dayDescription: 'Čtvrtek',
    lessons: [
      { subjecttext: 'Angličtina', teacher: 'Dvo', room: 'U8', begintime: '08:00', endtime: '08:45', theme: 'Reading comprehension' },
      { subjecttext: 'Matematika', teacher: 'Nov', room: 'U12', begintime: '09:00', endtime: '09:45', theme: 'Geometrie' },
      { subjecttext: 'Hudební výchova', teacher: 'Mus', room: 'U25', begintime: '10:00', endtime: '10:45', theme: 'Hudební nástroje' },
      { subjecttext: 'Zeměpis', teacher: 'Zem', room: 'U16', begintime: '11:00', endtime: '11:45', theme: 'Kontinenty' },
    ],
  },
  {
    date: '2025-10-05',
    dayOfWeek: 5,
    dayDescription: 'Pátek',
    lessons: [
      { subjecttext: 'Čeština', teacher: 'Svo', room: 'U15', begintime: '08:00', endtime: '08:45', theme: 'Sloh' },
      { subjecttext: 'Fyzika', teacher: 'Hor', room: 'U23', begintime: '09:00', endtime: '09:45', theme: 'Energie' },
      { subjecttext: 'Tělocvik', teacher: 'Krá', room: 'Těl', begintime: '10:00', endtime: '10:45', theme: 'Volejbal' },
      { subjecttext: 'Občanská výchova', teacher: 'Čer', room: 'U14', begintime: '11:00', endtime: '11:45', theme: 'Demokracie' },
    ],
  },
];

// Mock jídelníček pro celý týden
export const MOCK_LUNCH_MENU: LunchMenu[] = [
  {
    date: '2025-10-01',
    meals: [
      { name: 'Svíčková na smetaně, knedlík', allergens: ['1', '3', '7'] },
      { name: 'Kuřecí řízek, bramborová kaše', allergens: ['1', '3'] },
    ],
  },
  {
    date: '2025-10-02',
    meals: [
      { name: 'Gulášová polévka, chléb', allergens: ['1'] },
      { name: 'Smažený sýr, hranolky, tatarská omáčka', allergens: ['1', '3', '7'] },
    ],
  },
  {
    date: '2025-10-03',
    meals: [
      { name: 'Kuřecí čína s rýží', allergens: ['6'] },
      { name: 'Špagety carbonara', allergens: ['1', '3', '7'] },
    ],
  },
  {
    date: '2025-10-04',
    meals: [
      { name: 'Vepřový guláš, houskové knedlíky', allergens: ['1', '3'] },
      { name: 'Rybí filé, vařené brambory', allergens: ['4'] },
    ],
  },
  {
    date: '2025-10-05',
    meals: [
      { name: 'Pizza margherita', allergens: ['1', '7'] },
      { name: 'Palačinky s marmeládou', allergens: ['1', '3', '7'] },
    ],
  },
];