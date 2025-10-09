import React, { useState, useEffect } from 'react';
import CalendarWidget from './CalendarWidget';
import CalendarMobile from './CalendarMobile';
import EventForm from './EventForm';
import { useCalendar } from './CalendarProvider';
import { useIsMobile } from './utils/deviceDetection';
// Opravený import, který se dívá na správné místo a používá správný název
import type { FamilyMember, CalendarEventData } from '@/types';
import './styles/CalendarShared.css';
import { createPortal } from 'react-dom';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyMembers?: FamilyMember[];
}

const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  familyMembers = [],
}) => {
  const { addEvent, updateEvent, deleteEvent } = useCalendar();
  const isMobile = useIsMobile(768);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [defaultMemberId, setDefaultMemberId] = useState<string | undefined>(
    undefined
  );

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

  const handleShowEditForm = (event: CalendarEventData) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(event.date));
    setDefaultMemberId(event.familyMemberId);
    setIsFormOpen(true);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEventData>) => {
    if (selectedEvent) {
      updateEvent(selectedEvent.id, eventData);
    } else {
      const finalDateObject = eventData.date
        ? new Date(eventData.date)
        : selectedDate || new Date();
      const newEventPayload = {
        title: eventData.title || 'Nová událost',
        date: finalDateObject.toISOString().split('T')[0],
        type: 'personal' as const, // Používáme 'as const' pro typovou jistotu
        ...eventData,
      };
      addEvent(newEventPayload);
    }
    setIsFormOpen(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
    setIsFormOpen(false);
  };

  const modalRoot = document.getElementById('modal-root');
  if (!isOpen || !modalRoot) return null;

  return createPortal(
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div
        className={`calendar-modal-content ${isMobile ? 'mobile' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile ? (
          <CalendarMobile familyMembers={familyMembers} />
        ) : (
          <CalendarWidget
            familyMembers={familyMembers}
            onAddEvent={handleShowAddForm}
            onEditEvent={handleShowEditForm}
          />
        )}
      </div>

      {!isMobile && isFormOpen && (
        <EventForm
          event={selectedEvent}
          date={selectedDate}
          familyMembers={familyMembers}
          onSave={handleSaveEvent}
          onDelete={
            selectedEvent
              ? () => handleDeleteEvent(selectedEvent.id)
              : undefined
          }
          onClose={() => setIsFormOpen(false)}
          defaultMemberId={defaultMemberId}
        />
      )}
    </div>,
    modalRoot
  );
};

export default CalendarModal;
