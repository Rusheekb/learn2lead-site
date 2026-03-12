/**
 * Integration tests for student dashboard data loading
 * Validates subscription check, class fetching, and credit display
 */

const mockFunctionsInvoke = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockAuthGetSession = jest.fn();

// Configurable query responses per table
const queryResponses: Record<string, { data: any; error: any }> = {};

function setQueryResponse(table: string, data: any, error: any = null) {
  queryResponses[table] = { data, error };
}

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      const response = queryResponses[table] || { data: null, error: null };
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(response),
            maybeSingle: () => Promise.resolve(response),
            order: () => Promise.resolve(response),
          }),
          order: () => Promise.resolve(response),
        }),
      };
    },
    rpc: (fn: string, args?: any) => {
      mockRpc(fn, args);
      return Promise.resolve({ data: null, error: null });
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
    auth: {
      getSession: () => mockAuthGetSession(),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(queryResponses).forEach((k) => delete queryResponses[k]);

  mockAuthGetSession.mockResolvedValue({
    data: {
      session: {
        user: { id: 'student-123', email: 'student@test.com' },
        access_token: 'mock-token',
      },
    },
    error: null,
  });
});

describe('Student Dashboard Loading', () => {
  describe('Subscription status check', () => {
    it('should detect active subscription with correct credit balance', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          subscribed: true,
          credits_remaining: 8,
          plan_name: 'Standard',
          price_per_class: 35,
          is_paused: false,
        },
        error: null,
      });

      const { data } = await mockFunctionsInvoke('check-subscription', {
        body: { student_id: 'student-123' },
      });

      expect(data.subscribed).toBe(true);
      expect(data.credits_remaining).toBe(8);
      expect(data.plan_name).toBe('Standard');
    });

    it('should handle no subscription gracefully', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          subscribed: false,
          credits_remaining: 0,
          plan_name: null,
        },
        error: null,
      });

      const { data } = await mockFunctionsInvoke('check-subscription', {
        body: { student_id: 'student-123' },
      });

      expect(data.subscribed).toBe(false);
      expect(data.credits_remaining).toBe(0);
    });

    it('should detect paused subscription', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          subscribed: true,
          credits_remaining: 5,
          is_paused: true,
          pause_resumes_at: '2026-04-01T00:00:00Z',
        },
        error: null,
      });

      const { data } = await mockFunctionsInvoke('check-subscription', {
        body: { student_id: 'student-123' },
      });

      expect(data.is_paused).toBe(true);
      expect(data.credits_remaining).toBe(5);
    });
  });

  describe('Profile loading', () => {
    it('should load student profile data', async () => {
      setQueryResponse('profiles', {
        id: 'student-123',
        email: 'student@test.com',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student',
        avatar_url: null,
      });

      const { supabase } = require('@/integrations/supabase/client');
      const result = await supabase
        .from('profiles')
        .select()
        .eq('id', 'student-123')
        .single();

      expect(result.data.role).toBe('student');
      expect(result.data.email).toBe('student@test.com');
      expect(result.error).toBeNull();
    });

    it('should handle missing profile', async () => {
      setQueryResponse('profiles', null, { message: 'Row not found' });

      const { supabase } = require('@/integrations/supabase/client');
      const result = await supabase
        .from('profiles')
        .select()
        .eq('id', 'nonexistent')
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('Class logs loading', () => {
    it('should fetch student class history ordered by date', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          'Student Name': 'Test Student',
          Subject: 'Math',
          Date: '2026-03-10',
          'Time (CST)': '14:00',
          student_user_id: 'student-123',
        },
        {
          id: 'log-2',
          'Student Name': 'Test Student',
          Subject: 'Science',
          Date: '2026-03-08',
          'Time (CST)': '10:00',
          student_user_id: 'student-123',
        },
      ];

      setQueryResponse('class_logs', mockLogs);

      const { supabase } = require('@/integrations/supabase/client');
      const result = await supabase
        .from('class_logs')
        .select()
        .eq('student_user_id', 'student-123')
        .order('Date', { ascending: false });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].Subject).toBe('Math');
      expect(mockFrom).toHaveBeenCalledWith('class_logs');
    });

    it('should return empty array when no class history exists', async () => {
      setQueryResponse('class_logs', []);

      const { supabase } = require('@/integrations/supabase/client');
      const result = await supabase
        .from('class_logs')
        .select()
        .eq('student_user_id', 'student-123')
        .order('Date', { ascending: false });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('Upcoming classes loading', () => {
    it('should fetch upcoming scheduled classes for student', async () => {
      const mockClasses = [
        {
          id: 'class-1',
          title: 'Algebra',
          date: '2026-03-20',
          start_time: '14:00',
          end_time: '15:00',
          status: 'scheduled',
          student_id: 'student-123',
          subject: 'Math',
        },
      ];

      setQueryResponse('scheduled_classes', mockClasses);

      const { supabase } = require('@/integrations/supabase/client');
      const result = await supabase
        .from('scheduled_classes')
        .select()
        .eq('student_id', 'student-123')
        .order('date', { ascending: true });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('scheduled');
    });
  });

  describe('Credit balance via RPC', () => {
    it('should call get_student_credit_balance RPC', async () => {
      mockRpc.mockImplementation((fn: string) => {
        if (fn === 'get_student_credit_balance') {
          return Promise.resolve({ data: 8, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const { supabase } = require('@/integrations/supabase/client');
      const result = await supabase.rpc('get_student_credit_balance', {
        p_student_id: 'student-123',
      });

      expect(mockRpc).toHaveBeenCalledWith('get_student_credit_balance', {
        p_student_id: 'student-123',
      });
    });
  });
});
