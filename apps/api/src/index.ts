import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './lib/config.js';
import { jobsRouter } from './routes/jobs.js';
import { kbRouter } from './routes/kb.js';
import { aiRouter } from './routes/ai.js';
import { linksRouter } from './routes/links.js';
import { vaultRouter } from './routes/vault.js';
import { resetRouter } from './routes/reset.js';
import { LinkScheduler } from './lib/scheduler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'KB Platform API', version: '1.0.0' });
});

app.use('/jobs', jobsRouter);
app.use('/kb', kbRouter);
app.use('/ai', aiRouter);
app.use('/links', linksRouter);
app.use('/vault', vaultRouter);
app.use('/reset', resetRouter);

// Start the server
app.listen(config.port, async () => {
  console.log(`🚀 API server running on port ${config.port}`);
  
  // Start the link scheduler
  const scheduler = LinkScheduler.getInstance();
  await scheduler.start();
  console.log('🔄 Link scheduler initialized');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  const scheduler = LinkScheduler.getInstance();
  await scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  const scheduler = LinkScheduler.getInstance();
  await scheduler.stop();
  process.exit(0);
});
