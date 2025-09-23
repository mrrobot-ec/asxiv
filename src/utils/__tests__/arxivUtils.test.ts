import {
  parseArxivId,
  getArxivPdfUrl,
  getPdfViewerUrl,
  getArxivFileName,
  getArxivAbstractUrl,
  isValidArxivId,
  extractArxivIdFromUrl,
  formatArxivIdForDisplay,
  getCategoryName,
  getCategoryPromptContext,
  ARXIV_ID_PATTERN
} from '../arxivUtils';

describe('ArXiv Utils', () => {
  describe('parseArxivId', () => {
    it('should parse new format ArXiv ID (string input)', () => {
      const result = parseArxivId('1706.03762');
      expect(result).toEqual({
        id: '1706.03762',
        isValid: true,
        category: null,
        number: '1706.03762',
        isOldFormat: false
      });
    });

    it('should parse old format ArXiv ID (array input)', () => {
      const result = parseArxivId(['cs', '0211011']);
      expect(result).toEqual({
        id: 'cs/0211011',
        isValid: true,
        category: 'cs',
        number: '0211011',
        isOldFormat: true
      });
    });

    it('should parse math-ph category ID', () => {
      const result = parseArxivId(['math-ph', '0506203']);
      expect(result).toEqual({
        id: 'math-ph/0506203',
        isValid: true,
        category: 'math-ph',
        number: '0506203',
        isOldFormat: true
      });
    });

    it('should handle invalid string input', () => {
      const result = parseArxivId('invalid-id');
      expect(result).toEqual({
        id: 'invalid-id',
        isValid: false,
        category: null,
        number: null,
        isOldFormat: false
      });
    });

    it('should handle empty array input', () => {
      const result = parseArxivId([]);
      expect(result).toEqual({
        id: '',
        isValid: false,
        category: null,
        number: null,
        isOldFormat: false
      });
    });

    it('should handle undefined input', () => {
      const result = parseArxivId(undefined);
      expect(result).toEqual({
        id: '',
        isValid: false,
        category: null,
        number: null,
        isOldFormat: false
      });
    });
  });

  describe('ARXIV_ID_PATTERN', () => {
    it('should validate new format ArXiv IDs', () => {
      expect(ARXIV_ID_PATTERN.test('1706.03762')).toBe(true);
      expect(ARXIV_ID_PATTERN.test('2301.12345')).toBe(true);
      expect(ARXIV_ID_PATTERN.test('0912.1234')).toBe(true);
      expect(ARXIV_ID_PATTERN.test('2023.12345')).toBe(true);
    });

    it('should validate old format ArXiv IDs', () => {
      expect(ARXIV_ID_PATTERN.test('cs/0211011')).toBe(true);
      expect(ARXIV_ID_PATTERN.test('math-ph/0506203')).toBe(true);
      expect(ARXIV_ID_PATTERN.test('astro-ph/1234567')).toBe(true);
      expect(ARXIV_ID_PATTERN.test('cond-mat/9901001')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(ARXIV_ID_PATTERN.test('invalid-format')).toBe(false);
      expect(ARXIV_ID_PATTERN.test('123.45')).toBe(false);
      expect(ARXIV_ID_PATTERN.test('cs/123')).toBe(false);
      expect(ARXIV_ID_PATTERN.test('2023.123456')).toBe(false);
      expect(ARXIV_ID_PATTERN.test('cs/12345678')).toBe(false);
    });
  });

  describe('getArxivPdfUrl', () => {
    it('should generate correct PDF URL for new format ID', () => {
      expect(getArxivPdfUrl('1706.03762')).toBe('https://arxiv.org/pdf/1706.03762');
    });

    it('should generate correct PDF URL for old format ID', () => {
      expect(getArxivPdfUrl('cs/0211011')).toBe('https://arxiv.org/pdf/cs/0211011');
    });
  });

  describe('getPdfViewerUrl', () => {
    it('should generate correct PDF.js viewer URL for new format ID', () => {
      const result = getPdfViewerUrl('1706.03762');
      const expectedUrl = encodeURIComponent('https://arxiv.org/pdf/1706.03762');
      expect(result).toBe(
        `https://mozilla.github.io/pdf.js/web/viewer.html?file=${expectedUrl}&sidebarViewOnLoad=0`
      );
    });

    it('should generate correct PDF.js viewer URL for old format ID', () => {
      const result = getPdfViewerUrl('cs/0211011');
      const expectedUrl = encodeURIComponent('https://arxiv.org/pdf/cs/0211011');
      expect(result).toBe(
        `https://mozilla.github.io/pdf.js/web/viewer.html?file=${expectedUrl}&sidebarViewOnLoad=0`
      );
    });
  });

  describe('getArxivFileName', () => {
    it('should generate safe filename for new format ID', () => {
      expect(getArxivFileName('1706.03762')).toBe('arxiv-1706-03762');
    });

    it('should generate safe filename for old format ID', () => {
      expect(getArxivFileName('cs/0211011')).toBe('arxiv-cs-0211011');
    });

    it('should handle complex category names', () => {
      expect(getArxivFileName('math-ph/0506203')).toBe('arxiv-math-ph-0506203');
    });
  });

  describe('getArxivAbstractUrl', () => {
    it('should generate correct abstract URL for new format ID', () => {
      expect(getArxivAbstractUrl('1706.03762')).toBe('https://arxiv.org/abs/1706.03762');
    });

    it('should generate correct abstract URL for old format ID', () => {
      expect(getArxivAbstractUrl('cs/0211011')).toBe('https://arxiv.org/abs/cs/0211011');
    });
  });

  describe('isValidArxivId', () => {
    it('should return true for valid IDs', () => {
      expect(isValidArxivId('1706.03762')).toBe(true);
      expect(isValidArxivId('cs/0211011')).toBe(true);
      expect(isValidArxivId('math-ph/0506203')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidArxivId('invalid')).toBe(false);
      expect(isValidArxivId('123.45')).toBe(false);
      expect(isValidArxivId('cs/123')).toBe(false);
    });
  });

  describe('extractArxivIdFromUrl', () => {
    it('should extract ArXiv ID from various URL formats', () => {
      expect(extractArxivIdFromUrl('https://arxiv.org/abs/1706.03762')).toBe('1706.03762');
      expect(extractArxivIdFromUrl('https://arxiv.org/pdf/cs/0211011')).toBe('cs/0211011');
      expect(extractArxivIdFromUrl('http://localhost:3000/pdf/math-ph/0506203')).toBe('math-ph/0506203');
    });

    it('should return null for URLs without valid ArXiv IDs', () => {
      expect(extractArxivIdFromUrl('https://example.com/invalid')).toBe(null);
      expect(extractArxivIdFromUrl('https://arxiv.org/abs/invalid-id')).toBe(null);
    });

    it('should handle URLs with query parameters and fragments', () => {
      expect(extractArxivIdFromUrl('https://arxiv.org/abs/1706.03762?context=cs')).toBe('1706.03762');
      expect(extractArxivIdFromUrl('https://arxiv.org/abs/cs/0211011#section1')).toBe('cs/0211011');
    });
  });

  describe('formatArxivIdForDisplay', () => {
    it('should format valid IDs with arXiv prefix', () => {
      expect(formatArxivIdForDisplay('1706.03762')).toBe('arXiv:1706.03762');
      expect(formatArxivIdForDisplay('cs/0211011')).toBe('arXiv:cs/0211011');
    });

    it('should return original string for invalid IDs', () => {
      expect(formatArxivIdForDisplay('invalid-id')).toBe('invalid-id');
    });
  });

  describe('getCategoryName', () => {
    it('should return full names for known categories', () => {
      expect(getCategoryName('cs')).toBe('Computer Science');
      expect(getCategoryName('math-ph')).toBe('Mathematical Physics');
      expect(getCategoryName('astro-ph')).toBe('Astrophysics');
      expect(getCategoryName('quant-ph')).toBe('Quantum Physics');
    });

    it('should format unknown categories gracefully', () => {
      expect(getCategoryName('new-category')).toBe('New Category');
      expect(getCategoryName('bio-physics')).toBe('Bio Physics');
      expect(getCategoryName('test')).toBe('Test');
    });

    it('should handle single-word unknown categories', () => {
      expect(getCategoryName('unknown')).toBe('Unknown');
    });
  });

  describe('getCategoryPromptContext', () => {
    it('should return specific contexts for known categories', () => {
      const csContext = getCategoryPromptContext('cs');
      expect(csContext).toContain('Computer Science professor');
      expect(csContext).toContain('algorithms');
      expect(csContext).toContain('computational methods');

      const mathContext = getCategoryPromptContext('math');
      expect(mathContext).toContain('Mathematics professor');
      expect(mathContext).toContain('mathematical proofs');

      const quantPhContext = getCategoryPromptContext('quant-ph');
      expect(quantPhContext).toContain('Quantum Physics professor');
      expect(quantPhContext).toContain('quantum mechanics');
    });

    it('should provide graceful fallback for unknown categories', () => {
      const context = getCategoryPromptContext('new-category');
      expect(context).toContain('New Category expert');
      expect(context).toContain('helping a student understand');
      expect(context).toContain('Draw upon your expertise');
    });

    it('should handle single-word categories in fallback', () => {
      const context = getCategoryPromptContext('biology');
      expect(context).toContain('Biology expert');
    });

    it('should handle hyphenated categories in fallback', () => {
      const context = getCategoryPromptContext('bio-physics');
      expect(context).toContain('Bio Physics expert');
    });
  });
});