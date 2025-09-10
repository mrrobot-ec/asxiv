import { useRouter } from 'next/router';
import { useEffect } from 'react';
import styles from '@/styles/NotFound.module.css';

const AbsRedirect = () => {
  const router = useRouter();
  const { arxivId } = router.query;

  useEffect(() => {
    if (typeof arxivId === 'string') {
      // Redirect to the PDF viewer
      router.replace(`/pdf/${arxivId}`);
    }
  }, [arxivId, router]);

  // Show loading state while redirecting
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.message}>Redirecting to PDF viewer...</p>
        {typeof arxivId === 'string' && (
          <p className={styles.instruction}>
            Loading: <a href={`/pdf/${arxivId}`} className={styles.link}>arXiv:{arxivId}</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default AbsRedirect;
