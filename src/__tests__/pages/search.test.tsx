import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from '@/pages/search';

// Mock Next.js router
const mockPush = jest.fn();
const mockQuery: { q?: string; advanced?: string } = {};

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: mockQuery
  })
}));

const basePaper = () => ({
  id: '1706.03762',
  title: 'Attention Is All You Need',
  authors: ['Ashish Vaswani'],
  abstract: 'We propose a new simple network architecture...',
  published: '2017-06-12',
  updated: '2017-12-05',
  categories: ['cs.CL', 'cs.LG'],
  pdfUrl: 'https://arxiv.org/pdf/1706.03762',
  abstractUrl: 'https://arxiv.org/abs/1706.03762'
});

const buildSearchResponse = (overrides: Partial<ReturnType<typeof basePaper>>[] = []) => {
  const papers = overrides.length > 0 ? overrides : [basePaper()];
  return {
    results: papers,
    totalResults: papers.length,
    startIndex: 0,
    itemsPerPage: 10,
    query: 'attention'
  };
};

describe('Search Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockQuery).forEach((key) => {
      delete mockQuery[key as keyof typeof mockQuery];
    });
    (global.fetch as jest.Mock | undefined)?.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => buildSearchResponse()
    });
  });

  it('should render search page scaffolding when page loads', () => {
    render(<SearchPage />);
    expect(screen.getByText('Search arXiv Papers')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search papers by title, abstract, authors, or keywords...')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('should expand advanced options when advanced query flag is provided', () => {
    mockQuery.advanced = 'true';
    render(<SearchPage />);
    expect(screen.getByText('Hide Advanced Options')).toBeInTheDocument();
  });

  it('should submit search request when user submits the form', async () => {
    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search papers by title, abstract, authors, or keywords...'
    );
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=attention')
      );
      expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
      expect(screen.getByText('1 result found')).toBeInTheDocument();
    });
  });

  it('should show error message when search request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search papers by title, abstract, authors, or keywords...'
    );
    fireEvent.change(input, { target: { value: 'failure' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('should navigate to PDF page when result is clicked', async () => {
    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search papers by title, abstract, authors, or keywords...'
    );
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const result = await screen.findByText('Attention Is All You Need');
    fireEvent.click(result);

    expect(mockPush).toHaveBeenCalledWith('/pdf/1706.03762');
  });

  it('should request insights when user submits a goal', async () => {
    const searchResponse = buildSearchResponse();
    const insightsResponse = {
      overview: 'The top papers focus on transformer architectures.',
      recommendedPapers: [
        {
          paperId: '1706.03762',
          title: 'Attention Is All You Need',
          reason: 'Introduces the transformer architecture you asked about.'
        }
      ],
      followUpQuestions: ['Compare with recurrent approaches'],
      paperInsights: {
        '1706.03762': 'Directly addresses transformer architectures.'
      }
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => searchResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => insightsResponse
      });

    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search papers by title, abstract, authors, or keywords...'
    );
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByText('Attention Is All You Need');

    const toggle = await screen.findByRole('button', { name: 'Open AI teammate panel' });
    fireEvent.click(toggle);

    const assistantPrompt = await screen.findByPlaceholderText(
      'Describe what you need from the current papers...'
    );
    fireEvent.change(assistantPrompt, { target: { value: 'Which papers explain transformers?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask the AI teammate' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/insights',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    expect(
      await screen.findByText('The top papers focus on transformer architectures.')
    ).toBeInTheDocument();
    expect(screen.getByText('AI recommended')).toBeInTheDocument();
  });

  it('should request insights when suggestion button is clicked', async () => {
    const searchResponse = buildSearchResponse();
    const insightsResponse = {
      overview: 'Insight summary ready.',
      recommendedPapers: [
        {
          paperId: '1706.03762',
          title: 'Attention Is All You Need',
          reason: 'Relevant to your goal.'
        }
      ],
      followUpQuestions: [],
      paperInsights: {
        '1706.03762': 'Relevant to your goal.'
      }
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => searchResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => insightsResponse
      });

    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search papers by title, abstract, authors, or keywords...'
    );
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByText('Attention Is All You Need');

    const toggle = await screen.findByRole('button', { name: 'Open AI teammate panel' });
    fireEvent.click(toggle);

    const suggestionButton = await screen.findByRole('button', {
      name: 'Give me insights about each paper'
    });
    fireEvent.click(suggestionButton);

    const assistantTextarea = await screen.findByPlaceholderText(
      'Describe what you need from the current papers...'
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/insights',
        expect.objectContaining({ method: 'POST' })
      );
      expect(assistantTextarea).toHaveValue('Give me concise insights about each paper in the current results.');
    });

    expect(await screen.findByText('Insight summary ready.')).toBeInTheDocument();
    expect(screen.getByText('AI recommended')).toBeInTheDocument();
  });

  it('should show validation message when assistant prompt is empty', async () => {
    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search papers by title, abstract, authors, or keywords...'
    );
    fireEvent.change(input, { target: { value: 'attention' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByText('Attention Is All You Need');

    const toggle = await screen.findByRole('button', { name: 'Open AI teammate panel' });
    fireEvent.click(toggle);

    fireEvent.click(screen.getByRole('button', { name: 'Ask the AI teammate' }));
    expect(
      screen.getByText('Describe what you need help with to get tailored suggestions.')
    ).toBeInTheDocument();
  });
});
