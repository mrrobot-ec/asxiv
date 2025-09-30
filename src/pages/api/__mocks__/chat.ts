import { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  arxivId: string;
  history?: ChatMessage[];
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, arxivId }: ChatRequest = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!arxivId) {
    return res.status(400).json({ error: 'arXiv ID is required' });
  }

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mock response based on the message content
  let response = '';
  
  if (message.toLowerCase().includes('summary')) {
    response = `This is a mock summary for paper ${arxivId}. The paper discusses important research findings in the field.`;
  } else if (message.toLowerCase().includes('method')) {
    response = `The methodology used in paper ${arxivId} involves advanced techniques and innovative approaches.`;
  } else if (message.toLowerCase().includes('result')) {
    response = `The results from paper ${arxivId} show significant improvements and novel insights.`;
  } else if (message.toLowerCase().includes('conclusion')) {
    response = `The conclusions of paper ${arxivId} highlight important implications for future research.`;
  } else {
    response = `I can help you understand paper ${arxivId}. You asked: "${message}". This is a mock response for testing purposes.`;
  }

  return res.status(200).json({
    response,
    arxivId,
    timestamp: new Date().toISOString(),
    model: 'mock-model'
  });
};

export default handler;
