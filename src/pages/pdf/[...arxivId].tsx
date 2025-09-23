import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from '@/styles/Home.module.css';
import notFoundStyles from '@/styles/NotFound.module.css';
import ChatWidget from '@/components/ChatWidget';
import { parseArxivId, getPdfViewerUrl } from '@/utils/arxivUtils';

const PdfViewer = () => {
  const router = useRouter();
  const { arxivId } = router.query;
  const [parsedArxivId, setParsedArxivId] = useState<ReturnType<typeof parseArxivId> | null>(null);

  useEffect(() => {
    const parsed = parseArxivId(arxivId);
    setParsedArxivId(parsed);
  }, [arxivId]);

  // Loading state while router is initializing
  if (router.isFallback || parsedArxivId === null) {
    return (
      <div className={notFoundStyles.container}>
        <div className={notFoundStyles.content}>
          <p>Loading...</p>
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
  const pdfUrl = getPdfViewerUrl(parsedArxivId.id);

  return (
    <>
      <iframe
        id="pdfFrame"
        src={pdfUrl}
        title={`arXiv PDF Viewer - ${parsedArxivId.id}`}
        className={styles.iframe}
      />
      <ChatWidget arxivId={parsedArxivId.id} />
    </>
  );
};

export default PdfViewer;
