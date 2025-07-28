import React from 'react';
import { render } from '@testing-library/react';
import Profile from '@/pages/Profile';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

// Mock the hooks
jest.mock('@/contexts/AuthContext');
jest.mock('@/hooks/useAnalyticsTracker');
jest.mock('@/components/shared/ProfilePage', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-page">Profile Page Component</div>,
}));

describe('Profile Component', () => {
  const mockTrackPageView = jest.fn();
  
  beforeEach(() => {
    // Setup the useAuth mock
    (useAuth as jest.Mock).mockReturnValue({
      userRole: 'student',
      user: {
        id: 'user-123',
        email: 'test@example.com'
      }
    });
    
    // Setup the useAnalyticsTracker mock
    (useAnalyticsTracker as jest.Mock).mockReturnValue({
      trackPageView: mockTrackPageView
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders profile page correctly', async () => {
    const { getByText, getByTestId } = render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <Profile />
        </I18nextProvider>
      </MemoryRouter>
    );
    
    // Check if page title is rendered
    expect(getByText('profile.myProfile')).toBeInTheDocument();
    
    // Check if ProfilePage component is rendered
    expect(getByTestId('profile-page')).toBeInTheDocument();
    
    // Ensure trackPageView was called
    expect(mockTrackPageView).toHaveBeenCalledWith('profile-page');
  });
});