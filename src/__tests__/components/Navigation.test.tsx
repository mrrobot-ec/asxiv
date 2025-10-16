import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUseRouter = jest.fn();
const mockToggleTheme = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => mockUseRouter(),
}));

jest.mock('@/context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'light', toggleTheme: mockToggleTheme })
}));

import Navigation from '@/components/Navigation';

const renderNavigation = (pathname: string) => {
  mockUseRouter.mockReturnValue({ pathname });
  return render(<Navigation />);
};

describe('Navigation', () => {
  afterEach(() => {
    mockUseRouter.mockReset();
    mockToggleTheme.mockReset();
  });

  it('should render navigation links when component mounts', () => {
    renderNavigation('/');
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search' })).toBeInTheDocument();
  });

  it('should toggle theme when switch button is clicked', () => {
    renderNavigation('/search');
    const toggleButton = screen.getByRole('button', { name: 'Switch to dark mode' });
    fireEvent.click(toggleButton);
    expect(mockToggleTheme).toHaveBeenCalled();
  });
});
