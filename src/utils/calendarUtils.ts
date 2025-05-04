
// Utility functions for calendar integration

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
    // Format the date and times for Google Calendar
    const dateStr = typeof event.date === 'string' ? event.date : event.date.toISOString().split('T')[0];
    
    // Parse and format the start and end times
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    
    const startDate = new Date(dateStr);
    startDate.setHours(startHour, startMinute);
    
    const endDate = new Date(dateStr);
    endDate.setHours(endHour, endMinute);
    
    // Format dates for Google Calendar URL
    const start = startDate.toISOString().replace(/-|:|\.\d+/g, '');
    const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    
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
    console.error('Error creating Google Calendar URL:', error);
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
    // Format the date and times for Outlook Calendar
    const dateStr = typeof event.date === 'string' ? event.date : event.date.toISOString().split('T')[0];
    
    // Parse and format the start and end times
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    
    const startDate = new Date(dateStr);
    startDate.setHours(startHour, startMinute);
    
    const endDate = new Date(dateStr);
    endDate.setHours(endHour, endMinute);
    
    // Format dates for Outlook Calendar URL
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
    console.error('Error creating Outlook Calendar URL:', error);
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
    // Format the date and times for ICS file
    const dateStr = typeof event.date === 'string' ? event.date : event.date.toISOString().split('T')[0];
    
    // Parse and format the start and end times
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    
    const startDate = new Date(dateStr);
    startDate.setHours(startHour, startMinute);
    
    const endDate = new Date(dateStr);
    endDate.setHours(endHour, endMinute);
    
    // Format dates for ICS file
    const start = startDate.toISOString().replace(/-|:|\.\d+/g, '');
    const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    
    // Create a unique ID for the event
    const eventUid = `${event.id}@learn2lead.com`;
    
    // Create ICS content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Learn2Lead//Tutoring Platform//EN',
      'BEGIN:VEVENT',
      `UID:${eventUid}`,
      `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d+/g, '')}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.notes || ''}\n\nJoin Zoom Meeting: ${event.zoomLink || ''}`,
      event.zoomLink ? `LOCATION:Zoom Meeting` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\n');
    
    // Create a Blob and download URL
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error) {
    console.error('Error creating ICS download URL:', error);
    return '#';
  }
};
