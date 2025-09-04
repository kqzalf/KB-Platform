import { config as dotenvConfig } from 'dotenv';

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kb',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  llmProvider: process.env.LLM_PROVIDER || 'none',
  vaultPath: process.env.VAULT_PATH || './vault',
} as const;
