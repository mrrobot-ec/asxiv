import styles from '@/styles/NotFound.module.css';

const Custom404 = () => (
  <div className={styles.container}>
    <div className={styles.content}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.message}>No arXiv PDF found</p>
      <p className={styles.instruction}>
        This page only works with arXiv PDF URLs in the format: <code className={styles.code}>/pdf/[arxiv-id]</code>
      </p>
      <p className={styles.example}>
        Example: <a href="/pdf/1706.03762" className={styles.link}>/pdf/1706.03762 (Attention Is All You Need)</a>
      </p>
      <div className={styles.instruction} style={{ paddingTop: '1rem' }}>
        <a href="https://github.com/montanaflynn/asxiv" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub</a>
      </div>
    </div>
  </div>
);

export default Custom404;
