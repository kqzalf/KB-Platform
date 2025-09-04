# 🧠 KB Platform - Intelligent Knowledge Management System

[![Docker](https://img.shields.io/badge/Docker-Enabled-blue?logo=docker)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-blue?logo=react)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue?logo=postgresql)](https://www.postgresql.org/)
[![GPU](https://img.shields.io/badge/GPU-Accelerated-green?logo=nvidia)](https://developer.nvidia.com/)

A comprehensive, AI-powered knowledge management platform that combines a vault system (similar to Obsidian) with intelligent web scraping, GPU-accelerated AI question answering, and modern web interface. Built for teams who need to manage, search, and query large knowledge bases efficiently.

## ✨ Key Features

### 🧠 **Intelligent AI Integration**
- **GPU-Accelerated AI**: Powered by Ollama with RTX 5080 support for lightning-fast responses
- **Multiple LLM Support**: OpenAI GPT and local Ollama models
- **Context-Aware Answers**: Retrieves relevant information from your knowledge base
- **Professional Formatting**: Beautiful markdown rendering with syntax highlighting
- **Structured Responses**: Clear sections, troubleshooting guides, and step-by-step instructions

### 📚 **Advanced Knowledge Management**
- **Vault System**: Markdown-based knowledge base with cross-referencing
- **Smart Search**: Semantic search with vector embeddings
- **Content Organization**: Hierarchical structure with templates and metadata
- **Real-time Updates**: Live content synchronization and indexing

### 🌐 **Intelligent Web Scraping**
- **Automated Content Extraction**: Playwright-powered scraping with JavaScript support
- **Scheduled Scraping**: Background job processing with Redis queue
- **Content Processing**: Automatic markdown conversion and metadata extraction
- **Link Discovery**: Automatic discovery of related content

### 🎨 **Modern Web Interface**
- **React Frontend**: Fast, responsive UI with Tailwind CSS
- **Real-time Updates**: Live data synchronization
- **Mobile Responsive**: Works perfectly on all devices
- **Dark/Light Mode**: Beautiful themes with smooth transitions

### ⚡ **High Performance**
- **GPU Acceleration**: RTX 5080 support for 10-50x faster AI inference
- **Microservices Architecture**: Scalable, containerized services
- **Background Processing**: Asynchronous job processing
- **Caching**: Redis-based caching for optimal performance

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Service   │    │ Worker Service  │
│   (React/Vite)  │◄──►│  (Express.js)   │◄──►│  (Background)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   PostgreSQL    │              │
         │              │   (Database)    │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         │              │   (Job Queue)   │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │     Ollama      │              │
         │              │  (AI/GPU)       │              │
         │              └─────────────────┘              │
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│   Vault Files   │                            │  Web Scraping  │
│   (Markdown)    │                            │   (Playwright)  │
└─────────────────┘                            └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose**: For containerized services
- **Node.js 18+**: For local development
- **NVIDIA GPU** (Optional): For GPU acceleration
- **Git**: For version control

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd kb_platform
```

### 2. Start with Docker (Recommended)

```bash
# Start all services with GPU support
docker compose -f docker-compose.gpu.yml up -d

# Or start with CPU only
docker compose up -d
```

### 3. Access the Platform

- **Web Interface**: http://localhost:5173
- **API Documentation**: http://localhost:4000
- **Ollama Interface**: http://localhost:11435 (if using GPU)

### 4. Initial Setup

1. **Ingest Knowledge Base**: Click "Ingest Vault" in the web interface
2. **Add Scraping Jobs**: Add URLs to automatically scrape content
3. **Test AI**: Ask questions in the chat interface

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kb"
REDIS_URL="redis://localhost:6379"

# AI Configuration
LLM_PROVIDER="ollama"  # or "openai" or "none"
OLLAMA_BASE_URL="http://localhost:11434"
OPENAI_API_KEY="your-openai-key"  # Optional

# Vault
VAULT_PATH="./vault"

# API
PORT=4000
```

### GPU Configuration

For NVIDIA GPU support:

1. **Install NVIDIA Container Toolkit**:
   ```bash
   winget install Nvidia.ContainerToolkit
   ```

2. **Restart Docker Desktop**

3. **Use GPU-enabled compose file**:
   ```bash
   docker compose -f docker-compose.gpu.yml up -d
   ```

## 📖 Usage Guide

### Knowledge Base Management

1. **Add Content**: Place markdown files in the `vault/` directory
2. **Organize**: Use folders and naming conventions for better organization
3. **Cross-reference**: Use `[[links]]` for internal references
4. **Templates**: Use the provided templates for consistent formatting

### Web Scraping

1. **Add URLs**: Use the web interface to add URLs for scraping
2. **Schedule**: Set up automatic scraping schedules
3. **Monitor**: Check the worker logs for scraping progress
4. **Review**: Scraped content is automatically added to your knowledge base

### AI Question Answering

1. **Ask Questions**: Use natural language to query your knowledge base
2. **Get Context**: AI retrieves relevant information from your vault
3. **Structured Answers**: Receive well-formatted, professional responses
4. **Source Attribution**: See which documents informed the answer

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Setup database
cd apps/api && npm run prisma:push && cd ../..

# Install Playwright
npm run pw:install

# Start all services
npm run dev

# Or start individual services
npm run dev:api      # API only
npm run dev:worker   # Worker only
npm run dev:web      # Web only
```

### Available Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:api          # Start API service
npm run dev:worker       # Start worker service
npm run dev:web          # Start web interface

# Building
npm run build            # Build all applications
npm run clean            # Clean build artifacts

# Database
npm run prisma:push      # Push schema to database
npm run prisma:studio    # Open Prisma Studio

# Playwright
npm run pw:install       # Install Playwright browsers
npm run pw:test          # Run Playwright tests

# Utilities
npm run lint             # Run ESLint
npm run test             # Run tests
```

### Project Structure

```
kb_platform/
├── apps/
│   ├── api/                 # Express.js API service
│   │   ├── src/
│   │   │   ├── routes/      # API routes
│   │   │   ├── lib/         # Utilities and services
│   │   │   └── prisma/      # Database schema
│   │   └── Dockerfile
│   ├── worker/              # Background job processor
│   │   ├── src/
│   │   │   ├── jobs/        # Job definitions
│   │   │   └── scrapers/    # Web scrapers
│   │   └── Dockerfile
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── pages/       # Page components
│       │   └── lib/         # Utilities
│       └── Dockerfile
├── vault/                   # Knowledge base files
│   └── KnowledgeBase/       # Markdown content
├── docker-compose.yml       # CPU-only services
├── docker-compose.gpu.yml   # GPU-enabled services
└── package.json             # Root package configuration
```

## 🔌 API Endpoints

### AI Endpoints
- `POST /ai/ask` - Ask questions to the AI
- `GET /ai/models` - List available AI models

### Knowledge Base
- `GET /kb/items` - List all knowledge items
- `GET /kb/items/:id` - Get specific knowledge item
- `POST /kb/search` - Search knowledge base

### Vault Management
- `GET /vault/files` - List vault files
- `GET /vault/files/:path` - Get specific file
- `POST /vault/ingest` - Ingest vault content

### Link Management
- `GET /links` - List all links
- `POST /links` - Add new link for scraping
- `PUT /links/:id` - Update link
- `DELETE /links/:id` - Delete link

### Job Management
- `GET /jobs` - List all jobs
- `GET /jobs/:id` - Get job status
- `POST /jobs/scrape` - Create scraping job

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api
npm run test:worker
npm run test:web

# Run with coverage
npm run test:coverage
```

### Test AI Functionality

```bash
# Test AI endpoint
curl -X POST http://localhost:4000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the purpose of this knowledge base?"}'
```

### Test Web Scraping

```bash
# Add a test URL
curl -X POST http://localhost:4000/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "title": "Test Page"}'
```

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**:
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Build and Deploy**:
   ```bash
   docker compose -f docker-compose.gpu.yml -f docker-compose.prod.yml up -d
   ```

3. **Health Checks**:
   ```bash
   # Check all services
   docker compose ps
   
   # Check logs
   docker compose logs -f
   ```

### Scaling

- **Horizontal Scaling**: Add more worker instances
- **Database Scaling**: Use read replicas for PostgreSQL
- **Caching**: Increase Redis memory for better performance
- **GPU Scaling**: Use multiple GPUs for larger models

## 🔒 Security

### Security Features

- **Helmet.js**: Security headers and protection
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Prisma ORM protection
- **Rate Limiting**: Built-in rate limiting for API endpoints

### Best Practices

- Use environment variables for sensitive data
- Regularly update dependencies
- Monitor logs for suspicious activity
- Use HTTPS in production
- Implement proper authentication if needed

## 📊 Performance

### Benchmarks

- **AI Response Time**: < 2 seconds (with GPU)
- **Database Queries**: < 100ms average
- **Web Scraping**: 10-50 pages/minute
- **Memory Usage**: ~2GB for full stack
- **GPU Memory**: ~3GB for Ollama (RTX 5080)

### Optimization Tips

- Use GPU acceleration for AI workloads
- Implement caching for frequently accessed data
- Use database indexes for better query performance
- Monitor resource usage and scale accordingly

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards

- Use TypeScript for all new code
- Follow ESLint configuration
- Write comprehensive tests
- Document new features
- Use conventional commit messages

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

### Troubleshooting

1. **Check Logs**:
   ```bash
   docker compose logs -f [service-name]
   ```

2. **Restart Services**:
   ```bash
   docker compose restart [service-name]
   ```

3. **Reset Database**:
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### Common Issues

- **GPU Not Working**: Ensure NVIDIA Container Toolkit is installed
- **Database Connection**: Check PostgreSQL is running and accessible
- **AI Not Responding**: Verify Ollama is running and model is loaded
- **Scraping Fails**: Check Playwright installation and network connectivity

### Getting Help

- Check the [documentation](vault/KnowledgeBase/) in the vault
- Review the [troubleshooting guide](vault/KnowledgeBase/Troubleshooting.md)
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ for intelligent knowledge management**