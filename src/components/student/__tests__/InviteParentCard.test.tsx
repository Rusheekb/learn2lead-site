import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InviteParentCard from '../InviteParentCard';
import { useMyFamilyStatus } from '@/hooks/queries/useFamilyQueries';
import { cancelParentInvite, inviteParent } from '@/services/family/mutations';

jest.mock('@/hooks/queries/useFamilyQueries', () => ({
  familyKeys: { all: ['family'] },
  useMyFamilyStatus: jest.fn(),
}));
jest.mock('@/services/family/mutations', () => ({
  inviteParent: jest.fn(),
  cancelParentInvite: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const status = (data: unknown) =>
  (useMyFamilyStatus as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    error: null,
  });

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InviteParentCard />
    </QueryClientProvider>
  );

describe('InviteParentCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('explains that the parent takes over hours and payments', () => {
    status({ guardian: null, pendingInvite: null });
    renderCard();
    expect(
      screen.getByText(/they take over your hours and payments/)
    ).toBeInTheDocument();
  });

  it('validates the email before sending', async () => {
    status({ guardian: null, pendingInvite: null });
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Invite/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Enter your parent's email address."
    );
    expect(inviteParent).not.toHaveBeenCalled();
  });

  it('sends an invite', async () => {
    status({ guardian: null, pendingInvite: null });
    (inviteParent as jest.Mock).mockResolvedValue({
      success: true,
      email_sent: true,
    });
    renderCard();
    fireEvent.change(screen.getByLabelText('Parent’s email'), {
      target: { value: 'mom@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Invite/ }));
    await waitFor(() =>
      expect(inviteParent).toHaveBeenCalledWith('mom@example.com')
    );
  });

  it('shows a pending invite and lets the student cancel it', async () => {
    status({
      guardian: null,
      pendingInvite: {
        email: 'mom@example.com',
        createdAt: '2026-10-15T00:00:00Z',
        expiresAt: '2026-10-29T12:00:00Z',
      },
    });
    (cancelParentInvite as jest.Mock).mockResolvedValue(undefined);
    renderCard();
    expect(screen.getByText('mom@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel invite' }));
    await waitFor(() => expect(cancelParentInvite).toHaveBeenCalled());
  });

  it('shows who manages the hours once linked', () => {
    status({
      guardian: {
        firstName: 'Mona',
        lastName: 'Teen',
        email: 'mom@example.com',
      },
      pendingInvite: null,
    });
    renderCard();
    expect(screen.getByText('Mona Teen')).toBeInTheDocument();
    expect(screen.queryByLabelText('Parent’s email')).not.toBeInTheDocument();
  });
});
