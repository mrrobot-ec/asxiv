import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from '../search';

// Mock Next.js router
const mockPush = jest.fn();
const mockQuery: { q: string; advanced?: string } = { q: '' };
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: mockQuery,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Search Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.q = '';
    delete mockQuery.advanced;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
        totalResults: 0
      })
    });
  });

  it('renders search page elements', () => {
    render(<SearchPage />);
    expect(screen.getByText('Search arXiv Papers')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('shows advanced options when advanced=true in query', () => {
    mockQuery.advanced = 'true';
    render(<SearchPage />);
    expect(screen.getByText('Hide Advanced Options')).toBeInTheDocument();
  });

  it('toggles advanced options visibility', () => {
    render(<SearchPage />);
    const toggleButton = screen.getByText('Show Advanced Options');
    fireEvent.click(toggleButton);
    expect(screen.getByText('Hide Advanced Options')).toBeInTheDocument();
  });

  it('updates search input value', () => {
    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...');
    fireEvent.change(input, { target: { value: 'machine learning' } });
    expect(input).toHaveValue('machine learning');
  });

  it('performs search on form submit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: '1706.03762',
            title: 'Attention Is All You Need',
            authors: ['Ashish Vaswani'],
            summary: 'We propose a new simple network architecture...',
            published: '2017-06-12',
            pdfUrl: 'https://arxiv.org/pdf/1706.03762',
            categories: ['cs.CL', 'cs.LG']
          }
        ],
        totalResults: 1
      })
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search?q=attention&start=0&maxResults=10&sortBy=relevance&sortOrder=descending');
    });
  });

  it('displays search results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: '1706.03762',
            title: 'Attention Is All You Need',
            authors: ['Ashish Vaswani'],
            summary: 'We propose a new simple network architecture...',
            published: '2017-06-12',
            pdfUrl: 'https://arxiv.org/pdf/1706.03762',
            categories: ['cs.CL', 'cs.LG']
          }
        ],
        totalResults: 1
      })
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
      expect(screen.getByText('Ashish Vaswani')).toBeInTheDocument();
      expect(screen.getByText('Found 1 results for "attention"')).toBeInTheDocument();
    });
  });

  it('handles search errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Search failed'));

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during search', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form!);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('handles result click navigation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: '1706.03762',
            title: 'Attention Is All You Need',
            authors: ['Ashish Vaswani'],
            summary: 'We propose a new simple network architecture...',
            published: '2017-06-12',
            pdfUrl: 'https://arxiv.org/pdf/1706.03762',
            categories: ['cs.CL', 'cs.LG']
          }
        ],
        totalResults: 1
      })
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      const resultTitle = screen.getByText('Attention Is All You Need');
      fireEvent.click(resultTitle);
      expect(mockPush).toHaveBeenCalledWith('/pdf/1706.03762');
    });
  });

  it('updates advanced search parameters', () => {
    render(<SearchPage />);
    const toggleButton = screen.getByText('Show Advanced Options');
    fireEvent.click(toggleButton);

    const categorySelect = screen.getByDisplayValue('All Categories');
    const authorInput = screen.getByPlaceholderText('Author name');
    const titleInput = screen.getByPlaceholderText('Title keywords');
    const abstractInput = screen.getByPlaceholderText('Abstract keywords');

    fireEvent.change(categorySelect, { target: { value: 'cs.AI' } });
    fireEvent.change(authorInput, { target: { value: 'John Doe' } });
    fireEvent.change(titleInput, { target: { value: 'Deep Learning' } });
    fireEvent.change(abstractInput, { target: { value: 'neural networks' } });

    expect(categorySelect).toHaveValue('cs.AI');
    expect(authorInput).toHaveValue('John Doe');
    expect(titleInput).toHaveValue('Deep Learning');
    expect(abstractInput).toHaveValue('neural networks');
  });

  it('includes advanced parameters in search request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], totalResults: 0 })
    });

    render(<SearchPage />);
    const toggleButton = screen.getByText('Show Advanced Options');
    fireEvent.click(toggleButton);

    const categorySelect = screen.getByDisplayValue('All Categories');
    const authorInput = screen.getByPlaceholderText('Author name');
    const input = screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...');
    const form = input.closest('form');

    fireEvent.change(categorySelect, { target: { value: 'cs.AI' } });
    fireEvent.change(authorInput, { target: { value: 'John Doe' } });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=cs.AI')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('author=John+Doe')
      );
    });
  });
});
