import { 
  parseArxivId, 
  getPdfViewerUrl, 
  getArxivPdfUrl,
  getArxivFileName,
  getCategoryPromptContext,
  checkFileExists
} from '../arxivUtils';

describe('arxivUtils', () => {
  describe('parseArxivId', () => {
    it('should parse valid new format arXiv ID and return correct structure', () => {
      const result = parseArxivId('1706.03762');
      expect(result).toEqual({
        id: '1706.03762',
        isValid: true,
        category: null,
        number: '1706.03762',
        isOldFormat: false
      });
    });

    it('should parse valid old format arXiv ID with category and number', () => {
      const result = parseArxivId('cs/0211011');
      expect(result).toEqual({
        id: 'cs/0211011',
        isValid: true,
        category: 'cs',
        number: '0211011',
        isOldFormat: true
      });
    });

    it('should return invalid result for malformed arXiv ID', () => {
      const result = parseArxivId('invalid-id');
      expect(result).toEqual({
        id: 'invalid-id',
        isValid: false,
        category: null,
        number: null,
        isOldFormat: false
      });
    });

    it('should return invalid result for empty string input', () => {
      const result = parseArxivId('');
      expect(result).toEqual({
        id: '',
        isValid: false,
        category: null,
        number: null,
        isOldFormat: false
      });
    });

    it('should return invalid result for undefined input', () => {
      const result = parseArxivId(undefined);
      expect(result).toEqual({
        id: '',
        isValid: false,
        category: null,
        number: null,
        isOldFormat: false
      });
    });

    it('should parse array input as old format arXiv ID', () => {
      const result = parseArxivId(['cs', '0211011']);
      expect(result).toEqual({
        id: 'cs/0211011',
        isValid: true,
        category: 'cs',
        number: '0211011',
        isOldFormat: true
      });
    });
  });

  describe('getPdfViewerUrl', () => {
    it('should generate correct PDF.js viewer URL for new format arXiv ID', () => {
      const url = getPdfViewerUrl('1706.03762');
      expect(url).toContain('mozilla.github.io/pdf.js/web/viewer.html');
      expect(url).toContain('file=');
      expect(url).toContain('1706.03762');
    });

    it('should generate correct PDF.js viewer URL for old format arXiv ID', () => {
      const url = getPdfViewerUrl('cs/0211011');
      expect(url).toContain('mozilla.github.io/pdf.js/web/viewer.html');
      expect(url).toContain('file=');
      expect(url).toContain('cs%2F0211011'); // URL-encoded version
    });
  });

  describe('getArxivPdfUrl', () => {
    it('should generate correct arXiv PDF URL for new format ID', () => {
      const url = getArxivPdfUrl('1706.03762');
      expect(url).toBe('https://arxiv.org/pdf/1706.03762');
    });

    it('should generate correct arXiv PDF URL for old format ID', () => {
      const url = getArxivPdfUrl('cs/0211011');
      expect(url).toBe('https://arxiv.org/pdf/cs/0211011');
    });
  });

  describe('getArxivFileName', () => {
    it('should generate safe filename for new format arXiv ID', () => {
      const filename = getArxivFileName('1706.03762');
      expect(filename).toBe('arxiv-1706-03762');
    });

    it('should generate safe filename for old format arXiv ID', () => {
      const filename = getArxivFileName('cs/0211011');
      expect(filename).toBe('arxiv-cs-0211011');
    });
  });

  describe('getCategoryPromptContext', () => {
    it('should return specific context for known arXiv categories', () => {
      const context = getCategoryPromptContext('cs');
      expect(context).toContain('Computer Science professor');
    });

    it('should return fallback context for unknown categories', () => {
      const context = getCategoryPromptContext('unknown');
      expect(context).toContain('expert helping a student');
    });
  });

  describe('checkFileExists', () => {
    it('should be a callable function', () => {
      expect(typeof checkFileExists).toBe('function');
    });
  });
});
