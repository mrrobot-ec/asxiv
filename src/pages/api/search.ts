import { NextApiRequest, NextApiResponse } from 'next';
import { searchArxiv, ArxivSearchParams } from '@/utils/arxivSearch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      q: query,
      start = '0',
      maxResults = '10',
      sortBy = 'relevance',
      sortOrder = 'descending',
      category,
      author,
      title,
      abstract,
      comment,
      journal,
      reportNumber,
      all
    } = req.query;

    if (!query && !all) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const searchParams: ArxivSearchParams = {
      query: query as string,
      start: parseInt(start as string, 10),
      maxResults: parseInt(maxResults as string, 10),
      sortBy: sortBy as 'relevance' | 'lastUpdatedDate' | 'submittedDate',
      sortOrder: sortOrder as 'ascending' | 'descending',
      category: category as string,
      author: author as string,
      title: title as string,
      abstract: abstract as string,
      comment: comment as string,
      journal: journal as string,
      reportNumber: reportNumber as string,
      all: all as string
    };

    if (Number.isNaN(searchParams.start!) || searchParams.start! < 0) {
      return res.status(400).json({ error: 'Start index must be a non-negative number' });
    }

    if (
      Number.isNaN(searchParams.maxResults!) ||
      searchParams.maxResults! < 1 ||
      searchParams.maxResults! > 200
    ) {
      return res.status(400).json({ error: 'Max results must be between 1 and 200' });
    }

    const results = await searchArxiv(searchParams);
    res.status(200).json(results);
  } catch (error) {
    console.error('Search API: failed to search arXiv', error);
    res.status(500).json({ error: 'Failed to search arXiv papers' });
  }
}
