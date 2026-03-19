import { parseDateToLocal } from './safeDateUtils';
import { logger } from '@/lib/logger';

const log = logger.create('calendarUtils');

// Utility functions for calendar integration

/**
 * Safely parse HH:mm time string and return hours and minutes
 */
const parseHHMM = (timeStr: string): { hours: number; minutes: number } | null => {
  if (!timeStr || typeof timeStr !== 'string') {
    log.warn('Invalid time string', { timeStr });
    return null;
  }
  
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    log.warn('Time string not in HH:mm format', { timeStr });
    return null;
  }
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    log.warn('Invalid time values', { hours, minutes });
    return null;
  }
  
  return { hours, minutes };
};

/**
 * Returns the calendar feed URL for a given user
 */
export const getUserCalendarFeedUrl = async (userId: string): Promise<string> => {
  try {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/calendar/ics/${userId}`;
  } catch (error) {
    log.error('Error getting calendar feed URL', error);
    return '';
  }
};

/**
 * Creates a Google Calendar event URL
 */
export const createGoogleCalendarUrl = (event: {
  title: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  zoomLink?: string | null;
  notes?: string | null;
}): string => {
  try {
    const baseDate = parseDateToLocal(event.date);
    const startParsed = parseHHMM(event.startTime);
    const endParsed = parseHHMM(event.endTime);
    
    if (!startParsed || !endParsed) {
      log.warn('Invalid start or end time for calendar URL');
      return '#';
    }
    
    const startDate = new Date(baseDate);
    startDate.setHours(startParsed.hours, startParsed.minutes, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(endParsed.hours, endParsed.minutes, 0, 0);
    
    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const start = formatLocal(startDate);
    const end = formatLocal(endDate);
    
    let description = event.notes || '';
    if (event.zoomLink) {
      description += `\n\nJoin Zoom Meeting: ${event.zoomLink}`;
    }
    
    const url = new URL('https://www.google.com/calendar/event');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);
    url.searchParams.append('dates', `${start}/${end}`);
    url.searchParams.append('details', description);
    if (event.zoomLink) {
      url.searchParams.append('location', 'Zoom Meeting');
    }
    
    return url.toString();
  } catch (error) {
    log.warn('Error creating Google Calendar URL', { error });
    return '#';
  }
};

/**
 * Creates an Outlook Calendar event URL
 */
export const createOutlookCalendarUrl = (event: {
  title: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  zoomLink?: string | null;
  notes?: string | null;
}): string => {
  try {
    const baseDate = parseDateToLocal(event.date);
    const startParsed = parseHHMM(event.startTime);
    const endParsed = parseHHMM(event.endTime);
    
    if (!startParsed || !endParsed) {
      log.warn('Invalid start or end time for calendar URL');
      return '#';
    }
    
    const startDate = new Date(baseDate);
    startDate.setHours(startParsed.hours, startParsed.minutes, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(endParsed.hours, endParsed.minutes, 0, 0);
    
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    
    let description = event.notes || '';
    if (event.zoomLink) {
      description += `\n\nJoin Zoom Meeting: ${event.zoomLink}`;
    }
    
    const url = new URL('https://outlook.office.com/calendar/0/deeplink/compose');
    url.searchParams.append('subject', event.title);
    url.searchParams.append('startdt', start);
    url.searchParams.append('enddt', end);
    url.searchParams.append('body', description);
    if (event.zoomLink) {
      url.searchParams.append('location', 'Zoom Meeting');
    }
    
    return url.toString();
  } catch (error) {
    log.warn('Error creating Outlook Calendar URL', { error });
    return '#';
  }
};

/**
 * Creates a download URL for an ICS file
 */
export const createIcsDownloadUrl = (event: {
  id: string;
  title: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  zoomLink?: string | null;
  notes?: string | null;
}): string => {
  try {
    const baseDate = parseDateToLocal(event.date);
    const startParsed = parseHHMM(event.startTime);
    const endParsed = parseHHMM(event.endTime);
    
    if (!startParsed || !endParsed) {
      log.warn('Invalid start or end time for ICS file');
      return '#';
    }
    
    const startDate = new Date(baseDate);
    startDate.setHours(startParsed.hours, startParsed.minutes, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(endParsed.hours, endParsed.minutes, 0, 0);
    
    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const start = formatLocal(startDate);
    const end = formatLocal(endDate);
    const now = formatLocal(new Date());
    
    const eventUid = `${event.id}@learn2lead.com`;
    const escapeIcs = (str: string) => str.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Learn2Lead//Tutoring Platform//EN',
      'BEGIN:VEVENT',
      `UID:${eventUid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.notes || '')}${event.zoomLink ? '\\n\\nJoin Zoom Meeting: ' + escapeIcs(event.zoomLink) : ''}`,
      event.zoomLink ? `LOCATION:Zoom Meeting` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error) {
    log.warn('Error creating ICS download URL', { error });
    return '#';
  }
};
