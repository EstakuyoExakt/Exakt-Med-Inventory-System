# ==========================================
# 1. Build Stage (Node 20 Alpine)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build production assets
COPY . .
ARG VITE_BACKEND_URL=http://localhost:8080
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# ==========================================
# 2. Production Stage (Nginx Alpine)
# ==========================================
FROM nginx:alpine

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
