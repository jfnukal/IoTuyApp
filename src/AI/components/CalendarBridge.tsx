// src/AI/components/CalendarBridge.tsx
// Neviditelná komponenta — propojuje CalendarProvider ↔ calendarService
import React, { useEffect } from 'react';
import { useCalendar } from '../../components/Widgets/Calendar/CalendarProvider';
import {
  syncEvents,
  syncNamedays,
  registerAddEventHandler,
} from '../services/calendarService';
import { firestoreService } from '../../services/firestoreService';
import { syncFamilyMembers } from '../services/calendarService';

export const CalendarBridge: React.FC = () => {
  const { events, namedays, addEvent } = useCalendar();

  // Sync událostí do AI cache
  useEffect(() => {
    syncEvents(events);
  }, [events]);

  // Sync jmenin do AI cache (jednou — data se nemění)
  useEffect(() => {
    if (namedays.length > 0) syncNamedays(namedays);
  }, [namedays]);

  // Registrace handleru pro přidávání událostí
  useEffect(() => {
    registerAddEventHandler(addEvent);
  }, [addEvent]);

  // Sync rodinných členů (pro naroz. a sváteky z rodiny)
  useEffect(() => {
    let unsub: (() => void) | undefined;
    firestoreService
      .subscribeToFamilyMembers((members) => syncFamilyMembers(members))
      .then((fn) => { unsub = fn; });
    return () => unsub?.();
  }, []);

  return null;
};
