// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the supabase client with enhanced Edge Function support
const mockFunctionsInvoke = jest.fn();
const mockAuthGetSession = jest.fn();
const mockAuthGetUser = jest.fn();
const mockAuthRefreshSession = jest.fn();

// Create chainable mock for database queries
const createChainableMock = () => {
  const mock = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
  return mock;
};

jest.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => createChainableMock()),
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
    auth: {
      getSession: () => mockAuthGetSession(),
      getUser: () => mockAuthGetUser(),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      refreshSession: () => mockAuthRefreshSession(),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

// Export mocks for test customization
export { mockFunctionsInvoke, mockAuthGetSession, mockAuthGetUser, mockAuthRefreshSession };

// Mock the i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock window navigation
Object.defineProperty(window, 'navigator', {
  value: {
    language: 'en-US',
  },
  writable: true,
});

// Mock document.documentElement.classList for theme testing
Object.defineProperty(document.documentElement, 'classList', {
  value: {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn(),
  },
  writable: false,
});

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
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

// Suppress console errors in tests unless explicitly testing error handling
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Filter out expected React warnings during tests
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render') ||
        message.includes('Warning: An update to') ||
        message.includes('act(...)') ||
        message.includes('inside a test was not wrapped in act'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
  
  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('[SubscriptionProvider]') ||
        message.includes('Warning:'))
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
