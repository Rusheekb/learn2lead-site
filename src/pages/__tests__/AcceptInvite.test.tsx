import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AcceptInvite from '../AcceptInvite';
import { useAuth } from '@/contexts/AuthContext';
import { acceptParentInvite } from '@/services/family/mutations';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/family/mutations', () => ({
  acceptParentInvite: jest.fn(),
}));
jest.mock('@/components/NavBar', () => () => null);

const TOKEN = '00000000-0000-0000-0000-000000000001';

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/accept-invite${search}`]}>
      <AcceptInvite />
    </MemoryRouter>
  );

const auth = (user: { email: string } | null) =>
  (useAuth as jest.Mock).mockReturnValue({
    user,
    isLoading: false,
    signOut: jest.fn(),
  });

describe('AcceptInvite', () => {
  const originalLocation = window.location;
  const assign = jest.fn();
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    });
  });
  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
  beforeEach(() => jest.clearAllMocks());

  it('explains a broken link', () => {
    auth(null);
    renderAt('?token=nope');
    expect(screen.getByText(/link is incomplete/)).toBeInTheDocument();
  });

  it('sends a signed-out parent to sign up or sign in, coming back here', () => {
    auth(null);
    renderAt(`?token=${TOKEN}`);
    const back = encodeURIComponent(`/accept-invite?token=${TOKEN}`);
    expect(
      screen.getByRole('link', { name: 'Create an account' })
    ).toHaveAttribute('href', `/login?returnUrl=${back}&mode=signup`);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/login?returnUrl=${back}`
    );
  });

  it('accepts for a signed-in parent and opens the family dashboard', async () => {
    auth({ email: 'mom@example.com' });
    (acceptParentInvite as jest.Mock).mockResolvedValue({ success: true });
    renderAt(`?token=${TOKEN}`);
    expect(screen.getByText('mom@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    await waitFor(() => expect(acceptParentInvite).toHaveBeenCalledWith(TOKEN));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/family'));
  });

  it("shows the server's reason when it can't be accepted", async () => {
    auth({ email: 'other@example.com' });
    (acceptParentInvite as jest.Mock).mockRejectedValue(
      new Error('This invitation was sent to a different email.')
    );
    renderAt(`?token=${TOKEN}`);
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'different email'
    );
    expect(assign).not.toHaveBeenCalled();
  });
});
