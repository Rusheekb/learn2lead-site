/**
 * Tests for classCompletion service
 * Critical path testing for credit deduction and class logging
 */

import { completeClass, CompleteClassData } from '../classCompletion';

// Mock supabase client
const mockFunctionsInvoke = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...selectArgs: unknown[]) => {
          mockSelect(...selectArgs);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                maybeSingle: mockMaybeSingle,
              };
            },
          };
        },
        insert: mockInsert,
        delete: () => ({
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return mockDelete();
          },
        }),
      };
    },
    functions: {
      invoke: mockFunctionsInvoke,
    },
    auth: {
      getSession: mockAuthGetSession,
    },
  },
}));

// Mock sonner toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('completeClass', () => {
  const validClassData: CompleteClassData = {
    classId: 'class-123',
    classNumber: 'SM-JD-20241215-1',
    title: 'Math Tutoring',
    tutorName: 'John Doe',
    studentName: 'Sarah Miller',
    studentId: 'student-456',
    date: '2024-12-15',
    day: 'Sunday',
    timeCst: '14:00-15:00',
    timeHrs: '1.0',
    subject: 'Math',
    content: 'Covered algebra basics',
    hw: 'Practice problems 1-10',
    additionalInfo: '',
  };

  const mockSession = {
    session: {
      access_token: 'test-token',
      user: { id: 'tutor-123', email: 'tutor@test.com' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetSession.mockResolvedValue({ data: mockSession });
  });

  describe('happy path', () => {
    it('completes class successfully with normal credits', async () => {
      // Setup: Class exists
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-123' }, error: null }) // Class exists check
        .mockResolvedValueOnce({ data: null, error: null }); // No existing log

      // Credit deduction succeeds
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 7 },
        error: null,
      });

      // Insert log succeeds
      mockInsert.mockResolvedValueOnce({ error: null });

      // Delete scheduled class succeeds
      mockDelete.mockResolvedValueOnce({ error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('deduct-class-credit', expect.any(Object));
      expect(mockToastSuccess).toHaveBeenCalledWith('Class completed - 7 classes remaining');
    });

    it('shows low credit warning when under 3 credits remaining', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 2 },
        error: null,
      });

      mockInsert.mockResolvedValueOnce({ error: null });
      mockDelete.mockResolvedValueOnce({ error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed - 2 classes remaining',
        expect.objectContaining({ description: 'Student is running low on credits' })
      );
    });

    it('shows admin override message when applicable', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 0, admin_override: true },
        error: null,
      });

      mockInsert.mockResolvedValueOnce({ error: null });
      mockDelete.mockResolvedValueOnce({ error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed (Admin Override)',
        expect.any(Object)
      );
    });
  });

  describe('error handling - class verification', () => {
    it('returns false when class does not exist', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('Class no longer exists or has already been completed');
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it('handles database error when checking class existence', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ 
        data: null, 
        error: new Error('Database connection failed') 
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  describe('error handling - authentication', () => {
    it('returns false when not authenticated', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'class-123' }, error: null });
      mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('You must be logged in to complete classes');
    });
  });

  describe('error handling - subscription errors', () => {
    it('handles NO_SUBSCRIPTION error with pricing CTA', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'class-123' }, error: null });
      
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, code: 'NO_SUBSCRIPTION', error: 'No active subscription' },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        'Student has no active subscription',
        expect.objectContaining({
          description: 'Please subscribe to continue taking classes',
          action: expect.any(Object),
        })
      );
    });

    it('handles INSUFFICIENT_CREDITS error with pricing CTA', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'class-123' }, error: null });
      
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, code: 'INSUFFICIENT_CREDITS', error: 'Insufficient credits' },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        'Student has no remaining credits',
        expect.objectContaining({
          description: 'Please purchase more credits to continue',
        })
      );
    });
  });

  describe('error handling - duplicate prevention', () => {
    it('returns false when class log already exists', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-123' }, error: null }) // Class exists
        .mockResolvedValueOnce({ data: { id: 'existing-log' }, error: null }); // Log already exists

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('This class has already been completed');
    });
  });

  describe('credit restoration on failure', () => {
    it('restores credit when log creation fails', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      // Credit deduction succeeds
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 7 },
        error: null,
      });

      // Insert fails
      mockInsert.mockResolvedValueOnce({ error: new Error('Insert failed') });

      // Restore credit succeeds
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, new_balance: 8 },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('restore-class-credit', expect.any(Object));
      expect(mockToastError).toHaveBeenCalledWith(
        'Failed to create class log - credit has been restored',
        expect.any(Object)
      );
    });

    it('shows admin contact message when credit restoration fails', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 7 },
        error: null,
      });

      mockInsert.mockResolvedValueOnce({ error: new Error('Insert failed') });

      // Restore credit fails
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, error: 'Restoration failed' },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        'Class log failed and credit could not be restored automatically',
        expect.objectContaining({
          description: 'Please contact admin to restore the credit manually',
        })
      );
    });
  });

  describe('cleanup on delete failure', () => {
    it('cleans up log when scheduled class delete fails', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 7 },
        error: null,
      });

      mockInsert.mockResolvedValueOnce({ error: null });
      mockDelete
        .mockResolvedValueOnce({ error: new Error('Delete failed') }) // scheduled_classes delete fails
        .mockResolvedValueOnce({ error: null }); // class_logs cleanup succeeds

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('Failed to remove completed class from schedule');
    });
  });
});
