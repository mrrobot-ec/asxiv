export interface ArxivSearchResult {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  pdfUrl: string;
  abstractUrl: string;
  categories: string[];
  abstract: string;
}

export interface ArxivSearchResponse {
  results: ArxivSearchResult[];
  totalResults: number;
  start: number;
  maxResults: number;
}

export { getArxivCategories } from '@/constants/arxivCategories';

export const formatArxivDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const cleanArxivId = (input: string) => {
  return input.replace(/[^0-9.]/g, '');
};

export const searchArxiv = async (
  query: string,
  start: number = 0,
  maxResults: number = 10,
  ..._rest: unknown[] // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<ArxivSearchResponse> => {
  // Mock implementation
  const mockResults: ArxivSearchResult[] = [
    {
      id: '1706.03762',
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
      summary: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
      published: '2017-06-12T15:00:00Z',
      pdfUrl: 'https://arxiv.org/pdf/1706.03762',
      abstractUrl: 'https://arxiv.org/abs/1706.03762',
      categories: ['cs.CL', 'cs.LG'],
      abstract: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.'
    }
  ];

  return {
    results: mockResults,
    totalResults: 1,
    start,
    maxResults
  };
};

export const parseArxivXmlResponse = async (xmlText: string, query: string, start: number, maxResults: number): Promise<ArxivSearchResponse> => {
  return await searchArxiv(query, start, maxResults);
};
