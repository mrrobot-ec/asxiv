import styles from '@/styles/NotFound.module.css';

const Home = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>asXiv</h1>
        <p className={styles.message}>
          An AI-powered interface for exploring and understanding arXiv research papers
        </p>
        <p className={styles.instruction}>
          Use the format: <code className={styles.code}>/pdf/[arxiv-id]</code>
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
};

export default Home;
