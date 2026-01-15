import { render } from '@testing-library/react';
import { SimpleCreditsCounter } from '../SimpleCreditsCounter';

// Mock the useSubscription hook
const mockUseSubscription = jest.fn();
jest.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => mockUseSubscription(),
}));

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

    const { container } = render(<SimpleCreditsCounter />);
    
    // Skeleton should be visible
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders CreditBadge with subscription data', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: 8,
      pricePerClass: 20,
      isLoading: false,
    });

    const { getByText } = render(<SimpleCreditsCounter />);
    
    expect(getByText('8 classes remaining')).toBeInTheDocument();
  });

  it('shows Credits Available label', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: 5,
      pricePerClass: 17.50,
      isLoading: false,
    });

    const { getByText } = render(<SimpleCreditsCounter />);
    
    expect(getByText('Credits Available')).toBeInTheDocument();
  });

  it('hides amount in CreditBadge (student privacy)', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: -3,
      pricePerClass: 20,
      isLoading: false,
    });

    const { getByText, queryByText } = render(<SimpleCreditsCounter />);
    
    // Should show overdrawn but NOT the dollar amount
    expect(getByText('3 classes overdrawn')).toBeInTheDocument();
    expect(queryByText(/\$60/)).not.toBeInTheDocument();
  });

  it('renders correctly with zero credits', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: 0,
      pricePerClass: 20,
      isLoading: false,
    });

    const { getByText } = render(<SimpleCreditsCounter />);
    
    expect(getByText('0 classes remaining')).toBeInTheDocument();
  });

  it('handles null credits when not loading', () => {
    mockUseSubscription.mockReturnValue({
      creditsRemaining: null,
      pricePerClass: null,
      isLoading: false,
    });

    const { getByText } = render(<SimpleCreditsCounter />);
    
    // CreditBadge returns null for null credits, so just check the label exists
    expect(getByText('Credits Available')).toBeInTheDocument();
  });
});
