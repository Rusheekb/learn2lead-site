
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeSubscriptionOptions<T = any> {
  channelName: string;
  tableName: string;
  filter?: string;
  onData: (payload: any) => void;
  schema?: string;
}

export const createRealtimeSubscription = <T = any>(options: RealtimeSubscriptionOptions<T>): RealtimeChannel => {
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
