// src/api/mhdMockData.ts

export interface BusConnection {
  id: string;
  kidName: 'johanka' | 'jarecek';
  departure: string; // čas odjezdu "07:10"
  arrival: string; // čas příjezdu "07:25"
  from: string;
  to: string;
  line: string; // číslo linky
  duration: number; // minuty
  daysOfWeek: number[]; // 1=Po, 2=Út, 3=St, 4=Čt, 5=Pá
}

export const MOCK_BUS_CONNECTIONS: BusConnection[] = [
  // JOHANKA - musí být ve škole 7:30
  {
    id: 'j1',
    kidName: 'johanka',
    departure: '06:45',
    arrival: '07:00',
    from: 'Brantice, rozcestí pod vlakovým nádražím',
    to: 'Zátor škola',
    line: '445',
    duration: 15,
    daysOfWeek: [1, 2, 3, 4, 5],
  },
  {
    id: 'j2',
    kidName: 'johanka',
    departure: '07:10',
    arrival: '07:25',
    from: 'Brantice, rozcestí pod vlakovým nádražím',
    to: 'Zátor škola',
    line: '445',
    duration: 15,
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  // JAREČEK - musí být ve škole 7:45 (pokud by jezdil sám)
  {
    id: 'ja1',
    kidName: 'jarecek',
    departure: '07:15',
    arrival: '07:20',
    from: 'Brantice, rozcestí pod vlakovým nádražím',
    to: 'Brantice obecní úřad',
    line: '448',
    duration: 5,
    daysOfWeek: [1, 2, 3, 4, 5],
  },
  {
    id: 'ja2',
    kidName: 'jarecek',
    departure: '07:35',
    arrival: '07:40',
    from: 'Brantice, rozcestí pod vlakovým nádražím',
    to: 'Brantice obecní úřad',
    line: '448',
    duration: 5,
    daysOfWeek: [1, 2, 3, 4, 5],
  },
];

// GPS souřadnice zastávek (pro budoucí použití)
export const BUS_STOPS = {
  'brantice-rozcesti': {
    name: 'Brantice, rozcestí pod vlakovým nádražím',
    lat: 49.9167,
    lon: 17.5833,
  },
  'zator-skola': {
    name: 'Zátor škola',
    lat: 49.92,
    lon: 17.6,
  },
  'brantice-urad': {
    name: 'Brantice obecní úřad',
    lat: 49.918,
    lon: 17.585,
  },
};
