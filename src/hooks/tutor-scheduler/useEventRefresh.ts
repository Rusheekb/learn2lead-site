
import { useState } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';

export function useEventRefresh() {
  // Add a function to refresh the selected event with the latest data
  const refreshEvent = async (
    selectedEvent: ClassEvent | null, 
    setSelectedEvent: (event: ClassEvent | null) => void,
    setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
  ) => {
    if (!selectedEvent || !selectedEvent.id) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select('*, materials_url')
        .eq('id', selectedEvent.id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Update the selected event with the latest data
        const updatedEvent: ClassEvent = {
          ...selectedEvent,
          materialsUrl: data.materials_url || []
        };
        
        setSelectedEvent(updatedEvent);
        
        // Also update in the scheduledClasses array
        setScheduledClasses(prevClasses => 
          prevClasses.map(cls => 
            cls.id === selectedEvent.id ? updatedEvent : cls
          )
        );
      }
    } catch (error) {
      console.error('Error refreshing event:', error);
    }
  };

  return { refreshEvent };
}
