
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '@/pages/Profile';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

// Mock the hooks
jest.mock('@/contexts/ThemeContext');
jest.mock('@/contexts/AuthContext');
jest.mock('@/hooks/useAnalyticsTracker');
jest.mock('@/components/shared/ProfilePage', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-page">Profile Page Component</div>,
}));

describe('Profile Component', () => {
  const mockToggleTheme = jest.fn();
  const mockTrackPageView = jest.fn();
  
  beforeEach(() => {
    // Setup the useTheme mock
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme
    });
    
    // Setup the useAuth mock
    (useAuth as jest.Mock).mockReturnValue({
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
  
  it('renders profile page with theme toggle switch', async () => {
    render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <Profile />
        </I18nextProvider>
      </MemoryRouter>
    );
    
    // Check if page title is rendered
    expect(screen.getByText('profile.myProfile')).toBeInTheDocument();
    
    // Check if theme toggle is rendered
    expect(screen.getByText('profile.appearance')).toBeInTheDocument();
    
    // Ensure trackPageView was called
    expect(mockTrackPageView).toHaveBeenCalledWith('profile-page');
  });
  
  it('toggles theme when switch is clicked', async () => {
    render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <Profile />
        </I18nextProvider>
      </MemoryRouter>
    );
    
    // Find the theme switch (it will be inside ThemeToggle component)
    const themeSwitch = screen.getByRole('switch');
    
    // Click the switch
    fireEvent.click(themeSwitch);
    
    // Verify toggleTheme was called
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
  
  it('renders with dark theme correctly', async () => {
    // Update mock to return dark theme
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme
    });
    
    render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <Profile />
        </I18nextProvider>
      </MemoryRouter>
    );
    
    // Find the theme switch and check it's checked
    const themeSwitch = screen.getByRole('switch');
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');
  });
});
