export const mockGenerateContent = jest.fn(async () => ({
  text: JSON.stringify({
    overview: 'Mock overview',
    recommendedPapers: [],
    followUpQuestions: [],
    paperInsights: []
  })
}));

const asyncIterator = async function* () {
  // Empty async iterator used by tests that iterate over Gemini files
};

export class GoogleGenAI {
  models = {
    generateContent: mockGenerateContent
  };

  files = {
    list: jest.fn(asyncIterator),
    upload: jest.fn(async () => ({ name: 'mock-file', uri: 'mock://file', mimeType: 'application/pdf' })),
    get: jest.fn(async () => ({})),
    delete: jest.fn(async () => ({}))
  };

  constructor(_config: { apiKey: string }) {
    void _config;
  }
}

export const GoogleGenerativeAI = GoogleGenAI;

export const createUserContent = jest.fn((content: unknown) => content);
export const createPartFromUri = jest.fn((uri: string, mimeType: string) => ({ uri, mimeType }));

export const Type = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  NULL: 'null'
};
