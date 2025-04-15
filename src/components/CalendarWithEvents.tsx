
import { startOfDay, addDays } from 'date-fns';
import { ClassEvent } from '../types/tutorTypes';

const getUpcomingEvents = (events: ClassEvent[]): ClassEvent[] => {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  
  return events.filter(event => {
    const eventDate = startOfDay(event.date); // event.date is already a Date object
    return eventDate >= today && eventDate <= nextWeek;
  });
};
