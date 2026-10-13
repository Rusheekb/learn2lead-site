/**
 * Tests for classCompletion service
 * Critical path testing for credit deduction and class logging via
 * the complete_class_atomic RPC.
 */

// Mock declarations must precede the import below: importing classCompletion
// triggers its own import of the mocked module, and jest.mock() factories are
// hoisted above imports but not above these const declarations — if the
// import came first, the factory would reference these before initialization.
const mockFunctionsInvoke = jest.fn();
const mockAuthGetSession = jest.fn();
const mockRpc = jest.fn();
const mockNotificationsInsert = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockFunctionsInvoke,
    },
    auth: {
      getSession: mockAuthGetSession,
    },
    rpc: mockRpc,
    from: (table: string) => {
      if (table === 'notifications') {
        return { insert: mockNotificationsInsert };
      }
      throw new Error(`Unexpected table in test: ${table}`);
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

import { completeClass, CompleteClassData } from '../classCompletion';

describe('completeClass', () => {
  const validClassData: CompleteClassData = {
    classId: 'class-123',
    classNumber: 'SM-JD-20241215-1',
    title: 'Math Tutoring',
    tutorName: 'John Doe',
    studentName: 'Sarah Miller',
    studentId: 'student-456',
    tutorId: 'tutor-789',
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
    mockNotificationsInsert.mockResolvedValue({ error: null });
  });

  describe('happy path', () => {
    it('completes class successfully with normal hours remaining', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 7 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'deduct-class-credit',
        expect.any(Object)
      );
      expect(mockRpc).toHaveBeenCalledWith(
        'complete_class_atomic',
        expect.objectContaining({ p_class_id: 'class-123' })
      );
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed - 7 hours remaining'
      );
    });

    it('uses singular "hour" for exactly 1 hour remaining', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 1 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed - 1 hour remaining',
        expect.objectContaining({
          description: 'Student is running low on hours',
        })
      );
    });

    it('shows low hours warning when under 3 hours remaining', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 2 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed - 2 hours remaining',
        expect.objectContaining({
          description: 'Student is running low on hours',
        })
      );
    });

    it('shows no-hours-remaining message with pricing action at zero', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 0 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed - No hours remaining',
        expect.objectContaining({
          description: 'Student needs to purchase more hours',
        })
      );
    });

    it('shows admin override message when applicable', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 0, admin_override: true },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const result = await completeClass(validClassData);

      expect(result).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed (Admin Override)',
        expect.any(Object)
      );
    });
  });

  describe('error handling - authentication', () => {
    it('returns false when not authenticated', async () => {
      mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        'You must be logged in to complete classes'
      );
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });
  });

  describe('error handling - credit deduction', () => {
    // supabase-js returns data: null for non-2xx responses (deduct-class-credit
    // uses 402 for out-of-hours) and exposes the JSON body via error.context —
    // mock that real shape, not data-populated errors.
    const httpError = (body: object, status = 402) => ({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: { status, json: () => Promise.resolve(body) },
      },
    });

    it('explains out-of-hours to the tutor with exact hours from a 402 body', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce(
        httpError({
          success: false,
          code: 'NO_CREDITS',
          credits_needed: 1,
          credits_remaining: 0,
        })
      );

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      const [title, opts] = mockToastError.mock.calls[0];
      expect(title).toContain('out of hours');
      expect(opts.description).toContain('needs 1 hour');
      expect(opts.description).toContain('only has 0 hours left');
      expect(opts.description).toContain('Nothing was charged');
      expect(opts.description).toContain('learn2leadtutoring@gmail.com');
      expect(opts.action.label).toBe('Copy details');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('explains a student with no hours ever purchased (NO_SUBSCRIPTION)', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce(
        httpError({ success: false, code: 'NO_SUBSCRIPTION' })
      );

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      const [title, opts] = mockToastError.mock.calls[0];
      expect(title).toContain('out of hours');
      expect(opts.description).toContain("hasn't purchased any hours yet");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('still explains out-of-hours when the body lacks hour counts', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, code: 'INSUFFICIENT_CREDITS' },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      const [title, opts] = mockToastError.mock.calls[0];
      expect(title).toContain('out of hours');
      expect(opts.description).toContain("doesn't have enough hours left");
    });

    it('shows a generic error for an unrecognized failure code', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, error: 'Something went wrong', code: 'X' },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('Something went wrong');
    });
  });

  describe('error handling - complete_class_atomic RPC', () => {
    it('restores credit and reports failure when the RPC call itself errors', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: new Error('connection reset'),
      });
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, new_balance: 6 },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'restore-class-credit',
        expect.any(Object)
      );
      expect(mockToastError).toHaveBeenCalledWith(
        'Failed to complete class - credit has been restored',
        expect.any(Object)
      );
    });

    it('does not restore credit when the class was already completed', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({
        data: { success: false, code: 'ALREADY_COMPLETED' },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        'This class has already been completed'
      );
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1); // only deduct-class-credit
    });

    it('restores credit when the scheduled class no longer exists', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({
        data: { success: false, code: 'CLASS_NOT_FOUND' },
        error: null,
      });
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, new_balance: 6 },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        'Class no longer exists or has already been completed'
      );
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'restore-class-credit',
        expect.any(Object)
      );
    });
  });

  describe('restoreCredit behavior', () => {
    it('shows a neutral success message when the class was actually already logged server-side', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: new Error('timeout'),
      });
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, error: 'class_already_completed' },
        error: null,
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Class completed successfully'
      );
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('writes an admin alert notification when restoration itself fails', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, credits_remaining: 5 },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: new Error('timeout'),
      });
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false },
        error: new Error('restore failed'),
      });

      const result = await completeClass(validClassData);

      expect(result).toBe(false);
      expect(mockNotificationsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'admin_alert',
          user_id: 'student-456',
        })
      );
      expect(mockToastError).toHaveBeenCalledWith(
        'Class completion failed and credit could not be restored automatically',
        expect.any(Object)
      );
    });
  });
});
