import { useRouter } from 'next/router';
import { useEffect, useState, FC } from 'react';
import notFoundStyles from '@/styles/NotFound.module.css';
import pdfViewerStyles from '@/styles/PdfViewer.module.css';
import ChatWidget from '@/components/ChatWidget';
import { parseArxivId, getPdfViewerUrl } from '@/utils/arxivUtils';
import { cleanArxivId } from '@/utils/arxivSearch';

const PdfViewer: FC = () => {
  const router = useRouter();
  const { arxivId } = router.query as { arxivId: string | string[] | undefined };
  const [parsedArxivId, setParsedArxivId] = useState<ReturnType<typeof parseArxivId> | null>(null);
  const [navHeight, setNavHeight] = useState<number>(0);

  useEffect(() => {
    if (arxivId) {
      // Clean the arxivId to remove version numbers before parsing
      const cleanedId: string = cleanArxivId(arxivId);
      const parsed: ReturnType<typeof parseArxivId> = parseArxivId(cleanedId);
      setParsedArxivId(parsed);
    }

    // Calculate navigation bar height dynamically
    const calculateNavHeight = (): void => {
      const nav: Element | null = document.querySelector('nav');
      if (nav) {
        const rect: DOMRect = nav.getBoundingClientRect();
        setNavHeight(rect.height);
      }
    };

    // Calculate on mount
    calculateNavHeight();
    
    // Recalculate on resize
    window.addEventListener('resize', calculateNavHeight);
    
    return () => {
      window.removeEventListener('resize', calculateNavHeight);
    };
  }, [arxivId]);

  // Handle PDF loading errors
  useEffect(() => {
    const handlePdfError = (): void => {
      const errorMessage: HTMLElement | null = document.getElementById('pdf-error-message');
      if (errorMessage) {
        errorMessage.style.display = 'block';
      }
    };

    const iframe: HTMLElement | null = document.getElementById('pdfFrame');
    if (iframe) {
      iframe.addEventListener('error', handlePdfError);
      
      // Also check if the iframe loads but shows an error page
      iframe.addEventListener('load', (): void => {
        // First, assume success and hide error message
        const errorMessage: HTMLElement | null = document.getElementById('pdf-error-message');
        if (errorMessage) {
          errorMessage.style.display = 'none';
        }
        
        setTimeout((): void => {
          try {
            const iframeElement: HTMLIFrameElement = iframe as HTMLIFrameElement;
            const iframeDoc: Document | null | undefined = iframeElement.contentDocument || iframeElement.contentWindow?.document;
            if (iframeDoc) {
              const bodyText: string = iframeDoc.body?.textContent || '';
              if (bodyText.includes('404') || bodyText.includes('Not Found') || bodyText.includes('withdrawn') || 
                  bodyText.includes('PDF not available') || bodyText.includes('Unable to load document') ||
                  bodyText.includes('Failed to fetch') || bodyText.includes('An error occurred while loading the PDF')) {
                handlePdfError();
              }
            }
          } catch {
            /* Cross-origin access is expected for PDF.js viewer; ignore errors */
          }
        }, 3000);
      });
    }

    return () => {
      if (iframe) {
        iframe.removeEventListener('error', handlePdfError);
      }
    };
  }, [parsedArxivId]);

  // Loading state while router is initializing
  if (router.isFallback) {
    return (
      <div className={notFoundStyles.container}>
        <div className={notFoundStyles.content}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // No arxivId provided - show 404
  if (parsedArxivId === null) {
    return (
      <div className={notFoundStyles.container}>
        <div className={notFoundStyles.content}>
          <h1 className={notFoundStyles.title}>404</h1>
          <p className={notFoundStyles.message}>Invalid arXiv ID format</p>
          <p className={notFoundStyles.instruction}>
            Please provide a valid arXiv ID in the URL format: <code className={notFoundStyles.code}>/pdf/[arxiv-id]</code>
          </p>
          <p className={notFoundStyles.example}>
            Example: <a href="/pdf/1706.03762" className={notFoundStyles.link}>/pdf/1706.03762</a>
          </p>
        </div>
      </div>
    );
  }

  // Invalid ArXiv ID format
  if (!parsedArxivId.isValid) {
    return (
      <div className={notFoundStyles.container}>
        <div className={notFoundStyles.content}>
          <h1 className={notFoundStyles.title}>404</h1>
          <p className={notFoundStyles.message}>Invalid arXiv ID format</p>
          <p className={notFoundStyles.instruction}>
            Please use a valid arXiv ID format like: <code className={notFoundStyles.code}>1706.03762</code>
          </p>
          <p className={notFoundStyles.example}>
            Example: <a href="/pdf/1706.03762" className={notFoundStyles.link}>/pdf/1706.03762 (Attention Is All You Need)</a>
          </p>
        </div>
      </div>
    );
  }

  // Valid ArXiv ID - show PDF viewer with chat widget
  const pdfViewerUrl: string = getPdfViewerUrl(parsedArxivId.id);

  return (
    <>
      <style jsx>{`
        :global(:root) {
          --nav-height: ${navHeight}px;
        }
      `}</style>
      <iframe
        id="pdfFrame"
        src={pdfViewerUrl}
        title={`arXiv PDF Viewer - ${parsedArxivId.id}`}
        className={pdfViewerStyles.pdfViewer}
        allow="fullscreen; clipboard-write; clipboard-read"
        sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups"
        onError={() => undefined}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        display: 'none', // Hidden by default, will be shown if PDF fails to load
        zIndex: 10
      }} id="pdf-error-message">
        <h3 style={{ color: '#89131b', marginBottom: '1rem' }}>PDF Not Available</h3>
        <p style={{ marginBottom: '1rem' }}>
          This paper may have been withdrawn or the PDF is not available for download.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          You can still use the AI assistant to discuss the paper based on its abstract and metadata.
        </p>
        <a 
          href={`https://arxiv.org/abs/${parsedArxivId.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#89131b',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          View Abstract on arXiv →
        </a>
      </div>
      <ChatWidget arxivId={parsedArxivId.id} navHeight={navHeight} />
    </>
  );
};

export default PdfViewer;
