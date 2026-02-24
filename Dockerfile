# Stage 1: Build frontend
FROM node:22-slim AS frontend
WORKDIR /app/frontend
RUN npm install -g pnpm@latest --quiet
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build
# Output at /app/backend/static (vite outDir: ../backend/static)

# Stage 2: Python runtime
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app/ ./app/
COPY --from=frontend /app/backend/static ./static/

EXPOSE 9500

CMD ["python", "-m", "app.main"]
