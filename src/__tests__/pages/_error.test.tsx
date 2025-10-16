import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomError from '@/pages/_error';

describe('Error Page', () => {
  it('should render error page elements when page loads', () => {
    render(<CustomError />);
    
    expect(screen.getByText('Client-side error occurred')).toBeInTheDocument();
    expect(screen.getByText('An error occurred on client.')).toBeInTheDocument();
    expect(screen.getByText('Go back to:')).toBeInTheDocument();
  });

  it('should include home link when page loads', () => {
    render(<CustomError />);
    
    const homeLink = screen.getByText('Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});
