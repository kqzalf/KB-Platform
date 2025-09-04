import { config as dotenvConfig } from 'dotenv';

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kb',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
} as const;
