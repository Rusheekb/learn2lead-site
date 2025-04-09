
export const formatTime = (timeString: string) => {
  const [hourStr, minuteStr] = timeString.split(':');
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

export const hasEventsOnDate = (date: Date, events: any[]) => {
  return getEventsForDate(date, events).length > 0;
};

export const getEventsForDate = (date: Date, events: any[]) => {
  return events.filter(event => {
    const sameDay = event.date.getDate() === date.getDate() && 
                   event.date.getMonth() === date.getMonth() && 
                   event.date.getFullYear() === date.getFullYear();
    
    if (event.recurring && event.recurringDays) {
      const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
      return sameDay || event.recurringDays.includes(dayOfWeek);
    }
    
    return sameDay;
  });
};
