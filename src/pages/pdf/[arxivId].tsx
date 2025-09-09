import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from '@/styles/Home.module.css';
import notFoundStyles from '@/styles/NotFound.module.css';
import ChatWidget from '@/components/ChatWidget';

const PdfViewer = () => {
  const router = useRouter();
  const { arxivId } = router.query;
  const [isValidId, setIsValidId] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof arxivId === 'string') {
      // ArXiv ID format validation
      // Common formats: 1706.03762, 1234.5678, math-ph/0506203, etc.
      const arxivIdPattern = /^(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})$/i;
      setIsValidId(arxivIdPattern.test(arxivId));
    } else if (arxivId) {
      // Handle array case (shouldn't happen in this route structure)
      setIsValidId(false);
    }
  }, [arxivId]);

  // Loading state while router is initializing
  if (router.isFallback || isValidId === null) {
    return (
      <div className={notFoundStyles.container}>
        <div className={notFoundStyles.content}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Invalid ArXiv ID format
  if (!isValidId) {
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
  const pdfUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=https://arxiv.org/pdf/${arxivId}&sidebarViewOnLoad=0`;

  return (
    <>
      <iframe
        id="pdfFrame"
        src={pdfUrl}
        title={`arXiv PDF Viewer - ${arxivId}`}
        className={styles.iframe}
      />
      <ChatWidget arxivId={arxivId as string} />
    </>
  );
};

export default PdfViewer;
