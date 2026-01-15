/**
 * Mock responses for Supabase Edge Functions used in testing
 */

export interface DeductCreditSuccessResponse {
  success: true;
  credits_remaining: number;
  transaction_id: string;
}

export interface DeductCreditErrorResponse {
  success: false;
  error: string;
  code?: 'NO_SUBSCRIPTION' | 'INSUFFICIENT_CREDITS' | 'AUTH_ERROR';
}

export type DeductCreditResponse = DeductCreditSuccessResponse | DeductCreditErrorResponse;

export interface RestoreCreditSuccessResponse {
  success: true;
  credits_restored: number;
  new_balance: number;
}

export interface RestoreCreditErrorResponse {
  success: false;
  error: string;
}

export type RestoreCreditResponse = RestoreCreditSuccessResponse | RestoreCreditErrorResponse;

export interface CheckSubscriptionResponse {
  subscribed: boolean;
  credits_remaining: number;
  plan_name: string | null;
  price_per_class: number | null;
  subscription_end?: string;
  product_id?: string;
  is_paused?: boolean;
  pause_resumes_at?: string | null;
}

// Factory functions for creating mock responses
export const edgeFunctionMocks = {
  deductCredit: {
    success: (creditsRemaining: number): { data: DeductCreditSuccessResponse; error: null } => ({
      data: {
        success: true,
        credits_remaining: creditsRemaining,
        transaction_id: `txn-${Date.now()}`,
      },
      error: null,
    }),
    
    noSubscription: (): { data: DeductCreditErrorResponse; error: null } => ({
      data: {
        success: false,
        error: 'No active subscription found',
        code: 'NO_SUBSCRIPTION',
      },
      error: null,
    }),
    
    insufficientCredits: (): { data: DeductCreditErrorResponse; error: null } => ({
      data: {
        success: false,
        error: 'Insufficient credits. Please purchase more classes.',
        code: 'INSUFFICIENT_CREDITS',
      },
      error: null,
    }),
    
    authError: (): { data: null; error: { message: string } } => ({
      data: null,
      error: { message: 'Not authenticated' },
    }),
  },
  
  restoreCredit: {
    success: (newBalance: number): { data: RestoreCreditSuccessResponse; error: null } => ({
      data: {
        success: true,
        credits_restored: 1,
        new_balance: newBalance,
      },
      error: null,
    }),
    
    failure: (): { data: RestoreCreditErrorResponse; error: null } => ({
      data: {
        success: false,
        error: 'Failed to restore credit',
      },
      error: null,
    }),
    
    networkError: (): { data: null; error: { message: string } } => ({
      data: null,
      error: { message: 'Network error' },
    }),
  },
  
  checkSubscription: {
    active: (credits: number, planName = 'Standard'): { data: CheckSubscriptionResponse; error: null } => ({
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
    
    inactive: (): { data: CheckSubscriptionResponse; error: null } => ({
      data: {
        subscribed: false,
        credits_remaining: 0,
        plan_name: null,
        price_per_class: null,
      },
      error: null,
    }),
    
    paused: (resumesAt: string, credits = 5): { data: CheckSubscriptionResponse; error: null } => ({
      data: {
        subscribed: true,
        credits_remaining: credits,
        plan_name: 'Standard',
        price_per_class: 20,
        is_paused: true,
        pause_resumes_at: resumesAt,
      },
      error: null,
    }),
    
    lowCredits: (credits = 2): { data: CheckSubscriptionResponse; error: null } => ({
      data: {
        subscribed: true,
        credits_remaining: credits,
        plan_name: 'Basic',
        price_per_class: 17.50,
        is_paused: false,
      },
      error: null,
    }),
    
    negativeCredits: (credits = -3): { data: CheckSubscriptionResponse; error: null } => ({
      data: {
        subscribed: true,
        credits_remaining: credits,
        plan_name: 'Standard',
        price_per_class: 20,
        is_paused: false,
      },
      error: null,
    }),
    
    error: (): { data: null; error: { message: string } } => ({
      data: null,
      error: { message: 'Failed to check subscription status' },
    }),
  },
  
  manualCreditAllocation: {
    success: (newBalance: number): { data: { success: true; new_balance: number }; error: null } => ({
      data: {
        success: true,
        new_balance: newBalance,
      },
      error: null,
    }),
    
    failure: (): { data: { success: false; error: string }; error: null } => ({
      data: {
        success: false,
        error: 'Failed to allocate credits',
      },
      error: null,
    }),
  },
};
