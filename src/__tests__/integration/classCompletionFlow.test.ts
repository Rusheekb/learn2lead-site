/**
 * Integration tests for the complete class completion flow
 * Exercises completeClass end-to-end against a mocked Supabase client,
 * focusing on call shapes (auth headers, RPC payload) rather than the
 * message-by-message coverage already handled in classCompletion.test.ts.
 */

const mockFunctionsInvoke = jest.fn();
const mockAuthGetSession = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockFunctionsInvoke,
    },
    auth: {
      getSession: mockAuthGetSession,
    },
    rpc: mockRpc,
    from: () => ({ insert: jest.fn().mockResolvedValue({ error: null }) }),
  },
}));

const toastCalls: { type: string; message: string; options?: unknown }[] = [];
jest.mock('sonner', () => ({
  toast: {
    success: (message: string, options?: unknown) => {
      toastCalls.push({ type: 'success', message, options });
    },
    error: (message: string, options?: unknown) => {
      toastCalls.push({ type: 'error', message, options });
    },
  },
}));

import { completeClass, CompleteClassData } from '@/services/classCompletion';

describe('Class Completion Flow Integration', () => {
  const classData: CompleteClassData = {
    classId: 'class-123',
    classNumber: 'SM-JD-20241215-1',
    title: 'Algebra Fundamentals',
    tutorName: 'John Doe',
    studentName: 'Sarah Miller',
    studentId: 'student-456',
    tutorId: 'tutor-789',
    date: '2024-12-15',
    day: 'Sunday',
    timeCst: '14:00-15:00',
    timeHrs: '1.5',
    subject: 'Math',
    content: 'Covered quadratic equations and factoring',
    hw: 'Complete worksheet problems 1-20',
    additionalInfo: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toastCalls.length = 0;

    mockAuthGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'tutor-123' },
        },
      },
    });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  describe('Happy Path - Complete Class Flow', () => {
    it('completes full flow: auth -> deduct -> atomic RPC -> toast', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 7 },
        error: null,
      });

      const result = await completeClass(classData);

      expect(result).toBe(true);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'deduct-class-credit',
        expect.objectContaining({
          body: expect.objectContaining({
            student_id: 'student-456',
            class_id: 'class-123',
            duration_hours: 1.5,
          }),
        })
      );
      expect(mockRpc).toHaveBeenCalledWith(
        'complete_class_atomic',
        expect.objectContaining({
          p_class_id: 'class-123',
          p_tutor_name: 'John Doe',
          p_student_name: 'Sarah Miller',
        })
      );

      const successToast = toastCalls.find((t) => t.type === 'success');
      expect(successToast?.message).toContain('7 hours remaining');
    });

    it('sends the tutor access token as a bearer header on the deduction call', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });

      await completeClass(classData);

      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'deduct-class-credit',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });

    it('passes the class number through as class_title in the deduction request', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });

      await completeClass(classData);

      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'deduct-class-credit',
        expect.objectContaining({
          body: expect.objectContaining({
            class_title: 'SM-JD-20241215-1',
          }),
        })
      );
    });
  });

  describe('Subscription Required Flow', () => {
    it('shows subscription required message and never reaches the atomic RPC', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, code: 'NO_SUBSCRIPTION' },
        error: null,
      });

      const result = await completeClass(classData);

      expect(result).toBe(false);
      const errorToast = toastCalls.find((t) => t.type === 'error');
      expect(errorToast?.message).toContain('no active subscription');
      expect(errorToast?.options).toHaveProperty('action');
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery Flow', () => {
    it('invokes restore-class-credit when the atomic RPC fails after a successful deduction', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: new Error('network blip'),
      });
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, new_balance: 6 },
        error: null,
      });

      const result = await completeClass(classData);

      expect(result).toBe(false);
      expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
        2,
        'restore-class-credit',
        expect.objectContaining({
          body: expect.objectContaining({ class_id: 'class-123' }),
        })
      );
    });
  });
});
