# Cursor Superprompt — KB Platform (Vault + Web + AI)

**Role:** You are an expert full‑stack engineer. Generate a complete monorepo ready to `npm install` and run locally. Use **TypeScript** and **ESM**.

**Goals**
- Monorepo `kb_platform/` with:
  - **vault/** (Obsidian/Cursor notes & templates)
  - **apps/api** (Express + Prisma + Zod): `/jobs`, `/kb/ingest`, `/ai/ask`
  - **apps/worker** (BullMQ + Playwright)
  - **apps/web** (React + Vite + Tailwind)
  - **docker-compose.yml** (Postgres + Redis)
- LLM providers: `openai` or `ollama` or `none` (env driven).
- Store embeddings in Postgres as JSON for simplicity (upgrade to pgvector later).

**Generate/overwrite these paths & files with working code and the content shown in this prompt:** (Keep code concise, production‑minded, and runnable.)

- Root: `README.md`, `.gitignore`, `.editorconfig`, `.cursor/rules`, `cursor-tasks.md`, `package.json`, `tsconfig.base.json`, `docker-compose.yml`
- Vault: `vault/KnowledgeBase` with `00_Index.md`, `.cursor/rules`, `cursor-tasks.md`, `Templates/_frontmatter.md`, `Templates/workflow_template.md`, `Templates/guide_template.md`, plus a sample workflow note.
- API: `package.json`, `tsconfig.json`, `.env.example`, `prisma/schema.prisma`, `src/index.ts`, `src/lib/*`, `src/routes/{jobs,kb,ai}.ts`
- Worker: `package.json`, `tsconfig.json`, `.env.example`, `src/lib/*`, `src/worker.ts`
- Web: `package.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `postcss.config.js`, `tailwind.config.js`, `src/{index.css,main.tsx,App.tsx}`, `src/lib/api.ts`, `src/components/{KBPanel,JobForm,JobList}.tsx`

**Quick start to confirm:**
```bash
docker compose up -d postgres redis
npm install
cd apps/api && npm run prisma:push && cd ../..
npm run pw:install
npm run dev:api
npm run dev:worker
npm run dev:web
# UI http://localhost:5173 | API http://localhost:4000
```
**Smoke test:**
```bash
curl -s http://localhost:4000
curl -s -X POST http://localhost:4000/kb/ingest
curl -s -X POST http://localhost:4000/jobs -H "Content-Type: application/json" -d '{"targetUrl":"https://example.com","kind":"generic"}'
curl -s http://localhost:4000/jobs
```
