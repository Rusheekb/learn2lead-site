import { render, screen } from '@testing-library/react';
import { CreditBadge } from '../CreditBadge';

describe('CreditBadge', () => {
  it('renders null when credits is null', () => {
    const { container } = render(<CreditBadge credits={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows badge for zero credits', () => {
    render(<CreditBadge credits={0} />);
    expect(screen.getByText('0 classes remaining')).toBeInTheDocument();
  });

  it('shows badge for negative credits', () => {
    render(<CreditBadge credits={-3} />);
    expect(screen.getByText(/3 classes overdrawn/)).toBeInTheDocument();
  });

  it('shows badge for low credits (1-2)', () => {
    render(<CreditBadge credits={2} />);
    expect(screen.getByText('2 classes remaining')).toBeInTheDocument();
  });

  it('shows badge for normal credits (3+)', () => {
    render(<CreditBadge credits={5} />);
    expect(screen.getByText('5 classes remaining')).toBeInTheDocument();
  });

  it('calculates and displays amount owed for negative credits', () => {
    render(<CreditBadge credits={-3} pricePerClass={20} />);
    expect(screen.getByText(/3 classes overdrawn \(\$60 owed\)/)).toBeInTheDocument();
  });

  it('hides amount when hideAmount prop is true', () => {
    render(<CreditBadge credits={-3} pricePerClass={20} hideAmount />);
    expect(screen.getByText('3 classes overdrawn')).toBeInTheDocument();
    expect(screen.queryByText(/\$60/)).not.toBeInTheDocument();
  });

  it('does not show amount owed without pricePerClass', () => {
    render(<CreditBadge credits={-3} />);
    expect(screen.getByText('3 classes overdrawn')).toBeInTheDocument();
    expect(screen.queryByText(/owed/)).not.toBeInTheDocument();
  });

  it('pluralizes "class" correctly for 1 credit', () => {
    render(<CreditBadge credits={1} />);
    expect(screen.getByText('1 class remaining')).toBeInTheDocument();
  });

  it('pluralizes "classes" correctly for multiple credits', () => {
    render(<CreditBadge credits={5} />);
    expect(screen.getByText('5 classes remaining')).toBeInTheDocument();
  });

  it('pluralizes correctly for 1 class overdrawn', () => {
    render(<CreditBadge credits={-1} />);
    expect(screen.getByText('1 class overdrawn')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CreditBadge credits={5} className="custom-class" />);
    const badge = screen.getByText('5 classes remaining').closest('div');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders credit card icon', () => {
    const { container } = render(<CreditBadge credits={5} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
