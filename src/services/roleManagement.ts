import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export interface RolePromotionResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  user_id?: string;
  active_students?: number;
}

export async function promoteStudentToTutor(
  studentUserId: string, 
  reason: string = 'Admin promotion'
): Promise<RolePromotionResult> {
  const { data, error } = await supabase.rpc('promote_student_to_tutor', {
    student_user_id: studentUserId,
    reason: reason
  });

  if (error) {
    console.error('Error promoting student to tutor:', error);
    return {
      success: false,
      error: error.message,
      code: 'RPC_ERROR'
    };
  }

  return data as unknown as RolePromotionResult;
}

export async function demoteTutorToStudent(
  tutorUserId: string, 
  reason: string = 'Admin demotion'
): Promise<RolePromotionResult> {
  const { data, error } = await supabase.rpc('demote_tutor_to_student', {
    tutor_user_id: tutorUserId,
    reason: reason
  });

  if (error) {
    console.error('Error demoting tutor to student:', error);
    return {
      success: false,
      error: error.message,
      code: 'RPC_ERROR'
    };
  }

  return data as unknown as RolePromotionResult;
}

export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

export async function fetchRoleChangeAudit(userId?: string) {
  let query = supabase
    .from('role_change_audit')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Error fetching role change audit:', error);
    return [];
  }

  return data;
}