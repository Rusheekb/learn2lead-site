
import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { MemoryRouter } from 'react-router-dom';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock analytics service
jest.mock('@/services/analytics/analyticsService', () => ({
  analytics: {
    track: jest.fn(),
  },
  EventName: {
    TOGGLE_THEME: 'toggle_theme',
  },
  EventCategory: {
    UI: 'ui',
  },
}));

// Create a test component that uses the theme context
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div data-testid="theme-test">
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="theme-toggle" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeAll(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });
  
  it('initializes with light theme when no theme in localStorage', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
  });
  
  it('initializes with theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValueOnce('dark');
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme');
  });
  
  it('toggles theme correctly', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    // Initially light
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    
    // Toggle to dark
    act(() => {
      screen.getByTestId('theme-toggle').click();
    });
    
    // Should update localStorage and toggle dark class
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    
    // Toggle back to light
    act(() => {
      screen.getByTestId('theme-toggle').click();
    });
    
    // Should update localStorage and toggle dark class
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
  });
  
  it('adds dark class to html only on dashboard routes', () => {
    // Dashboard route
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    act(() => {
      screen.getByTestId('theme-toggle').click();
    });
    
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Public route
    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
  });
});
