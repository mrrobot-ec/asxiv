import { useState, useEffect, useRef, useCallback, FC, RefObject } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Search.module.css';
import { ArxivSearchResult, ArxivSearchResponse, getArxivCategories, formatArxivDate, truncateText, cleanArxivId } from '@/utils/arxivSearch';
import { ArxivCategory } from '@/constants/arxivCategories';

type SortBy = 'relevance' | 'lastUpdatedDate' | 'submittedDate';
type SortOrder = 'ascending' | 'descending';

const SearchPage: FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<ArxivSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('descending');
  const [category, setCategory] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [author, setAuthor] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [abstract, setAbstract] = useState<string>('');

  const categories: ArxivCategory[] = getArxivCategories();
  const itemsPerPage: number = 10;
  const hasSearchedRef: RefObject<boolean> = useRef<boolean>(false);

  // Handle search
  const handleSearch = useCallback(async (page: number = 0, searchQuery?: string): Promise<void> => {
    const queryToUse = searchQuery || query;
    if (!queryToUse.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: queryToUse,
        start: (page * itemsPerPage).toString(),
        maxResults: itemsPerPage.toString(),
        sortBy,
        sortOrder
      });

      if (category) params.append('category', category);
      if (author) params.append('author', author);
      if (title) params.append('title', title);
      if (abstract) params.append('abstract', abstract);

      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data: ArxivSearchResponse = await response.json();
      setResults(data.results);
      setTotalResults(data.totalResults);
      setCurrentPage(page);
      hasSearchedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [query, sortBy, sortOrder, abstract, author, category, title]);

  // Handle query parameter from home page
  useEffect(() => {
    if (router.query.q && typeof router.query.q === 'string' && !hasSearchedRef.current) {
      const searchQuery = router.query.q;
      setQuery(searchQuery);
      // Auto-search when coming from home page
      if (searchQuery.trim()) {
        handleSearch(0, searchQuery);
      }
    }
    
    // Check if user came from "Advanced Search" link
    if (router.query.advanced === 'true') {
      setShowAdvanced(true);
    }
  }, [router.query.q, router.query.advanced, handleSearch]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    handleSearch(0);
  };

  // Handle page change
  const handlePageChange = (newPage: number): void => {
    handleSearch(newPage);
  };

  // Handle result click - navigate to PDF viewer
  const handleResultClick = (arxivId: string): void => {
    const cleanedId = cleanArxivId(arxivId);
    router.push(`/pdf/${cleanedId}`);
  };

  // Get page numbers for pagination
  const getPageNumbers = (): number[] => {
    const totalPages: number = Math.ceil(totalResults / itemsPerPage);
    const pages: number[] = [];
    const maxVisiblePages: number = 5;
    
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <>
      <Head>
        <title>Search arXiv Papers - asXiv</title>
        <meta name="description" content="Search and explore arXiv research papers with AI-powered analysis" />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Search arXiv Papers</h1>
          <p className={styles.subtitle}>
            Discover and explore research papers from arXiv with AI-powered analysis
          </p>
        </div>

        <div className={styles.searchSection}>
          <form onSubmit={handleSubmit} className={styles.searchForm}>
            <div className={styles.searchInputContainer}>
              <input
                type="text"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search papers by title, abstract, authors, or keywords..."
                className={styles.searchInput}
                disabled={loading}
              />
              <button
                type="submit"
                className={styles.searchButton}
                disabled={loading || !query.trim()}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            <button
              type="button"
              onClick={(): void => setShowAdvanced(!showAdvanced)}
              className={styles.advancedToggle}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
            
            {showAdvanced && (
              <div className={styles.advancedOptions}>
                <div className={styles.advancedRow}>
                  <div className={styles.advancedField}>
                    <label htmlFor="author">Author:</label>
                    <input
                      id="author"
                      type="text"
                      value={author}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthor(e.target.value)}
                      placeholder="Author name"
                      className={styles.advancedInput}
                    />
                  </div>
                  <div className={styles.advancedField}>
                    <label htmlFor="title">Title:</label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                      placeholder="Title keywords"
                      className={styles.advancedInput}
                    />
                  </div>
                </div>
                <div className={styles.advancedRow}>
                  <div className={styles.advancedField}>
                    <label htmlFor="abstract">Abstract:</label>
                    <input
                      id="abstract"
                      type="text"
                      value={abstract}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAbstract(e.target.value)}
                      placeholder="Abstract keywords"
                      className={styles.advancedInput}
                    />
                  </div>
                  <div className={styles.advancedField}>
                    <label htmlFor="category">Category:</label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                      className={styles.advancedSelect}
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.code} value={cat.code}>
                          {cat.code} - {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.advancedRow}>
                  <div className={styles.advancedField}>
                    <label htmlFor="sortBy">Sort by:</label>
                    <select
                      id="sortBy"
                      value={sortBy}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortBy)}
                      className={styles.advancedSelect}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="lastUpdatedDate">Last Updated</option>
                      <option value="submittedDate">Submission Date</option>
                    </select>
                  </div>
                  <div className={styles.advancedField}>
                    <label htmlFor="sortOrder">Order:</label>
                    <select
                      id="sortOrder"
                      value={sortOrder}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortOrder(e.target.value as SortOrder)}
                      className={styles.advancedSelect}
                    >
                      <option value="descending">Descending</option>
                      <option value="ascending">Ascending</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {error && (
          <div className={styles.error}>
            <p>Error: {error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <p className={styles.resultsCount}>
                Found {totalResults.toLocaleString()} results
                {query && ` for "${query}"`}
              </p>
            </div>

            <div className={styles.resultsList}>
              {results.map((result) => (
                <div
                  key={result.id}
                  className={styles.resultItem}
                  onClick={(): void => handleResultClick(result.id)}
                >
                  <div className={styles.resultHeader}>
                    <h3 className={styles.resultTitle}>{result.title}</h3>
                    <div className={styles.resultMeta}>
                      <span className={styles.resultId}>arXiv:{result.id}</span>
                      <span className={styles.resultDate}>
                        {formatArxivDate(result.published)}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.resultAuthors}>
                    {result.authors.join(', ')}
                  </div>
                  
                  <div className={styles.resultAbstract}>
                    {truncateText(result.abstract, 300)}
                  </div>
                  
                  <div className={styles.resultCategories}>
                    {result.categories.map((cat) => (
                      <span key={cat} className={styles.categoryTag}>
                        {cat}
                      </span>
                    ))}
                  </div>
                  
                  <div className={styles.resultActions}>
                    <Link
                      href={`/pdf/${cleanArxivId(result.id)}`}
                      className={styles.actionButton}
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>): void => e.stopPropagation()}
                    >
                      View with AI
                    </Link>
                    <a
                      href={result.abstractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.actionButton}
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>): void => e.stopPropagation()}
                    >
                      View Abstract
                    </a>
                    <a
                      href={result.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.actionButton}
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>): void => e.stopPropagation()}
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {totalResults > itemsPerPage && (
              <div className={styles.pagination}>
                <button
                  onClick={(): void => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0 || loading}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                
                <div className={styles.pageNumbers}>
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={(): void => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`${styles.pageButton} ${
                        pageNum === currentPage ? styles.pageButtonActive : ''
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={(): void => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalResults / itemsPerPage) - 1 || loading}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className={styles.noResults}>
            <p>No papers found for &quot;{query}&quot;</p>
            <p>Try adjusting your search terms or filters.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchPage;
