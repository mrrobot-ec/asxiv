import {
  ChangeEvent,
  FC,
  FormEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from '@/styles/Search.module.css';
import {
  ArxivSearchResult,
  formatArxivDate,
  getArxivCategories,
  truncateText,
  cleanArxivId
} from '@/utils/arxivSearch';
import { ArxivCategory } from '@/constants/arxivCategories';

interface SearchSuccessResponse {
  results: ArxivSearchResult[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  query: string;
}

interface AssistantRecommendation {
  paperId: string;
  title: string;
  reason: string;
}

interface AssistantResponse {
  overview: string;
  recommendedPapers: AssistantRecommendation[];
  followUpQuestions: string[];
  paperInsights: Record<string, string>;
}

const ITEMS_PER_PAGE = 10;
const MAX_INSIGHT_PAPERS = 10;
const ASSISTANT_SUGGESTIONS = [
  {
    label: 'Give me insights about each paper',
    value: 'Give me concise insights about each paper in the current results.'
  },
  {
    label: 'Top papers for a quick review',
    value: 'Which papers should I read first for a quick understanding of this topic?'
  },
  {
    label: 'Compare methodologies',
    value: 'Compare the methodologies used across these papers and highlight key differences.'
  }
];

const SearchPage: FC = () => {
  const router = useRouter();

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<ArxivSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'relevance' | 'lastUpdatedDate' | 'submittedDate'>('relevance');
  const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>('descending');
  const [category, setCategory] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [author, setAuthor] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [abstract, setAbstract] = useState<string>('');

  const [assistantPrompt, setAssistantPrompt] = useState<string>('');
  const [assistantLoading, setAssistantLoading] = useState<boolean>(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantOverview, setAssistantOverview] = useState<string | null>(null);
  const [assistantFollowUps, setAssistantFollowUps] = useState<string[]>([]);
  const [assistantRecommendations, setAssistantRecommendations] = useState<AssistantRecommendation[]>([]);
  const [paperInsights, setPaperInsights] = useState<Record<string, string>>({});

  const [assistantFloatingOpen, setAssistantFloatingOpen] = useState<boolean>(false);
  const [assistantExpanded, setAssistantExpanded] = useState<boolean>(false);
  const [assistantDragging, setAssistantDragging] = useState<boolean>(false);
  const [assistantPosition, setAssistantPosition] = useState<{ x: number; y: number }>({ x: 24, y: 24 });
  const assistantPanelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const initialPositionSetRef = useRef<boolean>(false);

  const categories: ArxivCategory[] = getArxivCategories();
  const hasSearchedRef = useRef<boolean>(false);
  const lastExecutedQueryRef = useRef<string>('');

  const recommendedIds = useMemo(
    () => new Set(assistantRecommendations.map((item) => item.paperId)),
    [assistantRecommendations]
  );

  const hasAssistantSummary = useMemo(
    () =>
      Boolean(assistantOverview) ||
      assistantRecommendations.length > 0 ||
      assistantFollowUps.length > 0,
    [assistantOverview, assistantRecommendations, assistantFollowUps]
  );

  const assistantOverviewText = useMemo(() => {
    if (assistantOverview && assistantOverview.trim().length > 0) {
      return assistantOverview;
    }
    if (assistantRecommendations.length > 0) {
      return 'The AI teammate highlighted promising papers from this search.';
    }
    if (assistantFollowUps.length > 0) {
      return 'The AI teammate prepared follow-up questions to guide your next steps.';
    }
    return null;
  }, [assistantOverview, assistantRecommendations, assistantFollowUps]);

  const canUseAssistant = results.length > 0;
  const shouldShowAssistantEntry = canUseAssistant || assistantFloatingOpen || assistantRecommendations.length > 0;

  const clampToViewport = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') {
      return { x, y };
    }
    const panelWidth = assistantPanelRef.current?.offsetWidth ?? 340;
    const panelHeight = assistantPanelRef.current?.offsetHeight ?? 320;
    const margin = 16;
    const maxX = Math.max(margin, window.innerWidth - panelWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - panelHeight - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY)
    };
  }, []);

  const ensureInitialPosition = useCallback(() => {
    if (initialPositionSetRef.current || typeof window === 'undefined') {
      return;
    }
    requestAnimationFrame(() => {
      const panelWidth = assistantPanelRef.current?.offsetWidth ?? 340;
      const panelHeight = assistantPanelRef.current?.offsetHeight ?? 320;
      const tentativeX = window.innerWidth - panelWidth - 24;
      const tentativeY = window.innerHeight - panelHeight - 24;
      setAssistantPosition(clampToViewport(tentativeX, tentativeY));
      initialPositionSetRef.current = true;
    });
  }, [clampToViewport]);

  const handleAssistantOpen = useCallback(() => {
    setAssistantFloatingOpen(true);
    setAssistantExpanded(false);
    ensureInitialPosition();
  }, [ensureInitialPosition]);

  const handleAssistantClose = useCallback(() => {
    dragStateRef.current = null;
    setAssistantFloatingOpen(false);
    setAssistantExpanded(false);
    setAssistantDragging(false);
  }, []);

  const handleDragStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target && target.closest('button')) {
      return;
    }
    if (!assistantPanelRef.current) {
      return;
    }

    const rect = assistantPanelRef.current.getBoundingClientRect();
    dragStateRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    setAssistantDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleDragMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const newX = event.clientX - dragState.offsetX;
      const newY = event.clientY - dragState.offsetY;
      setAssistantPosition(clampToViewport(newX, newY));
    },
    [clampToViewport]
  );

  const handleDragEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setAssistantDragging(false);
  }, []);

  useEffect(() => {
    if (assistantFloatingOpen) {
      ensureInitialPosition();
    }
  }, [assistantFloatingOpen, ensureInitialPosition]);

  useEffect(() => {
    if (!assistantFloatingOpen || typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setAssistantPosition((prev) => clampToViewport(prev.x, prev.y));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [assistantFloatingOpen, clampToViewport]);

  const resetAssistantState = () => {
    setAssistantOverview(null);
    setAssistantRecommendations([]);
    setAssistantFollowUps([]);
    setPaperInsights({});
    setAssistantError(null);
  };

  const handleSearch = useCallback(
    async (page: number = 0, searchQuery?: string, options?: { skipLoading?: boolean }) => {
      const queryToUse = searchQuery ?? query;
      if (!queryToUse.trim()) {
        return;
      }

      const skipLoading = options?.skipLoading === true;

      if (!skipLoading) {
        setLoading(true);
      }

      setError(null);

      if (!skipLoading && page === 0) {
        resetAssistantState();
      }

      lastExecutedQueryRef.current = queryToUse;

      try {
        const params = new URLSearchParams({
          q: queryToUse,
          start: (page * ITEMS_PER_PAGE).toString(),
          maxResults: ITEMS_PER_PAGE.toString(),
          sortBy,
          sortOrder
        });

        if (category) params.append('category', category);
        if (author) params.append('author', author);
        if (title) params.append('title', title);
        if (abstract) params.append('abstract', abstract);

        const response = await fetch(`/api/search?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || 'Search failed');
        }

        const data = (await response.json()) as SearchSuccessResponse;

        setResults(data.results);
        setTotalResults(data.totalResults);
        setCurrentPage(page);
        hasSearchedRef.current = true;
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : 'Search failed. Please try again.';
        setError(message);
        setResults([]);
        setTotalResults(0);
      } finally {
        if (!skipLoading) {
          setLoading(false);
        }
      }
    },
    [abstract, author, category, query, sortBy, sortOrder, title]
  );

  const runAssistant = useCallback(async (promptText: string) => {
    const trimmedPrompt = promptText.trim();
    setAssistantError(null);

    if (!trimmedPrompt) {
      setAssistantError('Describe what you need help with to get tailored suggestions.');
      return;
    }

    if (results.length === 0) {
      setAssistantError('Run a search first so the AI teammate has papers to review.');
      return;
    }

    const insightQuery = lastExecutedQueryRef.current || query;
    if (!insightQuery.trim()) {
      setAssistantError('Please run a search before asking for insights.');
      return;
    }

    setAssistantLoading(true);

    try {
      const topPapers = results.slice(0, MAX_INSIGHT_PAPERS).map((paper) => ({
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        published: paper.published,
        categories: paper.categories
      }));

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: insightQuery,
          goal: trimmedPrompt,
          papers: topPapers
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to generate insights');
      }

      const data = (await response.json()) as AssistantResponse;

      const overviewText = data.overview?.trim() || null;
      setAssistantOverview(overviewText);
      setAssistantRecommendations(data.recommendedPapers);
      setAssistantFollowUps(data.followUpQuestions);
      setPaperInsights(data.paperInsights);
    } catch (insightError) {
      const message = insightError instanceof Error ? insightError.message : 'Failed to generate insights';
      setAssistantError(message);
    } finally {
      setAssistantLoading(false);
    }
  }, [query, results]);

  const handleAssistantSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      runAssistant(assistantPrompt);
    },
    [assistantPrompt, runAssistant]
  );

  const handleSuggestionClick = useCallback(
    (value: string) => {
      if (assistantLoading) {
        return;
      }
      setAssistantPrompt(value);
      runAssistant(value);
    },
    [assistantLoading, runAssistant]
  );

  useEffect(() => {
    if (router.query.q && typeof router.query.q === 'string' && !hasSearchedRef.current) {
      const searchQuery = router.query.q;
      setQuery(searchQuery);
      if (searchQuery.trim()) {
        handleSearch(0, searchQuery);
      }
    }

    if (router.query.advanced === 'true') {
      setShowAdvanced(true);
    }
  }, [handleSearch, router.query.advanced, router.query.q]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearch(0);
  };

  const handlePageChange = (newPage: number): void => {
    const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
    if (newPage < 0 || newPage === currentPage || newPage >= totalPages) {
      return;
    }
    handleSearch(newPage, lastExecutedQueryRef.current || query);
  };

  const handleResultClick = (arxivId: string): void => {
    const cleanedId = cleanArxivId(arxivId);
    router.push(`/pdf/${cleanedId}`);
  };

  const getPageNumbers = (): number[] => {
    const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= 0) {
      return pages;
    }

    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }

    return pages;
  };

  return (
    <>
      <Head>
        <title>Search arXiv Papers - asXiv</title>
        <meta
          name="description"
          content="Search arXiv papers instantly and collaborate with an AI research teammate for deeper insights."
        />
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Search arXiv Papers</h1>
          <p className={styles.subtitle}>
            Discover and explore research papers from arXiv. Ask the AI teammate for tailored
            recommendations once results appear.
          </p>
        </div>

        <div className={styles.searchSection}>
          <form onSubmit={handleSubmit} className={styles.searchForm}>
            <div className={styles.searchInputContainer}>
              <input
                type="text"
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="Search papers by title, abstract, authors, or keywords..."
                className={styles.searchInput}
                disabled={loading}
              />
              <button type="submit" className={styles.searchButton} disabled={loading || !query.trim()}>
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
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
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setAuthor(event.target.value)}
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
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
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
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setAbstract(event.target.value)}
                      placeholder="Abstract keywords"
                      className={styles.advancedInput}
                    />
                  </div>
                  <div className={styles.advancedField}>
                    <label htmlFor="category">Category:</label>
                    <select
                      id="category"
                      value={category}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value)}
                      className={styles.advancedSelect}
                    >
                      <option value="">All categories</option>
                      {categories.map((cat) => (
                        <option key={cat.code} value={cat.code}>
                          {cat.code} — {cat.name}
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
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setSortBy(event.target.value as typeof sortBy)
                      }
                      className={styles.advancedSelect}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="lastUpdatedDate">Last Updated Date</option>
                      <option value="submittedDate">Submitted Date</option>
                    </select>
                  </div>
                  <div className={styles.advancedField}>
                    <label htmlFor="sortOrder">Sort order:</label>
                    <select
                      id="sortOrder"
                      value={sortOrder}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setSortOrder(event.target.value as typeof sortOrder)
                      }
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

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <p className={styles.resultsCount}>
              {hasSearchedRef.current
                ? `${totalResults.toLocaleString()} result${totalResults === 1 ? '' : 's'} found`
                : 'Search to see results'}
            </p>
          </div>

          {hasAssistantSummary && (
            <div className={styles.assistantSummary}>
              <div className={styles.assistantSummaryHeader}>
                <span className={styles.assistantBadge}>AI teammate</span>
                <h2>Recommendations</h2>
              </div>
              {assistantOverviewText && (
                <p className={styles.assistantOverview}>{assistantOverviewText}</p>
              )}

              {assistantRecommendations.length > 0 && (
                <ul className={styles.assistantList}>
                  {assistantRecommendations.map((item) => (
                    <li key={item.paperId} className={styles.assistantListItem}>
                      <span className={styles.assistantListTitle}>{item.title}</span>
                      <p className={styles.assistantListReason}>{item.reason}</p>
                    </li>
                  ))}
                </ul>
              )}

              {assistantFollowUps.length > 0 && (
                <div className={styles.assistantFollowUps}>
                  <span className={styles.followUpLabel}>Follow-up questions:</span>
                  <ul>
                    {assistantFollowUps.map((question, index) => (
                      <li key={`${question}-${index.toString()}`}>{question}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {results.length === 0 && hasSearchedRef.current && !loading ? (
            <div className={styles.noResults}>
              <p>No papers found for this query. Try broadening your keywords or adjusting filters.</p>
            </div>
          ) : (
            <div className={styles.resultsList}>
              {results.map((result) => {
                const isRecommended = recommendedIds.has(result.id);
                return (
                  <div
                    key={result.id}
                    className={`${styles.resultItem} ${isRecommended ? styles.recommendedResult : ''}`}
                    onClick={() => handleResultClick(result.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleResultClick(result.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.resultHeader}>
                      <h3 className={styles.resultTitle}>{result.title}</h3>
                      <div className={styles.resultMeta}>
                        <span className={styles.resultId}>{result.id}</span>
                        <span className={styles.resultDate}>
                          {formatArxivDate(result.published) || 'Publication date unavailable'}
                        </span>
                        <span className={styles.resultDate}>
                          Updated: {formatArxivDate(result.updated) || 'Unknown'}
                        </span>
                        {isRecommended && <span className={styles.resultBadge}>AI recommended</span>}
                      </div>
                    </div>

                    <div className={styles.resultAuthors}>{result.authors.join(', ')}</div>

                    <div className={styles.resultAbstract}>{truncateText(result.abstract, 300)}</div>

                    {paperInsights[result.id] && (
                      <div className={styles.resultInsight}>
                        <span className={styles.insightLabel}>AI insight</span>
                        <p className={styles.insightText}>{paperInsights[result.id]}</p>
                      </div>
                    )}

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
                        onClick={(event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()}
                      >
                        View with AI
                      </Link>
                      <a
                        href={result.abstractUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionButton}
                        onClick={(event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()}
                      >
                        View Abstract
                      </a>
                      <a
                        href={result.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionButton}
                        onClick={(event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()}
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalResults > ITEMS_PER_PAGE && results.length > 0 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0 || loading}
                className={styles.paginationButton}
              >
                Previous
              </button>

              <div className={styles.pageNumbers}>
                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
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
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={loading || (currentPage + 1) * ITEMS_PER_PAGE >= totalResults}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {shouldShowAssistantEntry && (
        <>
          {!assistantFloatingOpen && canUseAssistant && (
            <button
              type="button"
              className={styles.floatingAssistantToggle}
              onClick={handleAssistantOpen}
              aria-label="Open AI teammate panel"
              aria-expanded={assistantFloatingOpen}
            >
              AI teammate
            </button>
          )}

          {assistantFloatingOpen && (
            <div
              ref={assistantPanelRef}
              className={`${styles.floatingAssistantPanel} ${
                assistantExpanded ? styles.floatingAssistantPanelExpanded : ''
              } ${assistantDragging ? styles.floatingAssistantDragging : ''}`}
              style={{ transform: `translate3d(${assistantPosition.x}px, ${assistantPosition.y}px, 0)` }}
            >
              <div
              className={`${styles.floatingAssistantHeader} ${
                  assistantDragging ? styles.floatingAssistantHeaderActive : ''
                }`}
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                role="presentation"
              >
                <div className={styles.floatingAssistantHeaderContent}>
                  <span className={styles.floatingAssistantTitle}>AI research teammate</span>
                </div>
                <div className={styles.floatingAssistantControls}>
                  <button
                    type="button"
                    className={styles.floatingAssistantIconButton}
                    onClick={() => setAssistantExpanded((prev) => !prev)}
                    aria-label={assistantExpanded ? 'Collapse assistant panel' : 'Expand assistant panel'}
                  >
                    {assistantExpanded ? '-' : '+'}
                  </button>
                  <button
                    type="button"
                    className={styles.floatingAssistantIconButton}
                    onClick={handleAssistantClose}
                    aria-label="Close assistant panel"
                  >
                    X
                  </button>
                </div>
              </div>
              <div className={styles.floatingAssistantBody}>
                <form onSubmit={handleAssistantSubmit} className={styles.assistantForm}>
                  {!canUseAssistant && (
                    <p className={styles.assistantHint}>
                      Run a search so the AI teammate has papers to analyze.
                    </p>
                  )}
                  <textarea
                    value={assistantPrompt}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setAssistantPrompt(event.target.value)}
                    placeholder="Describe what you need from the current papers..."
                    rows={assistantExpanded ? 8 : 4}
                    className={styles.assistantInput}
                    disabled={assistantLoading || !canUseAssistant}
                  />
                  {canUseAssistant && (
                    <div className={styles.assistantSuggestions}>
                      <span className={styles.assistantSuggestionsTitle}>Suggested prompts</span>
                      <div className={styles.assistantSuggestionsList}>
                        {ASSISTANT_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion.value}
                            type="button"
                            className={styles.assistantSuggestionButton}
                            onClick={() => handleSuggestionClick(suggestion.value)}
                            disabled={assistantLoading}
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {assistantError && <p className={styles.assistantError}>{assistantError}</p>}
                  <div className={styles.assistantActions}>
                    <button
                      type="submit"
                      className={styles.assistantButton}
                      disabled={assistantLoading || !canUseAssistant}
                    >
                      {assistantLoading ? 'Analyzing…' : 'Ask the AI teammate'}
                    </button>
                    <span className={styles.assistantHint}>
                      The assistant reviews up to {MAX_INSIGHT_PAPERS} papers from the visible results.
                    </span>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default SearchPage;
