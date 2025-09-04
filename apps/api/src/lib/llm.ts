import OpenAI from 'openai';
import { config } from './config.js';

let openai: OpenAI | null = null;

if (config.llmProvider === 'openai' && config.openaiApiKey) {
  openai = new OpenAI({
    apiKey: config.openaiApiKey,
  });
}

// Ollama client
async function callOllama(prompt: string, model: string = 'llama3.2:3b'): Promise<string> {
  const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || 'No response generated';
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (config.llmProvider === 'openai' && openai) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
  
  // Fallback: simple hash-based embedding
  return Array.from({ length: 384 }, (_, i) => 
    Math.sin(text.charCodeAt(i % text.length) + i) * 0.5
  );
}

export async function askQuestion(question: string, context: string[]): Promise<string> {
  if (config.llmProvider === 'openai' && openai) {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions based on the provided context.',
        },
        {
          role: 'user',
          content: `Context: ${context.join('\n\n')}\n\nQuestion: ${question}`,
        },
      ],
    });
    return response.choices[0].message.content || 'No response generated';
  }
  
  if (config.llmProvider === 'ollama') {
    const prompt = `You are an expert technical support assistant specializing in POS systems, particularly Dutchie POS. You provide clear, actionable, and well-structured answers.

INSTRUCTIONS:
- Give direct, practical answers that users can immediately implement
- Use clear headings (##) and bullet points for easy scanning
- Include step-by-step instructions with specific UI elements in **bold**
- Provide troubleshooting sections when relevant
- Keep answers concise but comprehensive
- Use markdown formatting for better readability
- Structure your response with clear sections
- Use tables for comparison or troubleshooting steps
- Include code blocks for any technical commands
- If the context doesn't contain enough information, say so and suggest where to find more details

RESPONSE FORMAT:
## Quick Answer
[Brief 1-2 sentence answer]

## Step-by-Step Instructions
[Numbered steps with **bold** UI elements]

## Troubleshooting
[Common issues and solutions in table format if applicable]

## Additional Notes
[Any important warnings or tips]

CONTEXT (from knowledge base):
${context.join('\n\n')}

USER QUESTION: ${question}

ANSWER:`;
    
    try {
      return await callOllama(prompt);
    } catch (error) {
      console.error('Ollama error:', error);
      return `Error connecting to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  // Fallback response
  return `Based on the available context, I found ${context.length} relevant items. However, no LLM provider is configured. Please set up OpenAI or Ollama to get AI-powered responses.`;
}
