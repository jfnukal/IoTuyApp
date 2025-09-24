import React, { useState, useEffect } from 'react';
import CalendarWidget from './CalendarWidget.tsx';
import EventForm from './EventForm.tsx';
import { useCalendar } from './CalendarProvider.tsx';
import type { FamilyMember, CalendarEvent } from './types';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyMembers?: FamilyMember[];
}

const CalendarModal: React.FC<CalendarModalProps> = ({ 
  isOpen, 
  onClose, 
  familyMembers = [] 
}) => {
  const { addEvent, updateEvent, deleteEvent } = useCalendar();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [defaultMemberId, setDefaultMemberId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        isFormOpen ? setIsFormOpen(false) : onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isFormOpen]);

  if (!isOpen) return null;

  const handleShowAddForm = (date: Date, memberId?: string) => {
    setSelectedEvent(null);
    setSelectedDate(date);
    setDefaultMemberId(memberId);
    setIsFormOpen(true);
  };

  const handleShowEditForm = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(event.date);
    setDefaultMemberId(event.familyMember);
    setIsFormOpen(true);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    if (selectedEvent) {
      updateEvent(selectedEvent.id, eventData);
    } else {
      addEvent({
        id: Date.now().toString(),
        title: eventData.title || '',
        date: eventData.date || selectedDate || new Date(),
        type: 'personal',
        ...eventData,
      });
    }
    setIsFormOpen(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
    setIsFormOpen(false);
  };
  
  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div 
        className="calendar-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <CalendarWidget 
          familyMembers={familyMembers}
          onAddEvent={handleShowAddForm}
          onEditEvent={handleShowEditForm}
        />
      </div>

      {/* Formulář je nyní sourozenec obsahu modálu, ne jeho dítě */}
      {isFormOpen && (
        <EventForm
          event={selectedEvent}
          date={selectedDate}
          familyMembers={familyMembers}
          onSave={handleSaveEvent}
          onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent.id) : undefined}
          onClose={() => setIsFormOpen(false)}
          defaultMemberId={defaultMemberId}
        />
      )}
    </div>
  );
};

export default CalendarModal;