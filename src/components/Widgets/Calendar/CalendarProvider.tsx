// src/components/Widgets/Calendar/CalendarProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import type {
  CalendarEventData,
  CalendarView,
  Holiday,
  Nameday,
  CalendarSettings,
  MonthTheme,
  NamedayPreferenceDoc,
} from '../../../types/index';
import { fetchCalendarDataForYear } from './data/czechData';
import { fetchImageForQuery } from '../../../api/unsplash';
import { monthThemes } from './data/monthThemes';
import { useAuth } from '../../../contexts/AuthContext';
import { firestoreService } from '../../../services/firestoreService';
import { getEventsForDate as getRecurringEventsForDate } from '../../../utils/recurrenceUtils';

interface CalendarContextType {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  currentView: CalendarView;
  setCurrentView: (view: CalendarView) => void;
  events: CalendarEventData[];
  addEvent: (
    event: Omit<CalendarEventData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateEvent: (
    id: string,
    updates: Partial<CalendarEventData>
  ) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByDate: (date: Date) => CalendarEventData[];
  getBirthdayEventsByDate: (date: Date) => CalendarEventData[];
  holidays: Holiday[];
  namedays: Nameday[];
  getHolidayByDate: (date: Date) => Holiday | null;
  getNamedayByDate: (date: Date) => Nameday | null;
  settings: CalendarSettings;
  updateSettings: (updates: Partial<CalendarSettings>) => void;
  monthThemes: MonthTheme[];
  getCurrentMonthTheme: () => MonthTheme;
  headerImage: string | null;
  isToday: (date: Date) => boolean;
  isSameDay: (date1: Date | string, date2: Date) => boolean;
  formatDate: (date: Date, format?: string) => string;
  // NOVÉ FUNKCE PRO PRÁCI S JMENINAMI
  isNamedayMarked: (date: Date) => boolean;
  markNameday: (date: Date, marked: boolean) => Promise<void>;
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
  events?: CalendarEventData[]; // Nový prop pro events z useFirestore
}

const CalendarProvider: React.FC<CalendarProviderProps> = ({ 
  children,
  events: externalEvents = []
}) => {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [namedays, setNamedays] = useState<Nameday[]>([]);
  const events = externalEvents;
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<CalendarSettings>({
    theme: 'light',
    firstDayOfWeek: 1,
    timeFormat: '24h',
    showWeekNumbers: false,
    showHolidays: true,
    showNamedays: true,
    defaultView: 'month',
    reminderSettings: { email: true, push: true, defaultTime: '15min' },
    familyView: true,
  });

  // NOVÝ STAV PRO OZNAČENÉ JMENINY
  const [markedNamedays, setMarkedNamedays] = useState<Set<string>>(new Set());

  const calendarDataCache = useRef<
    Map<number, { holidays: Holiday[]; namedays: Nameday[] }>
  >(new Map());

  // Načtení svátků a jmenin (zůstává stejné)
  useEffect(() => {
    const loadData = async () => {
      try {
        const year = currentDate.getFullYear();
        if (calendarDataCache.current.has(year)) {
          const cached = calendarDataCache.current.get(year)!;
          setHolidays(cached.holidays);
          setNamedays(cached.namedays);
          return;
        }
        const { holidays: holidaysData, namedays: namedaysData } =
          await fetchCalendarDataForYear(year);
        calendarDataCache.current.set(year, {
          holidays: holidaysData,
          namedays: namedaysData,
        });
        setHolidays(holidaysData);
        setNamedays(namedaysData);
      } catch (error) {
        console.error('Chyba při načítání dat svátků a jmenin:', error);
      }
    };
    loadData();
  }, [currentDate.getFullYear()]);

    useEffect(() => {
    if (!currentUser) {
      setMarkedNamedays(new Set());
      return;
    }
    const unsubscribe = firestoreService.subscribeToNamedayPreferences(
      currentUser.uid,
      // OPRAVA: Explicitně jsme řekli, jakého typu je parametr 'prefs'
      (prefs: NamedayPreferenceDoc | null) => {
        setMarkedNamedays(new Set(prefs?.markedDates || []));
      }
    );
    return unsubscribe;
  }, [currentUser]);

  const imageCache = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const loadHeaderImage = async () => {
      const month = currentDate.getMonth();

      // Zkontroluj cache
      if (imageCache.current.has(month)) {
        setHeaderImage(imageCache.current.get(month)!);
        return; // ← OKAMŽITĚ hotovo!
      }

      // Pokud není v cache, stáhni a ulož
      const currentTheme = monthThemes[month];
      const query = `${currentTheme.name} ${currentTheme.month}`;
      const imageUrl = await fetchImageForQuery(query);
      imageCache.current.set(month, imageUrl || currentTheme.backgroundImage);
      setHeaderImage(imageUrl || currentTheme.backgroundImage);
    };
    loadHeaderImage();
  }, [currentDate.getMonth()]);

  // --- CRUD OPERACE PRO UDÁLOSTI ---
  const addEvent = useCallback(
    async (
      eventData: Omit<
        CalendarEventData,
        'id' | 'userId' | 'createdAt' | 'updatedAt'
      >
    ) => {
      if (!currentUser) return;
      try {
        await firestoreService.addEvent(currentUser.uid, eventData);
      } catch (error) {
        console.error('Error adding event:', error);
      }
    },
    [currentUser]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<CalendarEventData>) => {
      if (!currentUser) return;
      try {
        await firestoreService.updateEvent(id, updates);
      } catch (error) {
        console.error('Error updating event:', error);
      }
    },
    [currentUser]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!currentUser) return;
      try {
        await firestoreService.deleteEvent(id);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    },
    [currentUser]
  );

  // --- NOVÉ FUNKCE PRO JMENINY ---
  const isNamedayMarked = useCallback(
    (date: Date): boolean => {
      const key = date.toISOString().split('T')[0]; // Klíč ve formátu YYYY-MM-DD
      return markedNamedays.has(key);
    },
    [markedNamedays]
  );

  const markNameday = useCallback(
    async (date: Date, marked: boolean) => {
      if (!currentUser) return;
      const key = date.toISOString().split('T')[0];
      const newMarkedDays = new Set(markedNamedays);
      if (marked) {
        newMarkedDays.add(key);
      } else {
        newMarkedDays.delete(key);
      }
      setMarkedNamedays(newMarkedDays); // Okamžitá aktualizace UI pro plynulost
      // Uložení do Firebase na pozadí
      await firestoreService.saveNamedayPreferences(currentUser.uid, {
        markedDates: Array.from(newMarkedDays),
      });
    },
    [currentUser, markedNamedays]
  );

  // --- POMOCNÉ FUNKCE (zůstávají stejné) ---
  const isSameDay = useCallback((date1: Date | string, date2: Date) => {
    const d1 = new Date(date1);
    return (
      d1.getDate() === date2.getDate() &&
      d1.getMonth() === date2.getMonth() &&
      d1.getFullYear() === date2.getFullYear()
    );
  }, []);

  const getEventsByDate = useCallback(
    (date: Date) => {
      // Použij novou utilitu která zahrnuje opakované události
      return getRecurringEventsForDate(events, date);
    },
    [events]
  );

  // Funkce pro získání pouze narozeninových událostí
  const getBirthdayEventsByDate = useCallback(
    (date: Date) => {
      return events.filter(
        (event) => event.type === 'birthday' && isSameDay(event.date, date)
      );
    },
    [events, isSameDay]
  );

  const getHolidayByDate = useCallback(
    (date: Date) => {
      return holidays.find((holiday) => isSameDay(holiday.date, date)) || null;
    },
    [holidays, isSameDay]
  );

  const getNamedayByDate = useCallback(
    (date: Date) => {
      return namedays.find((nameday) => isSameDay(nameday.date, date)) || null;
    },
    [namedays, isSameDay]
  );

  const updateSettings = (updates: Partial<CalendarSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const getCurrentMonthTheme = () => {
    const month = currentDate.getMonth();
    return monthThemes[month] || monthThemes[0];
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
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
      case 'MONTH':
        return date.toLocaleDateString('cs-CZ', { month: 'long' });
      default:
        return date.toLocaleDateString('cs-CZ');
    }
  };

  const value = useMemo<CalendarContextType>(
    () => ({
      currentDate,
      setCurrentDate,
      currentView,
      setCurrentView,
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventsByDate,
      getBirthdayEventsByDate,
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
      isNamedayMarked,
      markNameday,
    }),
    [
      currentDate,
      currentView,
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventsByDate,
      getBirthdayEventsByDate,
      holidays,
      namedays,
      getHolidayByDate,
      getNamedayByDate,
      headerImage,
      settings,
      isToday,
      isSameDay,
      formatDate,
      isNamedayMarked,
      markNameday,
    ]
  );

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export default CalendarProvider;
