FROM node:18-slim

# Install OpenSSL and other required dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for build)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
