
import { ClassEvent } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';

// Function to format date and time for Google Calendar
const formatDateTimeForGoogleCalendar = (date: Date | string, time: string): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const [hours, minutes] = time.split(':');
  
  const newDate = new Date(dateObj);
  newDate.setHours(parseInt(hours), parseInt(minutes), 0);
  
  return newDate.toISOString().replace(/[-:]/g, '').replace(/\.\d+/g, '');
};

// Function to generate Google Calendar event URL
export const getGoogleCalendarUrl = (event: ClassEvent): string => {
  if (!event.date || !event.startTime || !event.endTime) return '#';
  
  const startDateTime = formatDateTimeForGoogleCalendar(event.date, event.startTime);
  const endDateTime = formatDateTimeForGoogleCalendar(event.date, event.endTime);
  
  const title = encodeURIComponent(event.title);
  const description = encodeURIComponent(`
    Subject: ${event.subject}
    Tutor: ${event.tutorName || ''}
    Student: ${event.studentName || ''}
    ${event.notes ? `Notes: ${event.notes}` : ''}
    ${event.zoomLink ? `Zoom Link: ${event.zoomLink}` : ''}
  `.trim());
  
  const location = event.zoomLink ? encodeURIComponent('Zoom Meeting') : '';
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${description}&location=${location}`;
};

// Function to get Outlook web calendar URL
export const getOutlookCalendarUrl = (event: ClassEvent): string => {
  if (!event.date || !event.startTime || !event.endTime) return '#';
  
  const startDateTime = formatDateTimeForGoogleCalendar(event.date, event.startTime);
  const endDateTime = formatDateTimeForGoogleCalendar(event.date, event.endTime);
  
  const subject = encodeURIComponent(event.title);
  const body = encodeURIComponent(`
    Subject: ${event.subject}
    Tutor: ${event.tutorName || ''}
    Student: ${event.studentName || ''}
    ${event.notes ? `Notes: ${event.notes}` : ''}
    ${event.zoomLink ? `Zoom Link: ${event.zoomLink}` : ''}
  `.trim());
  
  const location = event.zoomLink ? encodeURIComponent('Zoom Meeting') : '';
  
  return `https://outlook.office.com/calendar/0/deeplink/compose?subject=${subject}&startdt=${startDateTime}&enddt=${endDateTime}&body=${body}&location=${location}`;
};

// Function to get the ICS calendar feed URL for a user
export const getUserCalendarFeedUrl = async (userId: string): Promise<string | null> => {
  try {
    // Get the user's calendar feed ID from the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('calendar_feed_id')
      .eq('id', userId)
      .single();
    
    if (error || !data || !data.calendar_feed_id) {
      console.error('Error getting calendar feed ID:', error);
      return null;
    }
    
    // Generate the feed URL using the REST endpoint we created
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lnhtlbatcufmsyoujuqh.supabase.co';
    return `${baseUrl}/rest/v1/calendar/ics/${data.calendar_feed_id}`;
  } catch (error) {
    console.error('Error getting calendar feed URL:', error);
    return null;
  }
};

// Function to download the ICS file directly
export const downloadIcsFile = async (userId: string, eventTitle: string = 'Classes'): Promise<void> => {
  try {
    const feedUrl = await getUserCalendarFeedUrl(userId);
    if (!feedUrl) return;
    
    const response = await fetch(feedUrl);
    const icsData = await response.text();
    
    // Create a blob and download it
    const blob = new Blob([icsData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventTitle.replace(/\s+/g, '-')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading ICS file:', error);
  }
};
