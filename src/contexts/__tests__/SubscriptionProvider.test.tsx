/**
 * Integration tests for the Subscription Provider
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { SubscriptionProvider, SubscriptionContext, SubscriptionContextType } from '../SubscriptionContext/SubscriptionProvider';

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('../AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock supabase client
const mockFunctionsInvoke = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
    auth: {
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

// Test consumer component to access context
let capturedContext: SubscriptionContextType | undefined;
const TestConsumer: React.FC = () => {
  const context = React.useContext(SubscriptionContext);
  capturedContext = context;
  return <div data-testid="test-consumer">Consumer</div>;
};

describe('SubscriptionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedContext = undefined;
  });

  describe('unauthenticated state', () => {
    it('returns default values when user is not logged in', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      expect(capturedContext?.subscribed).toBe(false);
      expect(capturedContext?.creditsRemaining).toBeNull();
      expect(capturedContext?.planName).toBeNull();
      expect(capturedContext?.isLoading).toBe(false);
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it('returns default values when session has no access token', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        session: { access_token: null },
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      expect(capturedContext?.subscribed).toBe(false);
      expect(capturedContext?.isLoading).toBe(false);
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });
  });

  describe('successful subscription fetch', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'valid-token' },
      });
    });

    it('fetches and populates subscription data on mount', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          subscribed: true,
          credits_remaining: 8,
          plan_name: 'Standard',
          price_per_class: 20,
          product_id: 'prod_123',
          subscription_end: '2025-01-15',
          is_paused: false,
          pause_resumes_at: null,
        },
        error: null,
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      await waitFor(() => {
        expect(capturedContext?.subscribed).toBe(true);
      });

      expect(capturedContext?.creditsRemaining).toBe(8);
      expect(capturedContext?.planName).toBe('Standard');
      expect(capturedContext?.pricePerClass).toBe(20);
      expect(capturedContext?.isLoading).toBe(false);
    });

    it('handles zero credits state', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          subscribed: true,
          credits_remaining: 0,
          plan_name: '4 Credit Pack',
        },
        error: null,
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      await waitFor(() => {
        expect(capturedContext?.creditsRemaining).toBe(0);
      });

      expect(capturedContext?.subscribed).toBe(true);
    });

    it('handles inactive subscription', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          subscribed: false,
          credits_remaining: 0,
          plan_name: null,
        },
        error: null,
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
      });

      expect(capturedContext?.subscribed).toBe(false);
      expect(capturedContext?.creditsRemaining).toBe(0);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        session: { access_token: 'valid-token' },
      });
    });

    it('handles function invocation errors', async () => {
      mockFunctionsInvoke.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      await waitFor(() => {
        expect(capturedContext?.error).toBeTruthy();
      });

      expect(capturedContext?.isLoading).toBe(false);
    });

    it('attempts session refresh on auth error', async () => {
      // First call returns auth error
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: '401 Unauthorized' },
      });

      mockRefreshSession.mockResolvedValueOnce({
        error: null,
      });

      // Second call after refresh succeeds
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          subscribed: true,
          credits_remaining: 5,
        },
        error: null,
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      await waitFor(() => {
        expect(mockRefreshSession).toHaveBeenCalled();
      });
    });

    it('handles auth error in response data', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { auth_error: true },
        error: null,
      });

      mockRefreshSession.mockResolvedValueOnce({
        error: { message: 'Session expired' },
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      await waitFor(() => {
        expect(capturedContext?.error).toContain('Session expired');
      });
    });
  });

  describe('refreshSubscription function', () => {
    it('exposes refreshSubscription function', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        session: { access_token: 'valid-token' },
      });

      mockFunctionsInvoke.mockResolvedValue({
        data: { subscribed: true, credits_remaining: 5 },
        error: null,
      });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      expect(typeof capturedContext?.refreshSubscription).toBe('function');
    });

    it('refreshSubscription refetches data', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        session: { access_token: 'valid-token' },
      });

      mockFunctionsInvoke
        .mockResolvedValueOnce({
          data: { subscribed: true, credits_remaining: 5 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { subscribed: true, credits_remaining: 4 },
          error: null,
        });

      await act(async () => {
        render(
          <SubscriptionProvider>
            <TestConsumer />
          </SubscriptionProvider>
        );
      });

      await waitFor(() => {
        expect(capturedContext?.creditsRemaining).toBe(5);
      });

      // Trigger refresh
      await act(async () => {
        await capturedContext?.refreshSubscription();
      });

      await waitFor(() => {
        expect(capturedContext?.creditsRemaining).toBe(4);
      });

      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(2);
    });
  });
});
