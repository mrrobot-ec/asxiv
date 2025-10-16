import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/insights';
import { mockGenerateContent } from '@/utils/__mocks__/googleGenai';

describe('/api/insights', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        overview: 'Mock overview',
        recommendedPapers: [],
        followUpQuestions: [],
        paperInsights: []
      })
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 405 when request method is not POST', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('should return 500 when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const { req, res } = createMocks({
      method: 'POST'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ error: 'GEMINI_API_KEY is not configured' });
  });

  it('should return 400 when request payload is incomplete', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'attention is all you need'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Request must include query, goal, and at least one paper'
    });
  });

  it('should return AI insights when Gemini responds successfully', async () => {
    const responsePayload = {
      overview: 'Focus on transformer architectures.',
      recommendedPapers: [
        {
          paperId: '1706.03762',
          title: 'Attention Is All You Need',
          reason: 'Introduces the transformer model.'
        }
      ],
      followUpQuestions: ['Compare with recurrent approaches'],
      paperInsights: [
        {
          paperId: '1706.03762',
          insight: 'Introduces the transformer model.'
        }
      ]
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(responsePayload)
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'transformers',
        goal: 'Find introductory transformer papers',
        papers: [
          {
            id: '1706.03762',
            title: 'Attention Is All You Need',
            abstract: 'We propose a new simple network architecture...',
            authors: ['Ashish Vaswani'],
            published: '2017-06-12',
            categories: ['cs.CL']
          }
        ]
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.overview).toBe('Focus on transformer architectures.');
    expect(data.recommendedPapers).toHaveLength(1);
    expect(data.paperInsights['1706.03762']).toBe('Introduces the transformer model.');
  });

  it('should return 502 when Gemini response cannot be parsed', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'not-json'
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'transformers',
        goal: 'Find introductory transformer papers',
        papers: [
          {
            id: '1706.03762',
            title: 'Attention Is All You Need',
            abstract: 'We propose a new simple network architecture...',
            authors: ['Ashish Vaswani'],
            published: '2017-06-12',
            categories: ['cs.CL']
          }
        ]
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(502);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Failed to parse AI response' });
  });
});
