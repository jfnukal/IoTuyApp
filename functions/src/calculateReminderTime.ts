export function calculateReminderTime(
  eventDate: string,     // 'YYYY-MM-DD'
  reminderValue: number, // 10, 1, 2...
  reminderUnit: string,  // 'minutes', 'hours', 'days', 'weeks', 'ontime'
  eventTime?: string     // 'HH:mm' nebo undefined (OPTIONAL na konci!)
): number {
  // Vytvoř datum události
  const eventDateTime = new Date(eventDate);
  
  if (eventTime) {
    const [hours, minutes] = eventTime.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
  } else {
    // Celodenní událost - připomínka v 8:00
    eventDateTime.setHours(8, 0, 0, 0);
  }
  
  const eventTimestamp = eventDateTime.getTime();
  
  // Výpočet času připomínky
  switch (reminderUnit) {
    case 'ontime':
      return eventTimestamp;
    case 'minutes':
      return eventTimestamp - (reminderValue * 60 * 1000);
    case 'hours':
      return eventTimestamp - (reminderValue * 60 * 60 * 1000);
    case 'days':
      return eventTimestamp - (reminderValue * 24 * 60 * 60 * 1000);
    case 'weeks':
      return eventTimestamp - (reminderValue * 7 * 24 * 60 * 60 * 1000);
    default:
      return eventTimestamp;
  }
}
