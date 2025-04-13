
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeSubscriptionConfig<T> {
  channelName: string;
  tableName: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  onData: (payload: { new: T; old: T | null; eventType: string }) => void;
}

/**
 * Creates and returns a Supabase realtime subscription
 * @param config Configuration for the realtime subscription
 * @returns The Supabase channel for cleanup
 */
export const createRealtimeSubscription = <T>(
  config: RealtimeSubscriptionConfig<T>
): RealtimeChannel => {
  const { channelName, tableName, event = "*", schema = "public", onData } = config;

  console.log(`Setting up realtime subscription for ${tableName} on ${channelName}`);

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes" as any,
      {
        event,
        schema,
        table: tableName,
      },
      (payload) => {
        console.log(`Realtime update for ${tableName}:`, payload);
        onData({
          new: payload.new as T,
          old: payload.old as T | null,
          eventType: payload.eventType,
        });
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`Successfully subscribed to ${tableName} changes`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`Error subscribing to ${tableName} changes`);
        toast.error(`Failed to establish realtime connection for ${tableName}`);
      }
    });

  return channel;
};

/**
 * Hook to use Supabase realtime subscription
 * @param config Configuration for the realtime subscription
 * @returns Cleanup function to unsubscribe
 */
export const useRealtimeSubscription = <T>(
  config: RealtimeSubscriptionConfig<T>
): (() => void) => {
  const channel = createRealtimeSubscription(config);

  return () => {
    console.log(`Cleaning up realtime subscription for ${config.tableName}`);
    supabase.removeChannel(channel);
  };
};
