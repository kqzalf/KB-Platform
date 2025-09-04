import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { askQuestion, generateEmbedding } from '../lib/llm.js';

const router = Router();

const askSchema = z.object({
  question: z.string().min(1),
  sessionId: z.string().optional(),
});

// POST /ai/ask - Ask a question
router.post('/ask', async (req, res) => {
  try {
    const { question, sessionId } = askSchema.parse(req.body);
    
    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);
    
    // Find relevant knowledge items
    const items = await db.knowledgeItem.findMany();
    const relevantItems = items
      .filter(item => item.embeddings && Array.isArray(item.embeddings))
      .map(item => ({
        ...item,
        similarity: cosineSimilarity(questionEmbedding, item.embeddings as number[]),
      }))
      .filter(item => item.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8); // Increased from 5 to 8 for more context
    
    // Extract context with better formatting
    const context = relevantItems.map(item => {
      const source = item.source || 'Unknown source';
      const title = item.title || 'Untitled';
      return `**Source:** ${source}\n**Title:** ${title}\n**Content:**\n${item.content}\n---`;
    });
    
    // Add fallback if no relevant context found
    if (context.length === 0) {
      context.push('No specific documentation found for this question. Please check the Dutchie support center or contact technical support for assistance.');
    }
    
    // Generate answer
    const answer = await askQuestion(question, context);
    
    // Store in chat session if sessionId provided
    if (sessionId) {
      const session = await db.chatSession.findUnique({
        where: { id: sessionId },
      });
      
      if (session) {
        const messages = session.messages as any[];
        messages.push(
          { role: 'user', content: question },
          { role: 'assistant', content: answer }
        );
        
        await db.chatSession.update({
          where: { id: sessionId },
          data: { messages },
        });
      }
    }
    
    res.json({
      answer,
      sources: relevantItems.map(item => ({
        title: item.title,
        source: item.source,
        similarity: item.similarity,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      console.error('AI ask error:', error);
      res.status(500).json({ error: 'Failed to process question' });
    }
  }
});

// POST /ai/sessions - Create new chat session
router.post('/sessions', async (req, res) => {
  try {
    const session = await db.chatSession.create({
      data: { messages: [] },
    });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// GET /ai/sessions/:id - Get chat session
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await db.chatSession.findUnique({
      where: { id: req.params.id },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { router as aiRouter };
