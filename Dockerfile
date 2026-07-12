# ---- Frontend Build ----
FROM node:20-alpine AS frontend

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV VITE_API_URL=""
RUN npm run build

# ---- Backend Runtime ----
FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    ffmpeg \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy code
COPY backend/ /app/backend/
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Data dirs
RUN mkdir -p /data/uploads /data/processing && \
    rm -f /etc/nginx/sites-enabled/default

EXPOSE 80

CMD ["sh", "-c", "nginx && uvicorn backend.main:app --host 0.0.0.0 --port 8000"]
