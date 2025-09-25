import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
import type { ReactNode } from 'react'; 
import type {
  CalendarEvent,
  CalendarView,
  Holiday,
  Nameday,
  CalendarSettings,
  MonthTheme,
} from './types';
import { fetchCzechHolidays, fetchCzechNamedays } from './data/czechData';
import { fetchImageForQuery } from '../../api/unsplash';
import { monthThemes } from './data/monthThemes';

interface CalendarContextType {
  // Stav kalendáře
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  currentView: CalendarView;
  setCurrentView: (view: CalendarView) => void;

  // Události
  events: CalendarEvent[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsByDate: (date: Date) => CalendarEvent[];

  // Svátky a jmeniny
  holidays: Holiday[];
  namedays: Nameday[];
  getHolidayByDate: (date: Date) => Holiday | null;
  getNamedayByDate: (date: Date) => Nameday | null;

  // Nastavení
  settings: CalendarSettings;
  updateSettings: (updates: Partial<CalendarSettings>) => void;

  // Témata
  monthThemes: MonthTheme[];
  getCurrentMonthTheme: () => MonthTheme;
  headerImage: string | null;

  // Utility
  isToday: (date: Date) => boolean;
  isSameDay: (date1: Date, date2: Date) => boolean;
  formatDate: (date: Date, format?: string) => string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
);

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

interface CalendarProviderProps {
  children: ReactNode;
  initialEvents?: CalendarEvent[];
  onEventsChange?: (events: CalendarEvent[]) => void;
}

const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  initialEvents = [],
  onEventsChange,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [namedays, setNamedays] = useState<Nameday[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<CalendarSettings>({
    theme: 'light',
    firstDayOfWeek: 1,
    timeFormat: '24h',
    showWeekNumbers: false,
    showHolidays: true,
    showNamedays: true,
    defaultView: 'month',
    reminderSettings: {
      email: true,
      push: true,
      defaultTime: '15min',
    },
    familyView: true,
  });
  

  // Načtení nastavení z localStorage při inicializaci
  useEffect(() => {
    const savedSettings = localStorage.getItem('calendar-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Chyba při načítání nastavení kalendáře:', error);
      }
    }

    const savedEvents = localStorage.getItem('calendar-events');
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents).map((event: any) => ({
          ...event,
          date: new Date(event.date),
        }));
        setEvents(parsed);
      } catch (error) {
        console.error('Chyba při načítání událostí kalendáře:', error);
      }
    }
  }, []);

  // Načtení svátků a jmenin z API
  useEffect(() => {
    const loadData = async () => {
      try {
        const holidaysData = await fetchCzechHolidays(
          currentDate.getFullYear()
        );
        const namedaysData = await fetchCzechNamedays(
          currentDate.getFullYear()
        );
        setHolidays(holidaysData);
        setNamedays(namedaysData);
      } catch (error) {
        console.error('Chyba při načítání dat:', error);
      }
    };

    loadData();
  }, [currentDate.getFullYear()]);

  // Uložení událostí do localStorage
  useEffect(() => {
    localStorage.setItem('calendar-events', JSON.stringify(events));
    onEventsChange?.(events);
  }, [events, onEventsChange]);

  // Uložení nastavení do localStorage
  useEffect(() => {
    localStorage.setItem('calendar-settings', JSON.stringify(settings));
  }, [settings]);

  const addEvent = (event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === id ? { ...event, ...updates } : event))
    );
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const getEventsByDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date));
  };

  const getHolidayByDate = (date: Date) => {
    // Použijte 'holidays' místo 'czechHolidays'
    return (
      holidays.find((holiday) => isSameDay(holiday.date, date)) || null
    );
  };
  
  const getNamedayByDate = (date: Date) => {
    // Použijte 'namedays' místo 'czechNamedays'
    return (
      namedays.find((nameday) => isSameDay(nameday.date, date)) || null
    );
  };

  const updateSettings = (updates: Partial<CalendarSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const getCurrentMonthTheme = () => {
    const month = currentDate.getMonth() + 1;
    return monthThemes.find((theme) => theme.month === month) || monthThemes[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const formatDate = (date: Date, format = 'DD.MM.YYYY') => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const weekDay = date.toLocaleDateString('cs-CZ', { weekday: 'long' });

    switch (format) {
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`;
      case 'DD.MM':
        return `${day}.${month}`;
      case 'WEEKDAY':
        return weekDay;
      case 'FULL':
        return `${weekDay} ${day}.${month}.${year}`;
      default:
        return date.toLocaleDateString('cs-CZ');
    }
  };

    // <-- Nový useEffect, který se stará o načtení obrázku
    useEffect(() => {
      const loadHeaderImage = async () => {
        const month = currentDate.getMonth();
        const currentTheme = monthThemes[month];
        
        // Vytvoříme dotaz pro vyhledávání, např. "Winter quiet" pro "Zimní klid"
        const query = `${currentTheme.name} ${currentTheme.month}`; 
  
        const imageUrl = await fetchImageForQuery(query);
        if (imageUrl) {
          setHeaderImage(imageUrl);
        } else {
          // Fallback: Pokud se obrázek nenačte, použijeme gradient z původního souboru
          setHeaderImage(currentTheme.backgroundImage);
        }
      };
  
      loadHeaderImage();
      // Tento efekt se spustí znovu, kdykoliv se změní měsíc
    }, [currentDate.getMonth()]);

  const value: CalendarContextType = {
    currentDate,
    setCurrentDate,
    currentView,
    setCurrentView,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsByDate,
    holidays,
    namedays,
    getHolidayByDate,
    getNamedayByDate,
    headerImage,
    settings,
    updateSettings,
    monthThemes,
    getCurrentMonthTheme,
    isToday,
    isSameDay,
    formatDate,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export default CalendarProvider;
