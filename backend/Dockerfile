FROM node:20-alpine

# Install timezone data for proper timezone support
RUN apk add --no-cache tzdata

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Copy SQL files to dist
RUN mkdir -p dist/database && cp src/database/schema.sql dist/database/

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
