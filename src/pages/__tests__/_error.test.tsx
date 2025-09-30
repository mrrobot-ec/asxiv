import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomError from '../_error';

describe('Error Page', () => {
  it('should render error page elements', () => {
    render(<CustomError />);
    
    expect(screen.getByText('Client-side error occurred')).toBeInTheDocument();
    expect(screen.getByText('An error occurred on client.')).toBeInTheDocument();
    expect(screen.getByText('Go back to:')).toBeInTheDocument();
  });

  it('should have correct link to home page', () => {
    render(<CustomError />);
    
    const homeLink = screen.getByText('Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});
