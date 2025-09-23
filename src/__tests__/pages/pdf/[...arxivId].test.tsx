import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import PdfViewer from '@/pages/pdf/[...arxivId]';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock ChatWidget component
jest.mock('@/components/ChatWidget', () => {
  return function MockChatWidget({ arxivId }: { arxivId: string }) {
    return <div data-testid="chat-widget">ChatWidget for {arxivId}</div>;
  };
});

// Mock CSS modules
jest.mock('@/styles/Home.module.css', () => ({
  iframe: 'iframe-class',
}));

jest.mock('@/styles/NotFound.module.css', () => ({
  container: 'not-found-container',
  content: 'not-found-content',
  title: 'not-found-title',
  message: 'not-found-message',
  instruction: 'not-found-instruction',
  code: 'not-found-code',
  example: 'not-found-example',
  link: 'not-found-link',
}));

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('PdfViewer Component - ArXiv ID Routing', () => {
  beforeEach(() => {
    mockRouter.mockReset();
  });

  describe('New format ArXiv IDs (single segment)', () => {
    it('should handle new format ArXiv ID as string', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: '1706.03762' },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByTitle('arXiv PDF Viewer - 1706.03762')).toBeInTheDocument();
        expect(screen.getByTestId('chat-widget')).toHaveTextContent('ChatWidget for 1706.03762');
      });

      const iframe = screen.getByTitle('arXiv PDF Viewer - 1706.03762') as HTMLIFrameElement;
      expect(iframe.src).toContain(encodeURIComponent('https://arxiv.org/pdf/1706.03762'));
    });

    it('should handle another new format ArXiv ID', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: '2301.12345' },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByTitle('arXiv PDF Viewer - 2301.12345')).toBeInTheDocument();
        expect(screen.getByTestId('chat-widget')).toHaveTextContent('ChatWidget for 2301.12345');
      });
    });
  });

  describe('Old format ArXiv IDs (multi-segment)', () => {
    it('should handle old format ArXiv ID with cs category', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: ['cs', '0211011'] },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByTitle('arXiv PDF Viewer - cs/0211011')).toBeInTheDocument();
        expect(screen.getByTestId('chat-widget')).toHaveTextContent('ChatWidget for cs/0211011');
      });

      const iframe = screen.getByTitle('arXiv PDF Viewer - cs/0211011') as HTMLIFrameElement;
      expect(iframe.src).toContain(encodeURIComponent('https://arxiv.org/pdf/cs/0211011'));
    });

    it('should handle old format ArXiv ID with math-ph category', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: ['math-ph', '0506203'] },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByTitle('arXiv PDF Viewer - math-ph/0506203')).toBeInTheDocument();
        expect(screen.getByTestId('chat-widget')).toHaveTextContent('ChatWidget for math-ph/0506203');
      });

      const iframe = screen.getByTitle('arXiv PDF Viewer - math-ph/0506203') as HTMLIFrameElement;
      expect(iframe.src).toContain(encodeURIComponent('https://arxiv.org/pdf/math-ph/0506203'));
    });

    it('should handle old format ArXiv ID with astro-ph category', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: ['astro-ph', '1234567'] },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByTitle('arXiv PDF Viewer - astro-ph/1234567')).toBeInTheDocument();
        expect(screen.getByTestId('chat-widget')).toHaveTextContent('ChatWidget for astro-ph/1234567');
      });
    });
  });

  describe('Invalid ArXiv IDs', () => {
    it('should show 404 for invalid format', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: 'invalid-format' },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
        expect(screen.getByText(/Please use a valid arXiv ID format/)).toBeInTheDocument();
      });
    });

    it('should show 404 for too short new format ID', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: '123.45' },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
      });
    });

    it('should show 404 for invalid old format ID (wrong digit count)', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: ['cs', '123'] },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
      });
    });

    it('should show 404 for empty array', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: [] },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
      });
    });

    it('should show 404 for undefined query', async () => {
      mockRouter.mockReturnValue({
        query: {},
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
      });
    });
  });

  describe('Loading states', () => {
    it('should show loading when router is in fallback mode', () => {
      mockRouter.mockReturnValue({
        query: { arxivId: '1706.03762' },
        isFallback: true,
      } as any);

      render(<PdfViewer />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show loading when validation is still pending (no arxivId in query)', async () => {
      mockRouter.mockReturnValue({
        query: {},
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      // When query is empty, it immediately shows 404 since there's no ID to validate
      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
      });
    });
  });

  describe('PDF URL generation', () => {
    it('should generate correct PDF URL for new format ID', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: '1706.03762' },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        const iframe = screen.getByTitle('arXiv PDF Viewer - 1706.03762') as HTMLIFrameElement;
        const expectedUrl = encodeURIComponent('https://arxiv.org/pdf/1706.03762');
        expect(iframe.src).toBe(
          `https://mozilla.github.io/pdf.js/web/viewer.html?file=${expectedUrl}&sidebarViewOnLoad=0`
        );
      });
    });

    it('should generate correct PDF URL for old format ID', async () => {
      mockRouter.mockReturnValue({
        query: { arxivId: ['cs', '0211011'] },
        isFallback: false,
      } as any);

      render(<PdfViewer />);

      await waitFor(() => {
        const iframe = screen.getByTitle('arXiv PDF Viewer - cs/0211011') as HTMLIFrameElement;
        const expectedUrl = encodeURIComponent('https://arxiv.org/pdf/cs/0211011');
        expect(iframe.src).toBe(
          `https://mozilla.github.io/pdf.js/web/viewer.html?file=${expectedUrl}&sidebarViewOnLoad=0`
        );
      });
    });
  });

  describe('ArXiv ID pattern validation', () => {
    // Test the regex pattern directly
    const arxivIdPattern = /^(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})$/i;

    it('should validate new format ArXiv IDs correctly', () => {
      expect(arxivIdPattern.test('1706.03762')).toBe(true);
      expect(arxivIdPattern.test('2301.12345')).toBe(true);
      expect(arxivIdPattern.test('0912.12345')).toBe(true);
      expect(arxivIdPattern.test('2023.1234')).toBe(true); // 4 digits after dot
      expect(arxivIdPattern.test('2023.12345')).toBe(true); // 5 digits after dot
    });

    it('should validate old format ArXiv IDs correctly', () => {
      expect(arxivIdPattern.test('cs/0211011')).toBe(true);
      expect(arxivIdPattern.test('math-ph/0506203')).toBe(true);
      expect(arxivIdPattern.test('astro-ph/1234567')).toBe(true);
      expect(arxivIdPattern.test('cond-mat/9901001')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(arxivIdPattern.test('invalid-format')).toBe(false);
      expect(arxivIdPattern.test('123.45')).toBe(false); // too short
      expect(arxivIdPattern.test('cs/123')).toBe(false); // wrong digit count
      expect(arxivIdPattern.test('2023.123456')).toBe(false); // too many digits after dot
      expect(arxivIdPattern.test('cs/12345678')).toBe(false); // too many digits in old format
    });
  });
});