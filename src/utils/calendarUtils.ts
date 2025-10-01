import { parseDateToLocal } from './safeDateUtils';

// Utility functions for calendar integration

/**
 * Safely parse HH:mm time string and return hours and minutes
 */
const parseHHMM = (timeStr: string): { hours: number; minutes: number } | null => {
  if (!timeStr || typeof timeStr !== 'string') {
    console.warn('Invalid time string:', timeStr);
    return null;
  }
  
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    console.warn('Time string not in HH:mm format:', timeStr);
    return null;
  }
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn('Invalid time values:', { hours, minutes });
    return null;
  }
  
  return { hours, minutes };
};

/**
 * Returns the calendar feed URL for a given user
 * @param userId The user ID to get the calendar feed for
 * @returns Promise<string> The URL for the calendar feed
 */
export const getUserCalendarFeedUrl = async (userId: string): Promise<string> => {
  try {
    // In a real implementation, this would fetch the user's calendar_feed_id from the database
    // For now, we'll generate a URL based on the user ID as a placeholder
    const baseUrl = window.location.origin;
    // In a real app, you would use calendar_feed_id instead of userId
    return `${baseUrl}/api/calendar/ics/${userId}`;
  } catch (error) {
    console.error('Error getting calendar feed URL:', error);
    return '';
  }
};

/**
 * Creates a Google Calendar event URL
 * @param event The class event to create a Google Calendar URL for
 * @returns string The Google Calendar URL
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
    // Parse date to local midnight without timezone shift
    const baseDate = parseDateToLocal(event.date);
    
    // Parse start and end times
    const startParsed = parseHHMM(event.startTime);
    const endParsed = parseHHMM(event.endTime);
    
    if (!startParsed || !endParsed) {
      console.warn('Invalid start or end time for calendar URL');
      return '#';
    }
    
    // Create start and end Date objects in local time
    const startDate = new Date(baseDate);
    startDate.setHours(startParsed.hours, startParsed.minutes, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(endParsed.hours, endParsed.minutes, 0, 0);
    
    // Format as YYYYMMDDTHHMMSS (local time, no Z suffix)
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
    
    // Create description with Zoom link if available
    let description = event.notes || '';
    if (event.zoomLink) {
      description += `\n\nJoin Zoom Meeting: ${event.zoomLink}`;
    }
    
    // Build the Google Calendar URL
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
    console.warn('Error creating Google Calendar URL:', error);
    return '#';
  }
};

/**
 * Creates an Outlook Calendar event URL
 * @param event The class event to create an Outlook Calendar URL for
 * @returns string The Outlook Calendar URL
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
    // Parse date to local midnight without timezone shift
    const baseDate = parseDateToLocal(event.date);
    
    // Parse start and end times
    const startParsed = parseHHMM(event.startTime);
    const endParsed = parseHHMM(event.endTime);
    
    if (!startParsed || !endParsed) {
      console.warn('Invalid start or end time for calendar URL');
      return '#';
    }
    
    // Create start and end Date objects in local time
    const startDate = new Date(baseDate);
    startDate.setHours(startParsed.hours, startParsed.minutes, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(endParsed.hours, endParsed.minutes, 0, 0);
    
    // Format as ISO strings for Outlook
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    
    // Create description with Zoom link if available
    let description = event.notes || '';
    if (event.zoomLink) {
      description += `\n\nJoin Zoom Meeting: ${event.zoomLink}`;
    }
    
    // Build the Outlook Calendar URL
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
    console.warn('Error creating Outlook Calendar URL:', error);
    return '#';
  }
};

/**
 * Creates a download URL for an ICS file
 * @param event The class event to create an ICS file for
 * @returns string The download URL
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
    // Parse date to local midnight without timezone shift
    const baseDate = parseDateToLocal(event.date);
    
    // Parse start and end times
    const startParsed = parseHHMM(event.startTime);
    const endParsed = parseHHMM(event.endTime);
    
    if (!startParsed || !endParsed) {
      console.warn('Invalid start or end time for ICS file');
      return '#';
    }
    
    // Create start and end Date objects in local time
    const startDate = new Date(baseDate);
    startDate.setHours(startParsed.hours, startParsed.minutes, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(endParsed.hours, endParsed.minutes, 0, 0);
    
    // Format as YYYYMMDDTHHMMSS (local time, no Z suffix for floating time)
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
    
    // Create a unique ID for the event
    const eventUid = `${event.id}@learn2lead.com`;
    
    // Escape special characters in ICS format
    const escapeIcs = (str: string) => str.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    
    // Create ICS content
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
    
    // Create a Blob and download URL
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error) {
    console.warn('Error creating ICS download URL:', error);
    return '#';
  }
};
