import { cleanArxivId, formatArxivDate, truncateText } from '../arxivSearch';

describe('arxivSearch utilities', () => {
  describe('cleanArxivId', () => {
    it('should remove version numbers from arXiv IDs', () => {
      expect(cleanArxivId('1706.03762v1')).toBe('1706.03762');
      expect(cleanArxivId('1706.03762v2')).toBe('1706.03762');
      expect(cleanArxivId('cs/0211011v1')).toBe('cs/0211011');
      expect(cleanArxivId('math-ph/0506203v3')).toBe('math-ph/0506203');
    });

    it('should not affect IDs without version numbers', () => {
      expect(cleanArxivId('1706.03762')).toBe('1706.03762');
      expect(cleanArxivId('cs/0211011')).toBe('cs/0211011');
      expect(cleanArxivId('math-ph/0506203')).toBe('math-ph/0506203');
    });

    it('should handle edge cases', () => {
      expect(cleanArxivId('')).toBe('');
      expect(cleanArxivId('v1')).toBe('');
      expect(cleanArxivId('1706.03762v')).toBe('1706.03762v');
    });
  });

  describe('formatArxivDate', () => {
    it('should format valid ISO date strings', () => {
      const dateString = '2023-06-15T10:30:00Z';
      const formatted = formatArxivDate(dateString);
      expect(formatted).toMatch(/Jun 15, 2023/);
    });

    it('should handle invalid date strings gracefully', () => {
      expect(formatArxivDate('invalid-date')).toBe('invalid-date');
      expect(formatArxivDate('')).toBe('');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated because it exceeds the maximum length';
      const truncated = truncateText(longText, 20);
      expect(truncated).toBe('This is a very long...');
      expect(truncated.length).toBe(22); // 20 + '...' (trimmed)
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      const truncated = truncateText(shortText, 20);
      expect(truncated).toBe('Short text');
    });

    it('should use default max length', () => {
      const longText = 'A'.repeat(300);
      const truncated = truncateText(longText);
      expect(truncated.length).toBe(203); // 200 + '...'
    });
  });
});
