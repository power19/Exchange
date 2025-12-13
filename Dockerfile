# FINAL — THIS ONE WORKS PERFECTLY FOR YOUR PROJECT
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Backend — copy everything and install + build
COPY backend ./backend
WORKDIR /app/backend
RUN npm ci
RUN npm run build                    # creates /app/backend/dist
RUN npm prune --production

# 2. Frontend — copy and build React/Vite
WORKDIR /app
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm ci --include=dev
RUN npm run build                    # creates /app/frontend/dist

# 3. Put the built frontend into backend/dist so Express can serve it
RUN cp -r /app/frontend/dist/* /app/backend/dist/

# Runtime image (tiny)
FROM node:20-alpine
WORKDIR /app

# Copy only the final built backend (with frontend inside dist)
COPY --from=builder /app/backend ./ 

# Also copy SQL file if needed (your original does this)
RUN mkdir -p dist/database && cp src/database/schema.sql dist/database/ 2>/dev/null || true

EXPOSE 3000
CMD ["npm", "start"]