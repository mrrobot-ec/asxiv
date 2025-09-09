import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  arxivId: string;
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

    // Download PDF and send content directly
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
    console.log(`Processing arXiv paper: ${arxivId}`);

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
      console.log('Uploading PDF to Gemini Files API...');
      
      // Download PDF first
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();
      console.log(`PDF downloaded successfully, size: ${pdfBuffer.byteLength} bytes`);
      
      // Validate that it's actually a PDF
      const pdfHeader = Buffer.from(pdfBuffer.slice(0, 4)).toString();
      console.log(`PDF header check: ${pdfHeader} (should start with %PDF)`);
      
      if (!pdfHeader.startsWith('%PDF')) {
        throw new Error('Downloaded content is not a valid PDF file');
      }

      // Check file size
      const fileSizeMB = pdfBuffer.byteLength / (1024 * 1024);
      console.log(`PDF file size: ${fileSizeMB.toFixed(2)} MB`);
      
      if (fileSizeMB > 2000) { // Files API has higher limits
        throw new Error(`PDF file too large (${fileSizeMB.toFixed(2)} MB). Maximum size is ~2GB`);
      }
      
      // Check if file already exists to avoid re-uploading
      // Convert arxivId to valid file name format (lowercase alphanumeric + dashes)
      const fileName = `arxiv-${arxivId.replace(/\./g, '-').toLowerCase()}`;
      let uploadedFile;
      
      try {
        // Try to get existing file first
        uploadedFile = await genAI.files.get({ name: `files/${fileName}` });
        console.log('Found existing uploaded file:', uploadedFile.uri);
      } catch {
        // File doesn't exist, try to upload it
        console.log('File not found, uploading new PDF...');
        try {
          const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
          uploadedFile = await genAI.files.upload({
            file: pdfBlob,
            config: {
              mimeType: 'application/pdf',
              name: fileName,
              displayName: `arXiv-${arxivId}.pdf`
            }
          });
          console.log('PDF uploaded to Files API:', uploadedFile.uri);
        } catch (uploadError: unknown) {
          // If upload fails because file already exists, try to get it
          if (uploadError instanceof Error && uploadError.message && uploadError.message.includes('already exists')) {
            console.log('File was created by another request, fetching it...');
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
        promptText = `You are an AI assistant for arXiv paper ${arxivId}. After analyzing the PDF, create a brief welcome message with:

1. One sentence summary of what this paper is about
2. 4-5 short, specific questions users can ask (each question should be one line)

Keep it very concise. Use markdown formatting.

Create a welcome message.`;
      } else {
        promptText = `You are an AI assistant helping users understand and analyze this arXiv research paper (ID: ${arxivId}). You are part of asXiv, a tool created by Montana Flynn.

You should:
1. Analyze the PDF content to understand the paper's methodology, findings, and conclusions
2. Answer questions about specific sections, figures, tables, or concepts
3. Explain technical terms and concepts in accessible language
4. Provide insights about the research's significance and implications
5. Always include page references as clickable markdown links using this exact format: [page X](#page-X) (e.g., "The authors are Vaswani et al. [page 1](#page-1)", "The model architecture is described on [page 3](#page-3)")
6. For author information, if all authors are listed on the same page, use one reference for the group
7. CRITICAL: ONLY state information that you can actually find in the provided PDF content
8. NEVER make assumptions, inferences, or educated guesses about information not explicitly stated in the paper
9. If you cannot find specific information (dates, numbers, claims, etc.) in the paper, clearly state "I cannot find this information in the paper"
10. Do NOT infer submission dates from arXiv IDs or make up dates - only cite dates actually written in the paper
11. Format your responses using Markdown for better readability
12. Never make up or hallucinate page references - only cite pages where you actually found the information
13. IMPORTANT: Do NOT start your responses with phrases like "Based on my analysis of arXiv paper..." or "According to the paper...". Just answer directly and naturally.
14. If anyone asks who created asXiv or this tool, mention it was created by Montana Flynn. Note: arXiv is the academic paper repository, asXiv is the AI tool you are part of.

Answer this question: ${lastUserMessage.content}`;
      }

      contents = createUserContent([
        createPartFromUri(uploadedFile.uri || '', uploadedFile.mimeType || 'application/pdf'),
        "\n\n",
        promptText
      ]);
      console.log('First message - sending PDF URI with question');
    } else {
      // Follow-up message: use conversation history without re-sending PDF
      const promptText = `Continue our conversation about arXiv paper ${arxivId}. You have already analyzed the PDF content. You are part of asXiv, a tool created by Montana Flynn.

${conversationHistory}Current question: ${lastUserMessage.content}

Answer directly and naturally using Markdown formatting. Always include page references as clickable markdown links using this exact format: [page X](#page-X) (e.g., "The authors are Smith et al. [page 1](#page-1)", "The results show [page 7](#page-7)"). CRITICAL: ONLY state information you can actually find in the PDF - never make assumptions, inferences, or educated guesses. If you cannot find specific information, clearly state "I cannot find this information in the paper". Do NOT infer dates from arXiv IDs. For authors on the same page, use one reference. Never make up or hallucinate page numbers - only cite pages where you actually found the information. Do NOT start with phrases like "Based on my analysis" or "According to the paper". If anyone asks who created asXiv or this tool, mention it was created by Montana Flynn. Note: arXiv is the academic paper repository, asXiv is the AI tool you are part of.`;
      
      contents = createUserContent([promptText]);
      console.log('Follow-up message - using conversation context, no PDF');
    }
    
    console.log('About to call Gemini API...');
    
    // Generate response using Gemini
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    
    // Validate model name
    const validModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    if (!validModels.includes(model)) {
      throw new Error(`Invalid GEMINI_MODEL: ${model}. Valid options are: ${validModels.join(', ')}`);
    }
    
    console.log(`Using Gemini model: ${model}`);
    const result = await genAI.models.generateContent({
      model: model,
      contents: [contents]
    });

    console.log('Gemini API call completed, getting response...');
    const text = result.text;
    if (!text) {
      throw new Error('No text response received from Gemini API');
    }
    console.log('Text extracted successfully, length:', text.length);

    // Return as JSON response 
    res.status(200).json({ response: text });

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
