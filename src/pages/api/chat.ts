import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, createUserContent, createPartFromUri, Type } from '@google/genai';
import { StructuredChatResponse, ChatApiResponse } from '@/types/chat';
import { parseArxivId, getArxivPdfUrl, getArxivFileName, getCategoryPromptContext } from '@/utils/arxivUtils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  arxivId: string;
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Define the JSON schema for structured responses
const structuredResponseSchema = {
  type: Type.OBJECT,
  properties: {
    content: {
      type: Type.STRING,
      description: 'Main response content in markdown format'
    },
    suggestedQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: 'The suggested question text'
          },
          description: {
            type: Type.STRING,
            description: 'Optional description of what this question explores'
          }
        },
        required: ['text'],
        propertyOrdering: ['text', 'description']
      },
      description: 'Context-aware suggested questions based on current conversation'
    },
    responseType: {
      type: Type.STRING,
      enum: ['welcome', 'answer', 'clarification', 'error'],
      description: 'Type of response for UI handling'
    }
  },
  required: ['content', 'responseType'],
  propertyOrdering: ['content', 'suggestedQuestions', 'responseType']
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const { messages, arxivId }: ChatRequest = req.body;
    
    if (!messages || !Array.isArray(messages) || !arxivId) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Parse and validate ArXiv ID
    const parsed = parseArxivId(arxivId);
    if (!parsed.isValid) {
      return res.status(400).json({ error: `Invalid ArXiv ID format: ${arxivId}` });
    }
    
    // Download PDF and send content directly
    const pdfUrl = getArxivPdfUrl(parsed.id);

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' });
    }

    // Build conversation history for context
    let conversationHistory = '';
    if (messages.length > 1) {
      conversationHistory = messages.slice(0, -1)
        .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      conversationHistory += '\n\n---\n\n';
    }

    // Determine if this is the first message (no conversation history)
    const isFirstMessage = messages.length === 1;
    
    let contents;
    
    if (isFirstMessage) {
      // Upload PDF to Gemini Files API
      // Download PDF first
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // Validate that it's actually a PDF
      const pdfHeader = Buffer.from(pdfBuffer.slice(0, 4)).toString();
      
      if (!pdfHeader.startsWith('%PDF')) {
        throw new Error('Downloaded content is not a valid PDF file');
      }

      // Check file size
      const fileSizeMB = pdfBuffer.byteLength / (1024 * 1024);
      
      if (fileSizeMB > 2000) { // Files API has higher limits
        throw new Error(`PDF file too large (${fileSizeMB.toFixed(2)} MB). Maximum size is ~2GB`);
      }
      
      // Check if file already exists to avoid re-uploading
      const fileName = getArxivFileName(parsed.id);
      let uploadedFile;
      
      try {
        // Try to get existing file first
        uploadedFile = await genAI.files.get({ name: `files/${fileName}` });
      } catch {
        // File doesn't exist, try to upload it
        try {
          const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
          uploadedFile = await genAI.files.upload({
            file: pdfBlob,
            config: {
              mimeType: 'application/pdf',
              name: fileName,
              displayName: `arXiv-${parsed.id}.pdf`
            }
          });
        } catch (uploadError: unknown) {
          // If upload fails because file already exists, try to get it
          if (uploadError instanceof Error && uploadError.message && uploadError.message.includes('already exists')) {
            uploadedFile = await genAI.files.get({ name: `files/${fileName}` });
          } else {
            throw uploadError;
          }
        }
      }

      // First message: include PDF content for analysis
      const isWelcomeRequest = lastUserMessage.content.toLowerCase().includes('welcome message') || 
                              lastUserMessage.content.toLowerCase().includes('suggested questions');
      
      let promptText;
      
      if (isWelcomeRequest) {
        // Get category-specific context for old format ArXiv IDs
        const categoryContext = parsed.category ? getCategoryPromptContext(parsed.category) : 
          'You are an AI assistant helping a student understand this research paper.';
        
        promptText = `${categoryContext}

You are helping with arXiv paper ${parsed.id}. After analyzing the PDF, create a brief welcome message.

For the content field: Provide a brief welcome message with one sentence summary of what this paper is about.

For suggestedQuestions: Create 4-5 specific questions that users can ask about THIS particular paper. Make them specific to the paper's content, methodology, and findings - not generic questions.

Set responseType to "welcome".`;
      } else {
        // Get category-specific context for old format ArXiv IDs
        const categoryContext = parsed.category ? getCategoryPromptContext(parsed.category) : 
          'You are an AI assistant helping users understand and analyze research papers.';
        
        promptText = `${categoryContext}

You are helping with arXiv paper ${parsed.id}. You are part of asXiv, a tool created by Montana Flynn.

Answer this question: ${lastUserMessage.content}

Guidelines for content field:
- CRITICAL: Always format page references using EXACTLY this format: (page X) for single pages or (page X, page Y) for multiple pages. Examples: "(page 1)", "(page 2, page 6)". NEVER use formats like "page 1,3" or "page 1-3"
- CRITICAL: ONLY state information you can actually find in the PDF content
- NEVER make assumptions or educated guesses about information not explicitly stated
- If you cannot find specific information, clearly state "I cannot find this information in the paper"
- Do NOT infer dates from arXiv IDs - only cite dates actually written in the paper
- Never make up or hallucinate page references - only cite pages where you actually found the information
- Do NOT start responses with "Based on my analysis" or "According to the paper"
- Use markdown formatting for better readability

For suggestedQuestions: Provide 2-4 contextually relevant follow-up questions based on your answer and the current conversation. Make them specific to this paper's content, not generic.

Set responseType to "answer".`;
      }

      contents = createUserContent([
        createPartFromUri(uploadedFile.uri || '', uploadedFile.mimeType || 'application/pdf'),
        "\n\n",
        promptText
      ]);
    } else {
      // Follow-up message: use conversation history without re-sending PDF
      // Get category-specific context for old format ArXiv IDs
      const categoryContext = parsed.category ? getCategoryPromptContext(parsed.category) : 
        'You are an AI assistant helping users understand and analyze research papers.';
        
      const promptText = `${categoryContext}

Continue our conversation about arXiv paper ${parsed.id}. You have already analyzed the PDF content. You are part of asXiv, a tool created by Montana Flynn.

${conversationHistory}Current question: ${lastUserMessage.content}

Guidelines for content field:
- CRITICAL: Always format page references using EXACTLY this format: (page X) for single pages or (page X, page Y) for multiple pages. Examples: "(page 1)", "(page 2, page 6)". NEVER use formats like "page 1,3" or "page 1-3"
- CRITICAL: ONLY state information you can actually find in the PDF
- NEVER make assumptions or educated guesses about information not explicitly stated
- If you cannot find specific information, clearly state "I cannot find this information in the paper"
- Do NOT infer dates from arXiv IDs - only cite dates actually written in the paper
- Never make up or hallucinate page numbers - only cite pages where you actually found the information
- Do NOT start responses with "Based on my analysis" or "According to the paper"
- Use markdown formatting for better readability

For suggestedQuestions: Provide 2-4 contextually relevant suggested questions based on our conversation history. Make them specific to this paper and our current discussion thread.

Set responseType to "answer".`;
      
      contents = createUserContent([promptText]);
    }
    
    // Generate response using Gemini
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    
    // Validate model name
    const validModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    if (!validModels.includes(model)) {
      throw new Error(`Invalid GEMINI_MODEL: ${model}. Valid options are: ${validModels.join(', ')}`);
    }
    const result = await genAI.models.generateContent({
      model: model,
      contents: [contents],
      config: {
        responseMimeType: 'application/json',
        responseSchema: structuredResponseSchema
      }
    });

    const text = result.text;
    if (!text) {
      throw new Error('No text response received from Gemini API');
    }

    // Parse the guaranteed JSON response from Gemini's structured output
    let structuredResponse: StructuredChatResponse;
    try {
      structuredResponse = JSON.parse(text.trim());
    } catch (parseError) {
      console.error('Unexpected: Failed to parse Gemini structured output as JSON:', parseError);
      throw new Error('Invalid structured response from Gemini API');
    }

    // Return both formats for backwards compatibility
    const apiResponse: ChatApiResponse = {
      response: structuredResponse.content, // Always use structured content now
      structured: structuredResponse
    };

    res.status(200).json(apiResponse);

  } catch (error) {
    console.error('Chat API error:', error);
    
    // More detailed error handling
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name || 'Unknown'
    });
  }
}
