import { useState, FC } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '@/styles/NotFound.module.css';

const Home: FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleDirectAccess = (e: React.FormEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    const arxivId: string = searchQuery.trim();
    if (arxivId) {
      // Check if it looks like an arXiv ID
      const arxivIdPattern: RegExp = /^(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})$/i;
      if (arxivIdPattern.test(arxivId)) {
        router.push(`/pdf/${arxivId}`);
      } else {
        // If it doesn't look like an arXiv ID, treat it as a search query
        router.push(`/search?q=${encodeURIComponent(arxivId)}`);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>asXiv</h1>
        <p className={styles.message}>
          An AI-powered interface for exploring and understanding arXiv research papers
        </p>
        
        <div className={styles.searchContainer}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchInputGroup}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search papers or enter arXiv ID (e.g., 1706.03762)"
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                Search
              </button>
            </div>
            <div className={styles.searchActions}>
              <button
                type="button"
                onClick={handleDirectAccess}
                className={styles.directButton}
                disabled={!searchQuery.trim()}
              >
                Go to Paper
              </button>
              <Link href="/search?advanced=true" className={styles.advancedLink}>
                Advanced Search
              </Link>
            </div>
          </form>
        </div>

        <p className={styles.instruction}>
          Search or in the URL add: <code className={styles.code}>/pdf/[arxiv-id]</code>
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
