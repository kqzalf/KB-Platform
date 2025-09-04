FROM node:20-slim

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-liberation \
    openssl \
    wget \
    gnupg \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libgconf-2-4 \
    libxkbcommon0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install

# Install Playwright browsers with system dependencies
RUN npx playwright install --with-deps chromium

# Copy source code
COPY src ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Start the worker
CMD ["npm", "start"]
