import { Queue } from 'bullmq';
import { config } from './config.js';

export const jobQueue = new Queue('scraping-jobs', {
  connection: {
    host: 'redis',
    port: 6379,
  },
});
