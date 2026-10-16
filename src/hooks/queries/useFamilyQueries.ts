import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchStudentLoginStatus,
  fetchFamilyHoursHistory,
  fetchMyChildren,
  fetchMyFamilyStatus,
  fetchMyPendingInvites,
} from '@/services/family/fetch';

export const familyKeys = {
  all: ['family'] as const,
  children: (userId: string) =>
    [...familyKeys.all, 'children', userId] as const,
  hoursHistory: (userId: string) =>
    [...familyKeys.all, 'hours-history', userId] as const,
  pendingInvites: (userId: string) =>
    [...familyKeys.all, 'pending-invites', userId] as const,
  status: (userId: string) => [...familyKeys.all, 'status', userId] as const,
  loginStatus: (studentId: string) =>
    [...familyKeys.all, 'login-status', studentId] as const,
};

/** The signed-in parent's children. */
export const useMyChildren = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: familyKeys.children(user?.id ?? ''),
    queryFn: fetchMyChildren,
    enabled: !!user?.id,
  });
};

export const useFamilyHoursHistory = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: familyKeys.hoursHistory(user?.id ?? ''),
    queryFn: () => fetchFamilyHoursHistory(50),
    enabled: !!user?.id && enabled,
  });
};

/** Invites from students addressed to the signed-in user's email. */
export const useMyPendingInvites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: familyKeys.pendingInvites(user?.id ?? ''),
    queryFn: fetchMyPendingInvites,
    enabled: !!user?.id,
  });
};

/** A student's parent link and pending invite. */
export const useMyFamilyStatus = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: familyKeys.status(user?.id ?? ''),
    queryFn: fetchMyFamilyStatus,
    enabled: !!user?.id && enabled,
  });
};

/** A parent's view of one student's sign-in. */
export const useStudentLoginStatus = (studentId: string) =>
  useQuery({
    queryKey: familyKeys.loginStatus(studentId),
    queryFn: () => fetchStudentLoginStatus(studentId),
    enabled: !!studentId,
  });
