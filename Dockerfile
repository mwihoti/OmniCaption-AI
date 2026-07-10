# ============================================
# OmniCaption AI — Docker Configuration
# AMD Developer Hackathon: ACT II — Track 2
# ============================================

# ---- Frontend Stage ----
FROM node:20-alpine AS frontend

WORKDIR /app/frontend
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Backend Stage ----
FROM rocm/pytorch:rocm6.2_ubuntu24.04_py3.12_pytorch_release_2.4.0 AS backend

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy backend code
COPY backend/ /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy frontend build
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# ---- Runtime Stage ----
FROM rocm/pytorch:rocm6.2_ubuntu24.04_py3.12_pytorch_release_2.4.0

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3-pip \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy artifacts
COPY --from=backend /app/ /app/
COPY --from=frontend /app/frontend/dist /usr/share/nginx/html

# Nginx config for serving frontend + proxying API
RUN rm -f /etc/nginx/sites-enabled/default
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Create data directories
RUN mkdir -p /data/uploads /data/processing

# Environment variables
ENV FIREWORKS_API_KEY=""
ENV FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1"
ENV WHISPER_MODEL_SIZE="base"
ENV DEVICE="cuda"

EXPOSE 80

# Start both Nginx (frontend) and Uvicorn (backend)
CMD sh -c "nginx && uvicorn backend.main:app --host 0.0.0.0 --port 8000"