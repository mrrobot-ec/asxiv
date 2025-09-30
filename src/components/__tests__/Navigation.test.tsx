import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navigation from '../Navigation';

// Mock Next.js router
const mockPush = jest.fn();
const mockPathname = '/';
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: mockPathname,
  }),
}));

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render navigation links', () => {
    render(<Navigation />);
    expect(screen.getByText('asXiv')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should render logo as link to home', () => {
    render(<Navigation />);
    const logoLink = screen.getByText('asXiv').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('should render home link', () => {
    render(<Navigation />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render search link', () => {
    render(<Navigation />);
    const searchLink = screen.getByText('Search').closest('a');
    expect(searchLink).toHaveAttribute('href', '/search');
  });

  it('should apply active class to current page', () => {
    // Mock different pathname
    jest.doMock('next/router', () => ({
      useRouter: () => ({
        push: mockPush,
        pathname: '/search',
      }),
    }));

    render(<Navigation />);
    const searchLink = screen.getByText('Search').closest('a');
    expect(searchLink).toHaveClass('navLink');
  });
});
