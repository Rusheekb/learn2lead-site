import { renderHook } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useRoleSync } from '../useRoleSync';
import {
  createStudent,
  deleteStudent,
} from '@/services/students/studentService';
import { createTutor, deleteTutor } from '@/services/tutors/tutorService';

jest.mock('@/services/students/studentService', () => ({
  createStudent: jest.fn().mockResolvedValue({}),
  deleteStudent: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/services/tutors/tutorService', () => ({
  createTutor: jest.fn().mockResolvedValue({}),
  deleteTutor: jest.fn().mockResolvedValue({}),
}));

type AuthCallback = (event: string, session: unknown) => Promise<void>;

function mockProfileRole(role: string | null) {
  (supabase.from as jest.Mock).mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () =>
          Promise.resolve({ data: role ? { role } : null, error: null }),
      }),
    }),
  }));
}

function signIn(metadataRole: string | undefined) {
  renderHook(() => useRoleSync());
  const calls = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls;
  const callback = calls[calls.length - 1][0] as AuthCallback;
  return callback('SIGNED_IN', {
    user: {
      id: 'user-1',
      email: 'kai.parent@example.com',
      user_metadata: metadataRole ? { role: metadataRole } : {},
    },
  });
}

describe('useRoleSync', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never creates or deletes rows for a parent, whatever the old metadata says', async () => {
    mockProfileRole('parent');
    await signIn('student');
    expect(createStudent).not.toHaveBeenCalled();
    expect(deleteStudent).not.toHaveBeenCalled();
    expect(createTutor).not.toHaveBeenCalled();
    expect(deleteTutor).not.toHaveBeenCalled();
  });

  it('does nothing for a family sign-up (no metadata role)', async () => {
    mockProfileRole('parent');
    await signIn(undefined);
    expect(createStudent).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('still syncs a student as before', async () => {
    mockProfileRole('student');
    await signIn('student');
    expect(createStudent).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'kai.parent@example.com' })
    );
    expect(deleteTutor).toHaveBeenCalledWith('user-1');
  });

  it('still syncs a tutor as before', async () => {
    mockProfileRole('tutor');
    await signIn('tutor');
    expect(createTutor).toHaveBeenCalled();
    expect(deleteStudent).toHaveBeenCalledWith('user-1');
  });
});
