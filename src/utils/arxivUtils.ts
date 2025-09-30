/**
 * ArXiv ID utilities for parsing, validation, and URL generation
 */

import { GoogleGenAI } from '@google/genai';

export interface ParsedArxivId {
  /** The normalized ArXiv ID string (e.g., "cs/0211011" or "1706.03762") */
  id: string;
  /** Whether the ArXiv ID is valid according to ArXiv format rules */
  isValid: boolean;
  /** The category for old format IDs (e.g., "cs", "math-ph") or null for new format */
  category: string | null;
  /** The numeric part of the ID */
  number: string | null;
  /** Whether this is an old format ID (pre-2007) */
  isOldFormat: boolean;
}

/**
 * ArXiv ID validation pattern
 * Matches:
 * - New format: YYMM.NNNNN (e.g., 1706.03762, 2301.12345)
 * - Old format: category/YYMMnnn (e.g., cs/0211011, math-ph/0506203)
 */
const ARXIV_ID_PATTERN = /^(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})$/i;

/**
 * Parse ArXiv ID from various input formats
 * @param input - String or string array from Next.js router
 * @returns Parsed ArXiv ID information
 */
export function parseArxivId(input: string | string[] | undefined): ParsedArxivId {
  let arxivId: string;
  
  if (typeof input === 'string') {
    // Single segment ID (new format like 1706.03762)
    arxivId = input;
  } else if (Array.isArray(input) && input.length > 0) {
    // Multi-segment ID (old format like cs/0211011)
    arxivId = input.join('/');
  } else {
    // Invalid or missing input
    return {
      id: '',
      isValid: false,
      category: null,
      number: null,
      isOldFormat: false
    };
  }
  
  // Validate the ID format
  const isValid = ARXIV_ID_PATTERN.test(arxivId);
  
  if (!isValid) {
    return {
      id: arxivId,
      isValid: false,
      category: null,
      number: null,
      isOldFormat: false
    };
  }
  
  // Determine if it's old or new format
  const isOldFormat = arxivId.includes('/');
  let category: string | null = null;
  let number: string | null = null;
  
  if (isOldFormat) {
    const parts = arxivId.split('/');
    category = parts[0] ?? null;
    number = parts[1] ?? null;
  } else {
    const parts = arxivId.split('.');
    number = parts.join('.');
  }
  
  return {
    id: arxivId,
    isValid: true,
    category,
    number,
    isOldFormat
  };
}

/**
 * Generate PDF URL for ArXiv paper
 * @param arxivId - The ArXiv ID (e.g., "cs/0211011" or "1706.03762")
 * @returns Full URL to the ArXiv PDF
 */
export function getArxivPdfUrl(arxivId: string): string {
  // ArXiv PDFs are served without .pdf extension for all formats
  return `https://arxiv.org/pdf/${arxivId}`;
}

/**
 * Generate PDF.js viewer URL with embedded ArXiv PDF
 * @param arxivId - The ArXiv ID (e.g., "cs/0211011" or "1706.03762")
 * @returns PDF.js viewer URL with the ArXiv PDF loaded
 */
