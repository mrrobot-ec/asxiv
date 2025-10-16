import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/search';

// Mock fetch
global.fetch = jest.fn();

describe('/api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });

  it('should return 400 for missing query parameter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Query parameter is required'
    });
  });

  it('should return 400 for empty query parameter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { q: '' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Query parameter is required'
    });
  });

  it('should return 500 when arXiv API fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'machine learning' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to search arXiv papers'
    });
  });

  it('should return search results successfully', async () => {
    const mockArxivResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">10</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/1706.03762v1</id>
    <title>Attention Is All You Need</title>
    <summary>We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.</summary>
    <published>2017-06-12T15:00:00Z</published>
    <author><name>Ashish Vaswani</name></author>
  </entry>
</feed>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockArxivResponse
    });

    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'attention' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.results).toHaveLength(1);
    expect(data.results[0].title).toBe('Attention Is All You Need');
    expect(data.totalResults).toBe(10);
  });

  it('should handle additional search parameters', async () => {
    const mockArxivResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">0</opensearch:totalResults>
</feed>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockArxivResponse
    });

    const { req, res } = createMocks({
      method: 'GET',
      query: { 
        q: 'machine learning',
        category: 'cs.AI',
        author: 'John Doe',
        title: 'Deep Learning',
        abstract: 'neural networks',
        sortBy: 'lastUpdatedDate',
        sortOrder: 'ascending',
        start: '0',
        maxResults: '10'
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('search_query=all%3Amachine+learning');
    expect(fetchCall).toContain('cat%3Acs.AI');
    expect(fetchCall).toContain('au%3AJohn+Doe');
    expect(fetchCall).toContain('ti%3ADeep+Learning');
    expect(fetchCall).toContain('abs%3Aneural+networks');
    expect(fetchCall).toContain('sortBy=lastUpdatedDate');
    expect(fetchCall).toContain('sortOrder=ascending');
  });
});
