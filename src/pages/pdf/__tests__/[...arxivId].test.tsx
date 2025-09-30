import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/router';
import PdfViewer from '../[...arxivId]';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

// Mock the ChatWidget component
jest.mock('@/components/ChatWidget', () => {
  return function MockChatWidget({ arxivId, navHeight }: { arxivId: string; navHeight: number }) {
    return <div data-testid="chat-widget">Chat Widget for {arxivId} (navHeight: {navHeight})</div>;
  };
});

// Mock arxivUtils
jest.mock('@/utils/arxivUtils', () => ({
  parseArxivId: jest.fn(),
  getPdfViewerUrl: jest.fn()
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockParseArxivId = jest.requireMock('@/utils/arxivUtils').parseArxivId;
const mockGetPdfViewerUrl = jest.requireMock('@/utils/arxivUtils').getPdfViewerUrl;

describe('PdfViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM methods
    Object.defineProperty(document, 'querySelector', {
      value: jest.fn(() => ({
        getBoundingClientRect: () => ({ height: 60 })
      })),
      writable: true
    });
    
    // Mock window.addEventListener and removeEventListener
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  it('should render loading state initially', () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: '1706.03762' },
      isReady: true,
      isFallback: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: '1706.03762',
      isValid: true,
      category: null,
      number: '1706.03762',
      isOldFormat: false
    });

    render(<PdfViewer />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render PDF viewer with valid arXiv ID', async () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: '1706.03762' },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: '1706.03762',
      isValid: true,
      category: null,
      number: '1706.03762',
      isOldFormat: false
    });

    mockGetPdfViewerUrl.mockReturnValue('https://mozilla.github.io/pdf.js/web/viewer.html?file=test');

    render(<PdfViewer />);

    await waitFor(() => {
      expect(screen.getByTitle('arXiv PDF Viewer - 1706.03762')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
    expect(screen.getByText('Chat Widget for 1706.03762 (navHeight: 60)')).toBeInTheDocument();
  });

  it('should render error state for invalid arXiv ID', async () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: 'invalid-id' },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: 'invalid-id',
      isValid: false,
      category: null,
      number: null,
      isOldFormat: false
    });

    render(<PdfViewer />);

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
    });
  });

  it('should handle old format arXiv ID', async () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: 'cs/0211011' },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: 'cs/0211011',
      isValid: true,
      category: 'cs',
      number: '0211011',
      isOldFormat: true
    });

    mockGetPdfViewerUrl.mockReturnValue('https://mozilla.github.io/pdf.js/web/viewer.html?file=test');

    render(<PdfViewer />);

    await waitFor(() => {
      expect(screen.getByTitle('arXiv PDF Viewer - cs/0211011')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
  });

  it('should handle array arXiv ID from router', async () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: ['cs', '0211011'] },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: 'cs/0211011',
      isValid: true,
      category: 'cs',
      number: '0211011',
      isOldFormat: true
    });

    mockGetPdfViewerUrl.mockReturnValue('https://mozilla.github.io/pdf.js/web/viewer.html?file=test');

    render(<PdfViewer />);

    await waitFor(() => {
      expect(screen.getByTitle('arXiv PDF Viewer - cs/0211011')).toBeInTheDocument();
    });
  });

  it('should handle undefined arXiv ID', async () => {
    mockUseRouter.mockReturnValue({
      query: {},
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: '',
      isValid: false,
      category: null,
      number: null,
      isOldFormat: false
    });

    render(<PdfViewer />);

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Invalid arXiv ID format')).toBeInTheDocument();
    });
  });

  it('should calculate navigation height and update on resize', async () => {
    const mockGetBoundingClientRect = jest.fn(() => ({ height: 80 }));
    const mockNavElement = { getBoundingClientRect: mockGetBoundingClientRect };
    
    (document.querySelector as jest.Mock).mockReturnValue(mockNavElement);

    mockUseRouter.mockReturnValue({
      query: { arxivId: '1706.03762' },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: '1706.03762',
      isValid: true,
      category: null,
      number: '1706.03762',
      isOldFormat: false
    });

    mockGetPdfViewerUrl.mockReturnValue('https://mozilla.github.io/pdf.js/web/viewer.html?file=test');

    render(<PdfViewer />);

    await waitFor(() => {
      expect(document.querySelector).toHaveBeenCalledWith('nav');
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    // Test resize event
    const resizeHandler = (window.addEventListener as jest.Mock).mock.calls.find(
      call => call[0] === 'resize'
    )?.[1];
    
    if (resizeHandler) {
      act(() => {
        resizeHandler();
      });
      expect(mockGetBoundingClientRect).toHaveBeenCalledTimes(2); // Once on mount, once on resize
    }
  });

  it('should handle PDF loading error', async () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: '1706.03762' },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: '1706.03762',
      isValid: true,
      category: null,
      number: '1706.03762',
      isOldFormat: false
    });

    mockGetPdfViewerUrl.mockReturnValue('https://mozilla.github.io/pdf.js/web/viewer.html?file=test');

    render(<PdfViewer />);

    await waitFor(() => {
      const iframe = screen.getByTitle('arXiv PDF Viewer - 1706.03762');
      expect(iframe).toBeInTheDocument();
    });

    // Simulate iframe error
    const iframe = screen.getByTitle('arXiv PDF Viewer - 1706.03762');
    act(() => {
      fireEvent.error(iframe);
    });

    // The error message should be shown
    await waitFor(() => {
      expect(screen.getByText('PDF Not Available')).toBeInTheDocument();
    });
  });

  it('should set correct iframe attributes', async () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: '1706.03762' },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: '1706.03762',
      isValid: true,
      category: null,
      number: '1706.03762',
      isOldFormat: false
    });

    mockGetPdfViewerUrl.mockReturnValue('https://mozilla.github.io/pdf.js/web/viewer.html?file=test');

    render(<PdfViewer />);

    await waitFor(() => {
      const iframe = screen.getByTitle('arXiv PDF Viewer - 1706.03762');
      expect(iframe).toHaveAttribute('allow', 'fullscreen; clipboard-write; clipboard-read');
      expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-downloads allow-popups');
    });
  });

  it('should render error message with correct styling', async () => {
    mockUseRouter.mockReturnValue({
      query: { arxivId: '1706.03762' },
      isReady: true
    } as any);

    mockParseArxivId.mockReturnValue({
      id: '1706.03762',
      isValid: true,
      category: null,
      number: '1706.03762',
      isOldFormat: false
    });

    mockGetPdfViewerUrl.mockReturnValue('https://mozilla.github.io/pdf.js/web/viewer.html?file=test');

    render(<PdfViewer />);

    await waitFor(() => {
      const iframe = screen.getByTitle('arXiv PDF Viewer - 1706.03762');
      act(() => {
        fireEvent.error(iframe);
      });
    });

    await waitFor(() => {
      const errorMessage = screen.getByText('PDF Not Available');
      expect(errorMessage.closest('div')).toHaveStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '10'
      });
    });
  });
});
