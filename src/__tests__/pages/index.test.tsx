import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/pages/index';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render home page content when component mounts', () => {
    render(<Home />);
    expect(screen.getByText('asXiv')).toBeInTheDocument();
    expect(screen.getByText('An AI-powered interface for exploring and understanding arXiv research papers')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search papers or enter arXiv ID (e.g., 1706.03762)')).toBeInTheDocument();
  });

  it('should render search form elements when page loads', () => {
    render(<Home />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to paper/i })).toBeInTheDocument();
    expect(screen.getByText('Advanced Search')).toBeInTheDocument();
  });

  it('should update search input value when user types', () => {
    render(<Home />);
    const input = screen.getByPlaceholderText('Search papers or enter arXiv ID (e.g., 1706.03762)');
    fireEvent.change(input, { target: { value: 'machine learning' } });
    expect(input).toHaveValue('machine learning');
  });

  it('should navigate to search page when form is submitted', () => {
    render(<Home />);
    const input = screen.getByPlaceholderText('Search papers or enter arXiv ID (e.g., 1706.03762)');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'machine learning' } });
    fireEvent.submit(form!);

    expect(mockPush).toHaveBeenCalledWith('/search?q=machine%20learning');
  });

  it('should navigate to PDF page when arXiv ID is valid', () => {
    render(<Home />);
    const input = screen.getByPlaceholderText('Search papers or enter arXiv ID (e.g., 1706.03762)');
    const goToPaperButton = screen.getByRole('button', { name: /go to paper/i });
    
    fireEvent.change(input, { target: { value: '1706.03762' } });
    fireEvent.click(goToPaperButton);

    expect(mockPush).toHaveBeenCalledWith('/pdf/1706.03762');
  });

  it('should navigate to search page when arXiv ID is invalid', () => {
    render(<Home />);
    const input = screen.getByPlaceholderText('Search papers or enter arXiv ID (e.g., 1706.03762)');
    const goToPaperButton = screen.getByRole('button', { name: /go to paper/i });
    
    fireEvent.change(input, { target: { value: 'invalid-id' } });
    fireEvent.click(goToPaperButton);

    expect(mockPush).toHaveBeenCalledWith('/search?q=invalid-id');
  });

  it('should navigate to PDF page when old format arXiv ID is provided', () => {
    render(<Home />);
    const input = screen.getByPlaceholderText('Search papers or enter arXiv ID (e.g., 1706.03762)');
    const goToPaperButton = screen.getByRole('button', { name: /go to paper/i });
    
    fireEvent.change(input, { target: { value: 'cs/0211011' } });
    fireEvent.click(goToPaperButton);

    expect(mockPush).toHaveBeenCalledWith('/pdf/cs/0211011');
  });

  it('should disable Go to Paper button when input is empty', () => {
    render(<Home />);
    const goToPaperButton = screen.getByRole('button', { name: /go to paper/i });
    expect(goToPaperButton).toBeDisabled();
  });

  it('should enable Go to Paper button when input has value', () => {
    render(<Home />);
    const input = screen.getByPlaceholderText('Search papers or enter arXiv ID (e.g., 1706.03762)');
    const goToPaperButton = screen.getByRole('button', { name: /go to paper/i });
    
    fireEvent.change(input, { target: { value: 'test' } });
    expect(goToPaperButton).not.toBeDisabled();
  });

  it('should render instruction text when home page loads', () => {
    render(<Home />);
    expect(screen.getByText(/Search or in the URL add/)).toBeInTheDocument();
    expect(screen.getByText(/\/pdf\/\[arxiv-id\]/)).toBeInTheDocument();
  });

  it('should render example link when home page loads', () => {
    render(<Home />);
    const exampleLink = screen.getByText(/Attention Is All You Need/);
    expect(exampleLink).toHaveAttribute('href', '/pdf/1706.03762');
  });

  it('should render GitHub link when home page loads', () => {
    render(<Home />);
    const githubLink = screen.getByText('GitHub');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/montanaflynn/asxiv');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render advanced search link when home page loads', () => {
    render(<Home />);
    const advancedLink = screen.getByText('Advanced Search');
    expect(advancedLink).toHaveAttribute('href', '/search?advanced=true');
  });
});
