const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/utils/arxivUtils$': '<rootDir>/src/utils/__mocks__/arxivUtils.ts',
    '^@/pages/api/chat$': '<rootDir>/src/pages/api/__mocks__/chat.ts',
    '^@/utils/arxivSearch$': '<rootDir>/src/utils/__mocks__/arxivSearch.ts',
    '^@google/genai$': '<rootDir>/src/utils/__mocks__/googleGenai.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-gfm|rehype-raw|unified|bail|is-plain-obj|trough|vfile|vfile-message|unist-util-stringify-position|mdast-util-from-markdown|mdast-util-to-markdown|mdast-util-to-hast|hast-util-to-html|hast-util-sanitize|hast-util-is-element|hast-util-has-property|hast-util-heading|hast-util-to-text|hast-util-whitespace|hastscript|web-namespaces|zwitch|longest-streak|ccount|micromark-util-decode-numeric-character-reference|micromark-util-decode-string|micromark-util-encode|micromark-util-normalize-identifier|micromark-util-resolve-all|micromark-util-sanitize-uri|micromark-util-subtokenize|micromark-util-symbol|micromark-util-types|micromark-util-chunked|micromark-util-classify-character|micromark-util-combine-extensions|micromark-util-html-tag-name|micromark-util-decode-numeric-character-reference|micromark-util-encode|micromark-util-normalize-identifier|micromark-util-resolve-all|micromark-util-sanitize-uri|micromark-util-subtokenize|micromark-util-symbol|micromark-util-types|micromark-util-chunked|micromark-util-classify-character|micromark-util-combine-extensions|micromark-util-html-tag-name|micromark-util-decode-numeric-character-reference|micromark-util-encode|micromark-util-normalize-identifier|micromark-util-resolve-all|micromark-util-sanitize-uri|micromark-util-subtokenize|micromark-util-symbol|micromark-util-types|micromark-util-chunked|micromark-util-classify-character|micromark-util-combine-extensions|micromark-util-html-tag-name|@google/genai|@google/generative-ai|remark-gfm|rehype-raw|unified|bail|is-plain-obj|trough|vfile|vfile-message|unist-util-stringify-position|mdast-util-from-markdown|mdast-util-to-markdown|mdast-util-to-hast|hast-util-to-html|hast-util-sanitize|hast-util-is-element|hast-util-has-property|hast-util-heading|hast-util-to-text|hast-util-whitespace|hastscript|web-namespaces|zwitch|longest-streak|ccount|micromark-util-decode-numeric-character-reference|micromark-util-decode-string|micromark-util-encode|micromark-util-normalize-identifier|micromark-util-resolve-all|micromark-util-sanitize-uri|micromark-util-subtokenize|micromark-util-symbol|micromark-util-types|micromark-util-chunked|micromark-util-classify-character|micromark-util-combine-extensions|micromark-util-html-tag-name)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
