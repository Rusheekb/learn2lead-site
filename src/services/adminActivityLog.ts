import { supabase } from '@/integrations/supabase/client';

export type AdminActionType =
  | 'payroll_processed'
  | 'credits_adjusted'
  | 'referral_created'
  | 'referral_toggled'
  | 'rates_updated'
  | 'role_changed';

export async function logAdminAction(params: {
  actionType: AdminActionType;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('admin_activity_log' as any).insert({
    admin_id: user.id,
    action_type: params.actionType,
    description: params.description,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? null,
  });
  // Best-effort — never throw; logging should never break the main action.
}
