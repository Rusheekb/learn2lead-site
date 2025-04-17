
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeSubscriptionOptions {
  channelName: string;
  tableName: string;
  filter?: string;
  onData: (payload: any) => void;
  schema?: string;
}

export const createRealtimeSubscription = (options: RealtimeSubscriptionOptions): RealtimeChannel => {
  const {
    channelName,
    tableName,
    filter,
    onData,
    schema = 'public'
  } = options;

  let changeConfig: any = {
    event: '*', // Listen to all events by default
    schema: schema,
    table: tableName
  };
  
  // Add filter if provided
  if (filter) {
    changeConfig.filter = filter;
  }

  return supabase.channel(channelName)
    .on('postgres_changes', changeConfig, payload => {
      onData({
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old
      });
    })
    .subscribe();
};
