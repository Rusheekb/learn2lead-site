
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeSubscription as createRealtimeSubscriptionNew } from "./realtimeSubscription";

export interface RealtimeConfig {
  channelName: string;
  tableName: string;
  onInsert?: (newData: any) => void;
  onUpdate?: (updatedData: any) => void;
  onDelete?: (deletedData: any) => void;
}

/**
 * Creates a Supabase realtime subscription (legacy version)
 * @deprecated Use createRealtimeSubscription from realtimeSubscription.ts instead
 */
export const createLegacyRealtimeSubscription = ({
  channelName,
  tableName,
  onInsert,
  onUpdate,
  onDelete
}: RealtimeConfig) => {
  console.warn('Using deprecated createRealtimeSubscription from realtimeUtils.ts. Please update to use the new utility from realtimeSubscription.ts');
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen for all events
        schema: 'public',
        table: tableName
      },
      (payload) => {
        console.log(`Real-time update received for ${tableName}:`, payload);
        
        // Handle different types of changes
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload.new);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload.new);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload.old);
        }
      }
    )
    .subscribe();
  
  // Return channel for cleanup
  return channel;
};

// Re-export the new createRealtimeSubscription for convenience
export { createRealtimeSubscriptionNew as createRealtimeSubscription };

/**
 * Converts a database UUID to a numeric ID for frontend use
 */
export const dbIdToNumeric = (dbId: string): number => {
  return parseInt(dbId.substring(0, 8), 16);
};

/**
 * Converts a numeric ID to a UUID-like string for database queries
 */
export const numericIdToDbId = (numericId: number): string => {
  return numericId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
};
