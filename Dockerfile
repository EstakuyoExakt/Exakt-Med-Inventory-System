# ==========================================
# STAGE 1: Build Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# ==========================================
# STAGE 2: Build Backend with Embedded UI
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17-alpine AS backend-builder
WORKDIR /app/backend

# Cache maven dependencies
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

# Copy backend source code
COPY backend/src ./src

# Copy compiled React frontend assets into Spring Boot static resources
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static/

# Package executable JAR
RUN mvn clean package -DskipTests

# ==========================================
# STAGE 3: Final Production Runtime Image
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy JAR from backend-builder
COPY --from=backend-builder /app/backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
