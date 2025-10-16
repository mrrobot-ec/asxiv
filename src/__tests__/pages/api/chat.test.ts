import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/chat';

// Mock the Google Generative AI
jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn();
  const mockFilesList = jest.fn();
  const mockFilesUpload = jest.fn();
  const mockFilesGet = jest.fn();
  const mockFilesDelete = jest.fn();

  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      files: {
        list: mockFilesList,
        upload: mockFilesUpload,
        get: mockFilesGet,
        delete: mockFilesDelete,
      },
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    createUserContent: jest.fn((content) => content),
    createPartFromUri: jest.fn((uri, mimeType) => ({ uri, mimeType })),
    Type: {
      OBJECT: 'object',
      STRING: 'string',
      ARRAY: 'array',
      NUMBER: 'number',
      BOOLEAN: 'boolean',
      NULL: 'null',
    },
    // Export mocks for use in tests
    __mocks: {
      mockGenerateContent,
      mockFilesList,
      mockFilesUpload,
      mockFilesGet,
      mockFilesDelete,
    }
  };
});

// Mock arxivUtils
jest.mock('@/utils/arxivUtils', () => ({
  getArxivFileName: jest.fn(),
  checkFileExists: jest.fn(),
  getCategoryPromptContext: jest.fn(),
  parseArxivId: jest.fn(),
  getArxivPdfUrl: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('/api/chat', () => {
  let processEnv: NodeJS.ProcessEnv;
  let arxivUtils: any;
  let mockGenAI: any;
  let mockGenerateContent: jest.Mock;
  let mockFilesList: jest.Mock;
  let mockFilesUpload: jest.Mock;
  // let mockFilesGet: jest.Mock;
  let mockFilesDelete: jest.Mock;

  beforeAll(() => {
    processEnv = process.env;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...processEnv, GEMINI_API_KEY: 'test-api-key' };

           // Get the mocked functions
           arxivUtils = jest.requireMock('@/utils/arxivUtils');
           const genAIModule = jest.requireMock('@google/genai');
    mockGenAI = new genAIModule.GoogleGenAI();
    mockGenerateContent = mockGenAI.models.generateContent;
    mockFilesList = mockGenAI.files.list;
    mockFilesUpload = mockGenAI.files.upload;    
    mockFilesDelete = mockGenAI.files.delete;

    // Mock successful PDF download
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(Buffer.from('%PDF-1.4\nMock PDF content')),
    });

    // Mock successful Gemini response
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        content: 'This is a mock response about attention mechanisms.',
        suggestedQuestions: [
          { text: 'What is the main contribution?', description: 'Learn about key findings' }
        ],
        responseType: 'answer'
      })
    });

    // Mock file operations
    arxivUtils.checkFileExists.mockResolvedValue(false);
    arxivUtils.getArxivFileName.mockReturnValue('arxiv-1706-03762');
    arxivUtils.getArxivPdfUrl.mockReturnValue('https://arxiv.org/pdf/1706.03762');
    arxivUtils.getCategoryPromptContext.mockReturnValue('Context for cs');
    
    // Default mock for parseArxivId - valid ID
    arxivUtils.parseArxivId.mockReturnValue({
      id: '1706.03762',
      isValid: true,
      category: null,
      number: '1706.03762',
      isOldFormat: false
    });

    mockFilesList.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        // Empty iterator for new files
      }
    });
    mockFilesUpload.mockResolvedValue({
      name: 'files/mock-file-123',
      displayName: 'arxiv-1706-03762',
      uri: 'files/mock-file-123',
      mimeType: 'application/pdf'
    });
  });

  afterAll(() => {
    process.env = processEnv;
  });

  it('should handle POST request successfully with valid arXiv ID', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.response).toContain('attention mechanisms');
    expect(data.structured).toBeDefined();
    expect(data.structured.content).toContain('attention mechanisms');
    expect(arxivUtils.parseArxivId).toHaveBeenCalledWith('1706.03762');
  });

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData()).error).toBe('Method not allowed');
  });

  it('should return 500 for missing API key', async () => {
    process.env.GEMINI_API_KEY = '';
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'Test' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).error).toBe('GEMINI_API_KEY is not configured');
  });

  it('should return 400 for invalid request body when messages is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { arxivId: '1706.03762' }, // Missing messages
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid request body');
  });

  it('should return 400 for invalid request body when arxivId is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'Test' }] }, // Missing arxivId
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid request body');
  });

  it('should return 400 for invalid arXiv ID format', async () => {
    arxivUtils.parseArxivId.mockReturnValue({
      id: 'invalid',
      isValid: false,
      category: null,
      number: null,
      isOldFormat: false
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'Test' }],
        arxivId: 'invalid',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid ArXiv ID format: invalid');
  });

  it('should return 400 when last message is not from user', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' }
        ],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Last message must be from user');
  });

  it('should handle PDF not available (404) and return welcome message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.structured.content).toContain('PDF Not Available');
    expect(data.structured.responseType).toBe('welcome');
  });

  it('should handle PDF download failure and return 500 error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to generate response');
  });

  it('should handle invalid PDF content and return 500 error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(Buffer.from('Not a PDF')),
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to generate response');
  });

  it('should handle file too large and return 500 error', async () => {
    // Mock a large file (3MB)
    const largeBuffer = Buffer.alloc(3 * 1024 * 1024);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(largeBuffer),
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to generate response');
  });

  it('should use existing file when file already exists and not re-upload', async () => {
    arxivUtils.checkFileExists.mockResolvedValue(true);
    
    // Create an async iterable mock
    const mockFiles = [{ 
      name: 'files/mock-file-123', 
      displayName: 'arxiv-1706-03762',
      uri: 'files/mock-file-123',
      mimeType: 'application/pdf'
    }];
    
    mockFilesList.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      }
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(mockFilesUpload).not.toHaveBeenCalled();
    expect(arxivUtils.checkFileExists).toHaveBeenCalledWith('arxiv-1706-03762');
  });

  it('should handle follow-up messages without re-uploading PDF', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [
          { role: 'user', content: 'What is this paper about?' },
          { role: 'assistant', content: 'This paper is about attention mechanisms.' },
          { role: 'user', content: 'Tell me more about the results' }
        ],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(mockFilesUpload).not.toHaveBeenCalled();
  });

  it('should handle welcome message request and return welcome response', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'welcome message' }],
        arxivId: '1706.03762',
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        content: 'Welcome! This paper is about attention mechanisms.',
        suggestedQuestions: [
          { text: 'What is the main contribution?', description: 'Learn about key findings' },
          { text: 'What methodology was used?', description: 'Understand the approach' }
        ],
        responseType: 'welcome'
      })
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.structured.responseType).toBe('welcome');
  });

  it('should handle old format arXiv IDs correctly', async () => {
    arxivUtils.parseArxivId.mockReturnValue({
      id: 'cs/0211011',
      isValid: true,
      category: 'cs',
      number: '0211011',
      isOldFormat: true
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: 'cs/0211011',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(arxivUtils.getArxivFileName).toHaveBeenCalledWith('cs/0211011');
  });

  it('should handle Gemini API errors and return 500 error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini API Error'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to generate response');
  });

  it('should handle invalid JSON response from Gemini and return 500 error', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Invalid JSON response'
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to generate response');
  });

  it('should handle empty response from Gemini and return 500 error', async () => {
    mockGenerateContent.mockResolvedValue({
      text: ''
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to generate response');
  });

  it('should handle invalid model configuration and return 500 error', async () => {
    process.env.GEMINI_MODEL = 'invalid-model';

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to generate response');
  });

  it('should keep uploaded file for reuse after processing', async () => {
    const mockFile = {
      name: 'files/mock-file-123',
      displayName: 'arxiv-1706-03762',
      uri: 'files/mock-file-123',
      mimeType: 'application/pdf'
    };
    mockFilesUpload.mockResolvedValue(mockFile);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is this paper about?' }],
        arxivId: '1706.03762',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    // Files are now kept for reuse, not deleted immediately
    expect(mockFilesDelete).not.toHaveBeenCalled();
  });

});
