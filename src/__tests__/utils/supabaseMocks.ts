/**
 * Supabase mock utilities for testing Edge Functions and database queries
 */

// Mock Edge Function responses
export const mockDeductCredit = {
  success: (creditsRemaining: number, transactionId = 'txn-123') => ({
    data: {
      success: true,
      credits_remaining: creditsRemaining,
      transaction_id: transactionId,
    },
    error: null,
  }),
  noSubscription: () => ({
    data: {
      success: false,
      error: 'No active subscription found',
      code: 'NO_SUBSCRIPTION',
    },
    error: null,
  }),
  insufficientCredits: () => ({
    data: {
      success: false,
      error: 'Insufficient credits',
      code: 'INSUFFICIENT_CREDITS',
    },
    error: null,
  }),
  authError: () => ({
    data: null,
    error: { message: 'Not authenticated' },
  }),
};

export const mockRestoreCredit = {
  success: (newBalance: number) => ({
    data: {
      success: true,
      credits_restored: 1,
      new_balance: newBalance,
    },
    error: null,
  }),
  failure: () => ({
    data: {
      success: false,
      error: 'Restoration failed',
    },
    error: null,
  }),
};

export const mockCheckSubscription = {
  active: (credits: number, planName = 'Standard') => ({
    data: {
      subscribed: true,
      credits_remaining: credits,
      plan_name: planName,
      price_per_class: 20,
      is_paused: false,
      pause_resumes_at: null,
    },
    error: null,
  }),
  inactive: () => ({
    data: {
      subscribed: false,
      credits_remaining: 0,
      plan_name: null,
      price_per_class: null,
    },
    error: null,
  }),
  paused: (resumesAt: string, credits = 5) => ({
    data: {
      subscribed: true,
      credits_remaining: credits,
      plan_name: 'Standard',
      is_paused: true,
      pause_resumes_at: resumesAt,
    },
    error: null,
  }),
  error: () => ({
    data: null,
    error: { message: 'Failed to check subscription' },
  }),
};

// Database query mock builders
export function createQueryMock() {
  const mock = {
    data: null as unknown,
    error: null as Error | null,
    
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => Promise.resolve({ data: mock.data, error: mock.error })),
    maybeSingle: jest.fn().mockImplementation(() => Promise.resolve({ data: mock.data, error: mock.error })),
    
    setResponse: (data: unknown, error: Error | null = null) => {
      mock.data = data;
      mock.error = error;
      return mock;
    },
  };
  
  return mock;
}

// Auth mock builders
export function createAuthMock(session: { user: { id: string; email: string } } | null = null) {
  return {
    getSession: jest.fn().mockResolvedValue({
      data: { session },
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: session?.user ?? null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    refreshSession: jest.fn().mockResolvedValue({
      data: { session },
      error: null,
    }),
  };
}

// Functions invoke mock builder
export function createFunctionsMock() {
  const responses: Record<string, unknown> = {};
  
  return {
    invoke: jest.fn().mockImplementation((functionName: string) => {
      if (responses[functionName]) {
        return Promise.resolve(responses[functionName]);
      }
      return Promise.resolve({ data: null, error: { message: 'Function not mocked' } });
    }),
    
    setResponse: (functionName: string, response: unknown) => {
      responses[functionName] = response;
    },
  };
}

// Combined Supabase client mock
export function createSupabaseMock() {
  const queryMock = createQueryMock();
  const authMock = createAuthMock();
  const functionsMock = createFunctionsMock();
  
  return {
    ...queryMock,
    auth: authMock,
    functions: functionsMock,
    
    setAuth: (session: { user: { id: string; email: string } } | null) => {
      authMock.getSession.mockResolvedValue({ data: { session }, error: null });
      authMock.getUser.mockResolvedValue({ data: { user: session?.user ?? null }, error: null });
    },
  };
}
