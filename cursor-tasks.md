# KB Platform Tasks

## Setup Tasks
- [ ] Run `docker compose up -d postgres redis`
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env` and configure
- [ ] Run `cd apps/api && npm run prisma:push && cd ../..`
- [ ] Run `npm run pw:install`

## Development Tasks
- [ ] Start all services: `npm run dev`
- [ ] Test API endpoints
- [ ] Ingest vault via `/kb/ingest`
- [ ] Create scraping jobs
- [ ] Ask questions via `/ai/ask`

## Production Tasks
- [ ] Set up environment variables
- [ ] Configure LLM provider (OpenAI/Ollama)
- [ ] Set up monitoring and logging
- [ ] Deploy to production environment
- [ ] Set up backups for database

## Maintenance Tasks
- [ ] Regular database backups
- [ ] Monitor job queue performance
- [ ] Update dependencies
- [ ] Review and clean up old jobs
- [ ] Optimize knowledge base content