export function getPdfViewerUrl(arxivId: string): string {
  const pdfUrl = getArxivPdfUrl(arxivId);
  // Use PDF.js viewer with proper configuration
  return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}&sidebarViewOnLoad=0&toolbarViewOnLoad=0&navpanesViewOnLoad=0&zoom=page-width`;
}

/**
 * Generate a safe filename for file storage/caching
 * @param arxivId - The ArXiv ID (e.g., "cs/0211011" or "1706.03762")
 * @returns Safe filename (e.g., "arxiv-cs-0211011" or "arxiv-1706-03762")
 */
export function getArxivFileName(arxivId: string): string {
  // Replace dots and slashes with dashes, convert to lowercase
  return `arxiv-${arxivId.replace(/[./]/g, '-').toLowerCase()}`;
}

/**
 * Get category-specific prompt context for AI interactions
 * @param category - Category code (e.g., "cs", "math-ph")
 * @returns Contextual prompt fragment for the AI to adopt appropriate expertise
 */
export function getCategoryPromptContext(category: string): string {
  const categoryContexts: Record<string, string> = {
    'cs': 'You are a Computer Science professor helping a student understand this research paper. Focus on algorithms, computational methods, software engineering principles, and theoretical computer science concepts.',
    'math': 'You are a Mathematics professor helping a student understand this research paper. Focus on mathematical proofs, theorems, equations, and mathematical reasoning.',
    'math-ph': 'You are a Mathematical Physics professor helping a student understand this research paper. Focus on the mathematical formalism, physical interpretations, and theoretical frameworks.',
    'astro-ph': 'You are an Astrophysics professor helping a student understand this research paper. Focus on astronomical observations, cosmological models, stellar physics, and observational data.',
    'cond-mat': 'You are a Condensed Matter Physics professor helping a student understand this research paper. Focus on material properties, phase transitions, quantum many-body systems, and experimental techniques.',
    'gr-qc': 'You are a General Relativity and Quantum Cosmology professor helping a student understand this research paper. Focus on spacetime geometry, gravitational theory, and cosmological models.',
    'hep-ex': 'You are a High Energy Physics (Experimental) professor helping a student understand this research paper. Focus on particle detector data, experimental methods, statistical analysis, and particle interactions.',
    'hep-lat': 'You are a High Energy Physics (Lattice) professor helping a student understand this research paper. Focus on lattice field theory, numerical simulations, and computational methods in particle physics.',
    'hep-ph': 'You are a High Energy Physics (Phenomenology) professor helping a student understand this research paper. Focus on theoretical predictions, particle physics models, and experimental implications.',
    'hep-th': 'You are a High Energy Physics (Theory) professor helping a student understand this research paper. Focus on quantum field theory, string theory, and fundamental theoretical frameworks.',
    'nucl-ex': 'You are a Nuclear Physics (Experimental) professor helping a student understand this research paper. Focus on nuclear reactions, experimental techniques, and nuclear structure.',
    'nucl-th': 'You are a Nuclear Physics (Theory) professor helping a student understand this research paper. Focus on nuclear models, theoretical calculations, and nuclear structure theory.',
    'physics': 'You are a Physics professor helping a student understand this research paper. Focus on physical principles, experimental methods, and theoretical concepts.',
    'quant-ph': 'You are a Quantum Physics professor helping a student understand this research paper. Focus on quantum mechanics, quantum information, quantum computing, and quantum phenomena.',
    'q-bio': 'You are a Quantitative Biology professor helping a student understand this research paper. Focus on biological modeling, computational biology, bioinformatics, and quantitative analysis of biological systems.',
    'q-fin': 'You are a Quantitative Finance professor helping a student understand this research paper. Focus on financial models, risk analysis, econometrics, and mathematical finance.',
    'stat': 'You are a Statistics professor helping a student understand this research paper. Focus on statistical methods, data analysis, probability theory, and statistical inference.'
  };
  
  // Return specific context if available
  if (categoryContexts[category]) {
    return categoryContexts[category];
  }
  
  // Graceful fallback for unknown categories
  const categoryName = category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return `You are a ${categoryName} expert helping a student understand this research paper. Draw upon your expertise in this field to explain concepts clearly and accurately.`;
}

/**
 * Check if a file already exists in the Gemini Files API to avoid re-uploading
 * @param fileName - The filename to check for
 * @returns Promise<boolean> - True if file exists, false otherwise
 */
export async function checkFileExists(fileName: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const files = await genAI.files.list();
    
    // Check if any file has a name that starts with our expected pattern
    // Iterate through the files using for-await loop
    for await (const file of files) {
      if (file.name?.startsWith(fileName) || file.displayName?.includes(fileName)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.warn('Error checking file existence:', error);
    return false;
  }
}
