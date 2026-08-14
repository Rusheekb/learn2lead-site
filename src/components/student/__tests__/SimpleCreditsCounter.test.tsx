import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SimpleCreditsCounter } from '../SimpleCreditsCounter';

// Mock the useSubscription hook
const mockUseSubscription = jest.fn();
jest.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => mockUseSubscription(),
}));

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('SimpleCreditsCounter', () => {
  beforeEach(() => {
    mockUseSubscription.mockReset();
  });

  it('shows skeleton during loading', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: null,
      pricePerClass: null,
      isLoading: true,
    });

    const { container } = renderWithRouter(<SimpleCreditsCounter />);

    // Skeleton should have animate-pulse class
    const skeleton = container.querySelector('[class*="animate-pulse"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders CreditBadge with subscription data', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: 8,
      pricePerClass: 20,
      isLoading: false,
    });

    renderWithRouter(<SimpleCreditsCounter />);

    expect(screen.getByText('8 hours remaining')).toBeInTheDocument();
  });

  it('shows Hours Available label', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: 5,
      pricePerClass: 17.5,
      isLoading: false,
    });

    renderWithRouter(<SimpleCreditsCounter />);

    expect(screen.getByText('Hours Available')).toBeInTheDocument();
  });

  it('hides amount in CreditBadge (student privacy)', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: -3,
      pricePerClass: 20,
      isLoading: false,
    });

    renderWithRouter(<SimpleCreditsCounter />);

    // Should show overdrawn but NOT the dollar amount
    expect(screen.getByText('3 hours overdrawn')).toBeInTheDocument();
    expect(screen.queryByText(/\$60/)).not.toBeInTheDocument();
  });

  it('renders correctly with zero credits', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: 0,
      pricePerClass: 20,
      isLoading: false,
    });

    renderWithRouter(<SimpleCreditsCounter />);

    expect(screen.getByText('0 hours remaining')).toBeInTheDocument();
  });

  it('handles null credits when not loading', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: null,
      pricePerClass: null,
      isLoading: false,
    });

    renderWithRouter(<SimpleCreditsCounter />);

    // CreditBadge returns null for null credits, so just check the label exists
    expect(screen.getByText('Hours Available')).toBeInTheDocument();
  });

  it('links the credit badge to the pricing page', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: 0,
      pricePerClass: 20,
      isLoading: false,
    });

    renderWithRouter(<SimpleCreditsCounter />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/pricing');
  });
});
