/**
 * ArXiv search utilities for querying the arXiv API
 */

export interface ArxivSearchResult {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  updated: string;
  categories: string[];
  pdfUrl: string;
  abstractUrl: string;
  doi?: string | undefined;
  comment?: string | undefined;
}

export interface ArxivSearchResponse {
  results: ArxivSearchResult[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  query: string;
}

export interface ArxivSearchParams {
  query: string;
  start?: number;
  maxResults?: number;
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  sortOrder?: 'ascending' | 'descending';
  category?: string;
  author?: string;
  title?: string;
  abstract?: string;
  comment?: string;
  journal?: string;
  reportNumber?: string;
  all?: string;
}

/**
 * Search arXiv papers using the arXiv API
 * @param params - Search parameters
 * @returns Promise with search results
 */
export async function searchArxiv(params: ArxivSearchParams): Promise<ArxivSearchResponse> {
  const {
    query,
    start = 0,
    maxResults = 10,
    sortBy = 'relevance',
    sortOrder = 'descending',
    category,
    author,
    title,
    abstract,
    comment,
    journal,
    reportNumber,
    all
  } = params;

  // Build the search query
  let searchQuery = '';
  
  if (all) {
    searchQuery = `all:${all}`;
  } else {
    const queryParts: string[] = [];
    
    if (query) queryParts.push(`all:${query}`);
    if (author) queryParts.push(`au:${author}`);
    if (title) queryParts.push(`ti:${title}`);
    if (abstract) queryParts.push(`abs:${abstract}`);
    if (comment) queryParts.push(`co:${comment}`);
    if (journal) queryParts.push(`jr:${journal}`);
    if (reportNumber) queryParts.push(`rn:${reportNumber}`);
    if (category) queryParts.push(`cat:${category}`);
    
    searchQuery = queryParts.join(' AND ');
  }

  // Build the API URL
  const baseUrl = 'http://export.arxiv.org/api/query';
  const url = new URL(baseUrl);
  
  url.searchParams.set('search_query', searchQuery);
  url.searchParams.set('start', start.toString());
  url.searchParams.set('max_results', maxResults.toString());
  url.searchParams.set('sortBy', sortBy);
  url.searchParams.set('sortOrder', sortOrder);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'asXiv/1.0 (https://github.com/montanaflynn/asxiv)',
      },
    });

    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    return parseArxivXmlResponse(xmlText, query, start, maxResults);
  } catch (error) {
    console.error('Error searching arXiv:', error);
    throw new Error('Failed to search arXiv papers');
  }
}

/**
 * Parse ArXiv XML response into structured data
 * @param xmlText - Raw XML response from arXiv API
 * @param query - Original search query
 * @param start - Start index
 * @param maxResults - Number of results requested
 * @returns Parsed search results
 */
function parseArxivXmlResponse(
  xmlText: string,
  query: string,
  start: number,
  maxResults: number
): ArxivSearchResponse {
  // Simple XML parsing for arXiv response
  // In a production app, you might want to use a proper XML parser
  const results: ArxivSearchResult[] = [];
  
  // Extract total results from the feed - try multiple patterns
  let totalResults = 0;
  const totalResultsPatterns = [
    /<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/,
    /<totalResults>(\d+)<\/totalResults>/,
    /<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/i,
    /<totalResults>(\d+)<\/totalResults>/i,
    /<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/g,
    /<totalResults>(\d+)<\/totalResults>/g,
    /totalResults[^>]*>(\d+)</i,
    /opensearch:totalResults[^>]*>(\d+)</i
  ];
  
  for (const pattern of totalResultsPatterns) {
    const match = xmlText.match(pattern);
    if (match && match[1]) {
      totalResults = parseInt(match[1], 10);
      break;
    }
  }
  
  // If we couldn't find total results, estimate based on current results
  // This is a fallback - the actual total might be higher
  if (totalResults === 0) {
    // If we got results, assume there are more available
    // Set a reasonable estimate to enable pagination
    totalResults = Math.max(100, start + maxResults + 50);
  }

  // Extract entries
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;
  
  while ((entryMatch = entryRegex.exec(xmlText)) !== null) {
    const entryXml = entryMatch[1];
    if (!entryXml) continue;
    
    try {
      const result = parseArxivEntry(entryXml);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.warn('Error parsing arXiv entry:', error);
    }
  }

  // If we have results but no total count, estimate it
  if (totalResults === 0 && results.length > 0) {
    // If we got fewer results than requested, this might be all results
    if (results.length < maxResults) {
      totalResults = start + results.length;
    } else {
      // If we got the full page, there might be more
      // Use a more realistic estimate: if we got a full page, assume there are more
      totalResults = Math.max(start + results.length + 1, results.length * 2);
    }
  }
  
  // Ensure totalResults is at least the number of results we found
  totalResults = Math.max(totalResults, start + results.length);

  return {
    results,
    totalResults,
    startIndex: start,
    itemsPerPage: maxResults,
    query
  };
}

