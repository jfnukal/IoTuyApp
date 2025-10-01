import React, { useState, useEffect } from 'react';
import CalendarWidget from './CalendarWidget.tsx';
import CalendarMobile from './CalendarMobile.tsx';
import EventForm from './EventForm.tsx';
import { useCalendar } from './CalendarProvider.tsx';
import { useIsMobile } from './utils/deviceDetection';
import type { FamilyMember, CalendarEvent } from './types';
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
  familyMembers = [] 
}) => {
  const { addEvent, updateEvent, deleteEvent } = useCalendar();

  const isMobile = useIsMobile(768);

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
  
  const modalRoot = document.getElementById('modal-root');
  
  // Pokud není portál připraven, nic nerenderujeme
  if (!isOpen || !modalRoot) return null;

  return createPortal(
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div 
        className={`calendar-modal-content ${isMobile ? 'mobile' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile ? (
          <CalendarMobile 
            familyMembers={familyMembers}
          />
        ) : (
          <CalendarWidget 
            familyMembers={familyMembers}
            onAddEvent={handleShowAddForm}
            onEditEvent={handleShowEditForm}
          />
        )}
      </div>
  
      {/* Formulář - na mobilu se zobrazuje z CalendarMobile komponenty */}
      {!isMobile && isFormOpen && (
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
    </div>,
    modalRoot
  );
};

export default CalendarModal;