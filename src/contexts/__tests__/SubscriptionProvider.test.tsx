/**
 * Integration tests for the Subscription Provider
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SubscriptionProvider, SubscriptionContext, SubscriptionContextType } from '../SubscriptionContext/SubscriptionProvider';

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('../../AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock supabase client
const mockFunctionsInvoke = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockFunctionsInvoke,
    },
    auth: {
      refreshSession: mockRefreshSession,
    },
  },
}));

// Test consumer component to access context
let capturedContext: SubscriptionContextType | undefined;
const TestConsumer: React.FC = () => {
  const context = React.useContext(SubscriptionContext);
  capturedContext = context;
  return null;
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

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
      });

      expect(capturedContext?.subscribed).toBe(false);
      expect(capturedContext?.creditsRemaining).toBeNull();
      expect(capturedContext?.planName).toBeNull();
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it('returns default values when session has no access token', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        session: { access_token: null },
      });

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
      });

      expect(capturedContext?.subscribed).toBe(false);
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
      mockFunctionsInvoke.mockResolvedValueOnce({
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

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
      });

      expect(capturedContext?.subscribed).toBe(true);
      expect(capturedContext?.creditsRemaining).toBe(8);
      expect(capturedContext?.planName).toBe('Standard');
      expect(capturedContext?.pricePerClass).toBe(20);
      expect(capturedContext?.error).toBeNull();
    });

    it('handles paused subscription state', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          subscribed: true,
          credits_remaining: 5,
          plan_name: 'Standard',
          is_paused: true,
          pause_resumes_at: '2025-02-01',
        },
        error: null,
      });

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
      });

      expect(capturedContext?.isPaused).toBe(true);
      expect(capturedContext?.pauseResumesAt).toBe('2025-02-01');
    });

    it('handles inactive subscription', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          subscribed: false,
          credits_remaining: 0,
          plan_name: null,
        },
        error: null,
      });

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

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
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      });

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
      });

      expect(capturedContext?.error).toBeTruthy();
      expect(capturedContext?.subscribed).toBe(false);
    });

    it('attempts session refresh on auth error', async () => {
      // First call returns auth error
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: '401 Unauthorized' },
      });

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: { access_token: 'new-token' } },
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

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

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
        data: null,
        error: { message: 'Session expired' },
      });

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
      });

      expect(capturedContext?.error).toContain('Session expired');
    });
  });

  describe('refreshSubscription function', () => {
    it('exposes refreshSubscription function', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        session: { access_token: 'valid-token' },
      });

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { subscribed: true, credits_remaining: 5 },
        error: null,
      });

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isLoading).toBe(false);
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

      render(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.creditsRemaining).toBe(5);
      });

      // Trigger refresh
      await capturedContext?.refreshSubscription();

      await waitFor(() => {
        expect(capturedContext?.creditsRemaining).toBe(4);
      });

      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(2);
    });
  });
});
