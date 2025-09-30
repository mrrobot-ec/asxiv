export const parseArxivId = (input: string) => {
  return {
    id: input,
    version: 'v1',
    isValid: true
  };
};

export const getPdfViewerUrl = (arxivId: string) => {
  return `https://arxiv.org/pdf/${arxivId}`;
};

export const cleanArxivId = (input: string) => {
  return input.replace(/[^0-9.]/g, '');
};

export const formatArxivDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export { getArxivCategories } from '@/constants/arxivCategories';
