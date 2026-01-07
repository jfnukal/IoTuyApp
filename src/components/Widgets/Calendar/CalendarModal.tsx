import React, { useState, useEffect } from 'react';
import CalendarWidget from './CalendarWidget';
import CalendarMobile from './CalendarMobile';
import EventForm from './EventForm';
import { useCalendar } from './CalendarProvider';
import { useIsMobile } from './utils/deviceDetection';
// Opravený import, který se dívá na správné místo a používá správný název
import type { FamilyMember, CalendarEventData } from '../../../types/index';
import RecurringEditDialog from './RecurringEditDialog';
import type { RecurringEditAction } from './RecurringEditDialog';
import './styles/CalendarShared.css';
import { createPortal } from 'react-dom';
import { isTablet } from '../../../tuya/utils/deviceDetection';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyMembers?: FamilyMember[];
  initialEventToEdit?: CalendarEventData | null;  // 🆕 Pro přímé otevření editace
}

const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  familyMembers = [],
  initialEventToEdit = null,
}) => {
  const { events, addEvent, updateEvent, deleteEvent } = useCalendar();
  const isMobile = useIsMobile(768);
  const isTabletDevice = isTablet();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [defaultMemberId, setDefaultMemberId] = useState<string | undefined>(
    undefined
  );

  // State pro dialog mazání opakovaných událostí
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    event: CalendarEventData | null;
  }>({
    isOpen: false,
    event: null,
  });

  // 🆕 Automaticky otevři editaci, pokud je předána událost
useEffect(() => {
  if (isOpen && initialEventToEdit) {
    setSelectedEvent(initialEventToEdit);
    setSelectedDate(new Date(initialEventToEdit.date));
    setDefaultMemberId(initialEventToEdit.familyMemberId);
    setIsFormOpen(true);
  }
}, [isOpen, initialEventToEdit]);

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

  // Pomocná funkce pro formátování data
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Rozhodne, zda ukázat dialog nebo smazat rovnou
  const handleDeleteEvent = (event: CalendarEventData) => {
    if (event.isRecurringInstance || (event.recurring && event.recurring.frequency)) {
      // Opakovaná událost - ukázat dialog
      setDeleteDialog({
        isOpen: true,
        event: event,
      });
    } else {
      // Běžná událost - smazat rovnou
      if (window.confirm(`Opravdu smazat "${event.title}"?`)) {
        deleteEvent(event.id);
        setIsFormOpen(false);
      }
    }
  };

  // Zpracování výběru z dialogu
  const handleDeleteDialogSelect = async (action: RecurringEditAction) => {
    const { event } = deleteDialog;

    if (action === 'cancel' || !event) {
      setDeleteDialog({ isOpen: false, event: null });
      return;
    }

    const originalEventId = event.originalEventId || event.id;

    switch (action) {
      case 'this':
        // Přidej toto datum do výjimek
        const originalEvent = await getOriginalEvent(originalEventId);
        if (originalEvent && originalEvent.recurring) {
          const currentExceptions = originalEvent.recurring.exceptions || [];
          await updateEvent(originalEventId, {
            recurring: {
              ...originalEvent.recurring,
              exceptions: [...currentExceptions, event.date],
            },
          });
        }
        break;

      case 'future':
        // Ukonči opakování den PŘED tímto datem
        const origEvent = await getOriginalEvent(originalEventId);
        if (origEvent && origEvent.recurring) {
          const dayBefore = new Date(event.date + 'T00:00:00');
          dayBefore.setDate(dayBefore.getDate() - 1);
          const endDateStr = formatDateKey(dayBefore);

          await updateEvent(originalEventId, {
            recurring: {
              ...origEvent.recurring,
              endType: 'date',
              endDate: endDateStr,
            },
          });
        }
        break;

      case 'all':
        // Smaž celou sérii
        if (window.confirm(`Opravdu smazat VŠECHNY výskyty této události?`)) {
          deleteEvent(originalEventId);
        }
        break;
    }

    setDeleteDialog({ isOpen: false, event: null });
    setIsFormOpen(false);
  };

  // Pomocná funkce pro získání původní události
  const getOriginalEvent = (eventId: string): CalendarEventData | null => {
    return events.find(e => e.id === eventId) || null;
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
          <CalendarMobile 
            familyMembers={familyMembers}
            onClose={onClose}
          />
        ) : (
          <CalendarWidget
            familyMembers={familyMembers}
            onAddEvent={handleShowAddForm}
            onEditEvent={handleShowEditForm}
          />
        )}
  
        {/* ✅ FAB tlačítko JEN PRO TABLET */}
        {isTabletDevice && !isMobile && (
          <button
            className="fab-add-event-modal"
            onClick={() => handleShowAddForm(new Date())}
            title="Přidat událost"
          >
            +
          </button>
        )}
      </div>

      {/* Dialog pro mazání opakovaných událostí */}
      <RecurringEditDialog
        isOpen={deleteDialog.isOpen}
        mode="delete"
        eventTitle={deleteDialog.event?.title || ''}
        instanceDate={deleteDialog.event?.date || ''}
        onSelect={handleDeleteDialogSelect}
      />
  
      {!isMobile && isFormOpen && (
        <EventForm
          event={selectedEvent}
          date={selectedDate}
          familyMembers={familyMembers}
          onSave={handleSaveEvent}
          onDelete={
            selectedEvent
              ? () => handleDeleteEvent(selectedEvent)
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
