import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, createUserContent, Type } from '@google/genai';
import { ArxivSearchResult } from '@/utils/arxivSearch';

interface InsightsRequest {
  query: string;
  goal: string;
  papers: Pick<ArxivSearchResult, 'id' | 'title' | 'abstract' | 'authors' | 'published' | 'categories'>[];
}

interface RawPaperInsight {
  paperId: string;
  insight: string;
}

interface InsightsResponse {
  overview: string;
  recommendedPapers: Array<{
    paperId: string;
    title: string;
    reason: string;
  }>;
  followUpQuestions?: string[];
  paperInsights?: RawPaperInsight[] | Record<string, string>;
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const insightsSchema = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.STRING,
      description: 'A concise summary that connects the research goal to the supplied papers'
    },
    recommendedPapers: {
      type: Type.ARRAY,
      description: 'Ordered list of papers that best address the researcher goal',
      items: {
        type: Type.OBJECT,
        properties: {
          paperId: {
            type: Type.STRING,
            description: 'ArXiv identifier of the paper'
          },
          title: {
            type: Type.STRING,
            description: 'Paper title copied verbatim from the input'
          },
          reason: {
            type: Type.STRING,
            description: 'Brief rationale for why this paper helps with the stated goal'
          }
        },
        required: ['paperId', 'title', 'reason'],
        propertyOrdering: ['paperId', 'title', 'reason']
      }
    },
    paperInsights: {
      type: Type.ARRAY,
      description: 'Optional per-paper insight snippets for specific papers',
      items: {
        type: Type.OBJECT,
        properties: {
          paperId: {
            type: Type.STRING,
            description: 'ArXiv identifier for the insight'
          },
          insight: {
            type: Type.STRING,
            description: 'Short explanation tailored to the paper'
          }
        },
        required: ['paperId', 'insight'],
        propertyOrdering: ['paperId', 'insight']
      }
    },
    followUpQuestions: {
      type: Type.ARRAY,
      description: 'Optional short questions the researcher could ask next',
      items: {
        type: Type.STRING
      }
    }
  },
  required: ['overview', 'recommendedPapers'],
  propertyOrdering: ['overview', 'recommendedPapers', 'paperInsights', 'followUpQuestions']
};

function buildPrompt(payload: InsightsRequest): string {
  const { query, goal, papers } = payload;

  const paperSummaries = papers
    .map((paper, index) => {
      const authorList = paper.authors.join(', ');
      const categories = paper.categories.join(', ');
      return `${index + 1}. [${paper.id}]
Title: ${paper.title}
Authors: ${authorList}
Published: ${paper.published}
Categories: ${categories}
Abstract: ${paper.abstract}`;
    })
    .join('\n\n');

  return `You are an AI research teammate helping a user analyse arXiv papers.

SEARCH QUERY: ${query}
RESEARCH GOAL: ${goal}

PAPERS TO REVIEW:
${paperSummaries}

Instructions:
- Consider the research goal and highlight which papers help the user satisfy it.
- Respond with concise language that a researcher can scan quickly.
- Prioritise relevance and actionable insight over generic summaries.
- If multiple papers cover similar angles, explain how they differ.
- Always include the paperId you were given; do not invent new IDs.
- Only reference the provided papers.
`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const { query, goal, papers }: InsightsRequest = req.body;

    if (!query || !goal || !Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: 'Request must include query, goal, and at least one paper' });
    }

    const prompt = buildPrompt({ query, goal, papers });
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const result = await genAI.models.generateContent({
      model,
      contents: [createUserContent([prompt])],
      config: {
        responseMimeType: 'application/json',
        responseSchema: insightsSchema
      }
    });

    const text = result.text;
    if (!text) {
      return res.status(502).json({ error: 'No response received from Gemini API' });
    }

    let payload: InsightsResponse;
    try {
      payload = JSON.parse(text) as InsightsResponse;
    } catch (error) {
      console.error('Insights API: failed to parse AI response', error);
      return res.status(502).json({ error: 'Failed to parse AI response' });
    }

    const insightMap: Record<string, string> = {};
    if (Array.isArray(payload.paperInsights)) {
      payload.paperInsights.forEach((entry) => {
        if (entry && typeof entry === 'object' && 'paperId' in entry && 'insight' in entry) {
          const { paperId, insight } = entry as RawPaperInsight;
          if (paperId && typeof paperId === 'string' && typeof insight === 'string') {
            insightMap[paperId] = insight;
          }
        }
      });
    } else if (payload.paperInsights && typeof payload.paperInsights === 'object') {
      Object.entries(payload.paperInsights).forEach(([paperId, insight]) => {
        if (typeof paperId === 'string' && typeof insight === 'string') {
          insightMap[paperId] = insight;
        }
      });
    }

    payload.recommendedPapers.forEach((item) => {
      if (!insightMap[item.paperId]) {
        insightMap[item.paperId] = item.reason;
      }
    });

    res.status(200).json({
      overview: payload.overview,
      recommendedPapers: payload.recommendedPapers,
      followUpQuestions: payload.followUpQuestions ?? [],
      paperInsights: insightMap
    });
  } catch (error) {
    console.error('Insights API: unexpected error', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
}
