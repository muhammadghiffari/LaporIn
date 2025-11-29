# Dockerfile untuk LaporIn Backend
# Railway akan menggunakan Dockerfile ini untuk build backend
FROM node:20-alpine

# Install dependencies untuk canvas dan native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Set working directory
WORKDIR /app

# Copy package files dari backend
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy Prisma schema
COPY backend/prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy seluruh kode backend
COPY backend .

# Ensure models directory exists and verify model files
RUN mkdir -p public/models && \
    ls -la public/models/ || echo "Models directory created"

# Create uploads directory
RUN mkdir -p uploads/faces

# Expose port (Railway akan auto-assign PORT via env)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server backend
# Railway akan override dengan start command: node server.js
CMD ["node", "server.js"]

