import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationPreferences from '../NotificationPreferences';
import type { Profile } from '@/hooks/useProfile';
import {
  fetchMyPhone,
  fetchMyPreferences,
  setMyPreference,
} from '@/services/notifications/preferences';

const mockUseSubscription = jest.fn();
jest.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => mockUseSubscription(),
}));
const mockSmsEnabled = jest.fn(() => true);
jest.mock('@/config/features', () => ({
  isSmsEnabled: () => mockSmsEnabled(),
}));
jest.mock('@/services/notifications/preferences', () => ({
  fetchMyPreferences: jest.fn(),
  fetchMyPhone: jest.fn(),
  setMyPreference: jest.fn(),
}));

const profile = (role: Profile['role'], extra: object = {}): Profile =>
  ({
    id: 'u1',
    email: 'u@example.com',
    first_name: 'U',
    last_name: null,
    role,
    bio: null,
    avatar_url: null,
    zoom_link: null,
    created_at: '',
    updated_at: '',
    ...extra,
  }) as Profile;

const renderFor = (
  role: Profile['role'],
  opts: { managedBy?: unknown; phone?: unknown; extra?: object } = {}
) => {
  mockUseSubscription.mockReturnValue({ managedBy: opts.managedBy ?? null });
  (fetchMyPreferences as jest.Mock).mockResolvedValue({});
  (fetchMyPhone as jest.Mock).mockResolvedValue(opts.phone ?? null);
  const updateProfile = jest.fn().mockResolvedValue({});
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NotificationPreferences
        profile={profile(role, opts.extra)}
        updateProfile={updateProfile}
      />
    </QueryClientProvider>
  );
  return { updateProfile };
};

describe('NotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSmsEnabled.mockReturnValue(true);
  });

  it('is email-only until texting is switched on', () => {
    mockSmsEnabled.mockReturnValue(false);
    renderFor('student');
    expect(
      screen.getByRole('switch', { name: 'Messages by email' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Messages by text message' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Text')).not.toBeInTheDocument();
    expect(screen.queryByText(/Add a mobile number/)).not.toBeInTheDocument();
    expect(fetchMyPhone).not.toHaveBeenCalled();
  });

  it('shows billing and summaries to whoever pays', () => {
    renderFor('student');
    expect(screen.getByText('Low-balance alerts')).toBeInTheDocument();
    expect(
      screen.getByText('Weekly & quarterly summaries')
    ).toBeInTheDocument();
    renderFor('parent');
    expect(screen.getAllByText('Low-balance alerts')).toHaveLength(2);
  });

  it('hides money notifications from a student whose parent pays', () => {
    renderFor('student', { managedBy: { name: 'Pat' } });
    expect(screen.queryByText('Low-balance alerts')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Weekly & quarterly summaries')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Upcoming class reminders')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('gives tutors reminders and messages only', () => {
    renderFor('tutor');
    expect(screen.getByText('Upcoming class reminders')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.queryByText('Class notes & updates')).not.toBeInTheDocument();
  });

  it('email defaults follow the existing settings', () => {
    renderFor('student', { extra: { notify_class_reminders: false } });
    expect(
      screen.getByRole('switch', { name: 'Upcoming class reminders by email' })
    ).not.toBeChecked();
    expect(
      screen.getByRole('switch', { name: 'Messages by email' })
    ).toBeChecked();
  });

  it('text switches stay off until a number is verified', () => {
    renderFor('student');
    expect(
      screen.getByRole('switch', { name: 'Messages by text message' })
    ).toBeDisabled();
    expect(
      screen.getByText(/Add a mobile number under Text messages/)
    ).toBeInTheDocument();
  });

  it('turning class reminders off saves the preference and the old setting', async () => {
    (setMyPreference as jest.Mock).mockResolvedValue(undefined);
    const { updateProfile } = renderFor('student');
    fireEvent.click(
      screen.getByRole('switch', { name: 'Upcoming class reminders by email' })
    );
    await waitFor(() =>
      expect(setMyPreference).toHaveBeenCalledWith(
        'u1',
        'class_reminders',
        'email',
        false
      )
    );
    expect(updateProfile).toHaveBeenCalledWith({
      notify_class_reminders: false,
    });
  });

  it('with a verified number, texts can be turned on', async () => {
    (setMyPreference as jest.Mock).mockResolvedValue(undefined);
    renderFor('parent', {
      phone: { value: '+15125550100', verified: true, optedOut: false },
    });
    const textSwitch = await screen.findByRole('switch', {
      name: 'Messages by text message',
    });
    await waitFor(() => expect(textSwitch).not.toBeDisabled());
    fireEvent.click(textSwitch);
    await waitFor(() =>
      expect(setMyPreference).toHaveBeenCalledWith(
        'u1',
        'messages',
        'sms',
        true
      )
    );
  });
});
