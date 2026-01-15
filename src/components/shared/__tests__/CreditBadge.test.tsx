import { render } from '@testing-library/react';
import { CreditBadge } from '../CreditBadge';

describe('CreditBadge', () => {
  it('renders null when credits is null', () => {
    const { container } = render(<CreditBadge credits={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows destructive variant for zero credits', () => {
    const { getByText } = render(<CreditBadge credits={0} />);
    const badge = getByText('0 classes remaining');
    expect(badge.closest('[class*="destructive"]')).toBeInTheDocument();
  });

  it('shows destructive variant for negative credits', () => {
    const { getByText } = render(<CreditBadge credits={-3} />);
    const badge = getByText(/3 classes overdrawn/);
    expect(badge.closest('[class*="destructive"]')).toBeInTheDocument();
  });

  it('shows secondary variant for low credits (1-2)', () => {
    const { getByText } = render(<CreditBadge credits={2} />);
    const badge = getByText('2 classes remaining');
    expect(badge.closest('[class*="secondary"]')).toBeInTheDocument();
  });

  it('shows default variant for normal credits (3+)', () => {
    const { getByText } = render(<CreditBadge credits={5} />);
    const badge = getByText('5 classes remaining');
    // Default variant doesn't have destructive or secondary
    const badgeElement = badge.closest('.flex');
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement?.className).not.toContain('destructive');
    expect(badgeElement?.className).not.toContain('secondary');
  });

  it('calculates and displays amount owed for negative credits', () => {
    const { getByText } = render(<CreditBadge credits={-3} pricePerClass={20} />);
    expect(getByText(/3 classes overdrawn \(\$60 owed\)/)).toBeInTheDocument();
  });

  it('hides amount when hideAmount prop is true', () => {
    const { getByText, queryByText } = render(<CreditBadge credits={-3} pricePerClass={20} hideAmount />);
    expect(getByText('3 classes overdrawn')).toBeInTheDocument();
    expect(queryByText(/\$60/)).not.toBeInTheDocument();
  });

  it('does not show amount owed without pricePerClass', () => {
    const { getByText, queryByText } = render(<CreditBadge credits={-3} />);
    expect(getByText('3 classes overdrawn')).toBeInTheDocument();
    expect(queryByText(/owed/)).not.toBeInTheDocument();
  });

  it('pluralizes "class" correctly for 1 credit', () => {
    const { getByText } = render(<CreditBadge credits={1} />);
    expect(getByText('1 class remaining')).toBeInTheDocument();
  });

  it('pluralizes "classes" correctly for multiple credits', () => {
    const { getByText } = render(<CreditBadge credits={5} />);
    expect(getByText('5 classes remaining')).toBeInTheDocument();
  });

  it('pluralizes correctly for 1 class overdrawn', () => {
    const { getByText } = render(<CreditBadge credits={-1} />);
    expect(getByText('1 class overdrawn')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { getByText } = render(<CreditBadge credits={5} className="custom-class" />);
    const badge = getByText('5 classes remaining').closest('.flex');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders credit card icon', () => {
    const { getByText } = render(<CreditBadge credits={5} />);
    const badge = getByText('5 classes remaining').closest('.flex');
    expect(badge?.querySelector('svg')).toBeInTheDocument();
  });
});