/**
 * Parse a single arXiv entry from XML
 * @param entryXml - XML content for a single entry
 * @returns Parsed entry or null if parsing fails
 */
function parseArxivEntry(entryXml: string): ArxivSearchResult | null {
  try {
    // Extract arXiv ID
    const idMatch = entryXml.match(/<id>http:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/);
    if (!idMatch || !idMatch[1]) return null;
    
    // Remove version number (v1, v2, etc.) from the end of the ID
    const arxivId = idMatch[1].replace(/v\d+$/, '');
    
    // Extract title
    const titleMatch = entryXml.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : 'Untitled';
    
    // Extract authors
    const authors: string[] = [];
    const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      if (authorMatch[1]) {
        authors.push(authorMatch[1].trim());
      }
    }
    
    // Extract abstract
    const abstractMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
    const abstract = abstractMatch && abstractMatch[1] ? abstractMatch[1].trim() : '';
    
    // Extract published date
    const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/);
    const published = publishedMatch && publishedMatch[1] ? publishedMatch[1] : '';
    
    // Extract updated date
    const updatedMatch = entryXml.match(/<updated>([^<]+)<\/updated>/);
    const updated = updatedMatch && updatedMatch[1] ? updatedMatch[1] : '';
    
    // Extract categories
    const categories: string[] = [];
    const categoryRegex = /<category term="([^"]+)"[^>]*\/>/g;
    let categoryMatch;
    while ((categoryMatch = categoryRegex.exec(entryXml)) !== null) {
      if (categoryMatch[1]) {
        categories.push(categoryMatch[1]);
      }
    }
    
    // Extract DOI if present
    const doiMatch = entryXml.match(/<arxiv:doi>([^<]+)<\/arxiv:doi>/);
    const doi = doiMatch && doiMatch[1] ? doiMatch[1] : undefined;
    
    // Extract comment if present
    const commentMatch = entryXml.match(/<arxiv:comment>([^<]+)<\/arxiv:comment>/);
    const comment = commentMatch && commentMatch[1] ? commentMatch[1] : undefined;
    
    return {
      id: arxivId,
      title,
      authors,
      abstract,
      published,
      updated,
      categories,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
      abstractUrl: `https://arxiv.org/abs/${arxivId}`,
      doi,
      comment
    };
  } catch (error) {
    console.warn('Error parsing arXiv entry:', error);
    return null;
  }
}

/**
 * Get popular arXiv categories for search filters
 * @returns Array of category objects with code and name
 */
export { getArxivCategories } from '@/constants/arxivCategories';

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatArxivDate(dateString: string): string {
  if (!dateString) return dateString;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 200): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Clean arXiv ID by removing version numbers
 * @param arxivId - ArXiv ID that may contain version number
 * @returns Cleaned ArXiv ID without version
 */
export function cleanArxivId(arxivId: string | string[] | undefined): string {
  if (!arxivId) return '';
  
  // Handle array case (from Next.js router)
  if (Array.isArray(arxivId)) {
    arxivId = arxivId.join('/');
  }
  
  // Ensure it's a string
  const idString = String(arxivId);
  
  return idString.replace(/v\d+$/, '');
}
