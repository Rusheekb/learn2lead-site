
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

// Mock the useTheme hook
jest.mock('@/contexts/ThemeContext');

describe('ThemeToggle Component', () => {
  const mockToggleTheme = jest.fn();
  
  it('renders correctly in light mode', () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme
    });
    
    render(<ThemeToggle />);
    
    // Check the toggle exists and is not checked
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    // Check label text
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });
  
  it('renders correctly in dark mode', () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme
    });
    
    render(<ThemeToggle />);
    
    // Check the toggle exists and is checked
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    
    // Check label text
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });
  
  it('calls toggleTheme when clicked', () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme
    });
    
    render(<ThemeToggle />);
    
    // Click the toggle
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    // Check that the toggleTheme function was called
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
  
  it('renders without labels when showLabel is false', () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme
    });
    
    render(<ThemeToggle showLabel={false} />);
    
    // The toggle should still be there
    expect(screen.getByRole('switch')).toBeInTheDocument();
    
    // But the text label should not be visible
    expect(screen.queryByText('Light Mode')).not.toBeInTheDocument();
  });
  
  it('applies custom class names', () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme
    });
    
    const { container } = render(<ThemeToggle className="custom-class" />);
    
    // Check that the container has the custom class
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
