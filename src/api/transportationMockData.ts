import type { TransportConnection } from './transportation';

export const MOCK_CONNECTIONS: Record<string, TransportConnection> = {
  'Brantice-Zátor': {
    departureTime: '07:15',
    arrivalTime: '07:30',
    line: '801',
  },
  'Krnov-Bruntál': {
    departureTime: '07:45',
    arrivalTime: '08:20',
    line: 'R8',
  },
};