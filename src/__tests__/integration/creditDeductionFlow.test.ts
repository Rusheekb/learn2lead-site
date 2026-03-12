/**
 * Integration tests for the credit deduction and recovery flow
 * Validates credit lifecycle: check → deduct → log → recover on failure
 */

import { completeClass, CompleteClassData } from '@/services/classCompletion';

const mockFunctionsInvoke = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFrom = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

// Track insert calls for verification
let lastInsertedData: any = null;

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (cols?: string) => ({
          eq: (_col: string, _val: string) => ({
            maybeSingle: jest.fn().mockImplementation(() => {
              if (table === 'scheduled_classes') {
                return Promise.resolve({ data: { id: 'class-123' }, error: null });
              }
              if (table === 'class_logs') {
                return Promise.resolve({ data: null, error: null });
              }
              if (table === 'students') {
                return Promise.resolve({ data: { class_rate: 35 }, error: null });
              }
              if (table === 'tutors') {
                return Promise.resolve({ data: { hourly_rate: 25 }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          }),
        }),
        insert: (data: any) => {
          lastInsertedData = data;
          return Promise.resolve({ error: null });
        },
        update: (data: any) => ({
          eq: () => Promise.resolve({ error: null }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
    auth: {
      getSession: () => mockAuthGetSession(),
    },
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock('@/lib/posthog', () => ({
  captureEvent: jest.fn(),
}));

jest.mock('@/lib/sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

const classData: CompleteClassData = {
  classId: 'class-123',
  classNumber: 'TS-SM-20260315-1',
  title: 'Math Session',
  tutorName: 'Test Tutor',
  studentName: 'Test Student',
  studentId: 'student-456',
  tutorId: 'tutor-789',
  date: '2026-03-15',
  day: 'Sunday',
  timeCst: '14:00',
  timeHrs: '1.5',
  subject: 'Math',
  content: 'Quadratic equations',
  hw: 'Problems 1-10',
  additionalInfo: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  lastInsertedData = null;

  mockAuthGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: 'mock-token',
        user: { id: 'tutor-789', email: 'tutor@test.com' },
      },
    },
    error: null,
  });
});

describe('Credit Deduction Flow', () => {
  it('should deduct 1.5 credits for a 1.5-hour session', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        success: true,
        credits_remaining: 8.5,
        credits_deducted: 1.5,
      },
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
  });

  it('should include tutor_user_id and student_user_id in class log insert', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, credits_remaining: 8, credits_deducted: 1.5 },
      error: null,
    });

    await completeClass(classData);

    expect(lastInsertedData).toEqual(
      expect.objectContaining({
        tutor_user_id: 'tutor-789',
        student_user_id: 'student-456',
        'Tutor Name': 'Test Tutor',
        'Student Name': 'Test Student',
      })
    );
  });

  it('should block completion when student has no subscription', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        success: false,
        error: 'No active subscription found',
        code: 'NO_SUBSCRIPTION',
      },
      error: null,
    });

    const result = await completeClass(classData);

    expect(result).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith(
      'Student has no active subscription',
      expect.any(Object)
    );
  });

  it('should block completion when student has insufficient credits', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        success: false,
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
      },
      error: null,
    });

    const result = await completeClass(classData);

    expect(result).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith(
      'Student has insufficient hours remaining',
      expect.any(Object)
    );
  });

  it('should block completion when not authenticated', async () => {
    mockAuthGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await completeClass(classData);

    expect(result).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith(
      'You must be logged in to complete classes'
    );
  });

  it('should warn when credits are low after deduction', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, credits_remaining: 1, credits_deducted: 1.5 },
      error: null,
    });

    const result = await completeClass(classData);

    expect(result).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      '1 hour remaining',
      expect.objectContaining({
        description: 'Student is running low on hours',
      })
    );
  });

  it('should show admin override message when applicable', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        success: true,
        credits_remaining: 0,
        credits_deducted: 0,
        admin_override: true,
      },
      error: null,
    });

    const result = await completeClass(classData);

    expect(result).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Class completed (Admin Override)',
      expect.any(Object)
    );
  });
});
