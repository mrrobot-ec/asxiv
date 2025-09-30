import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Custom404 from '../404';

describe('404 Page', () => {
  it('should render 404 page elements', () => {
    render(<Custom404 />);
    
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('No arXiv PDF found')).toBeInTheDocument();
    expect(screen.getByText('This page only works with arXiv PDF URLs in the format:')).toBeInTheDocument();
  });

  it('should have correct link to example PDF', () => {
    render(<Custom404 />);
    
    const exampleLink = screen.getByText('/pdf/1706.03762 (Attention Is All You Need)');
    expect(exampleLink.closest('a')).toHaveAttribute('href', '/pdf/1706.03762');
  });
});
