# ---- Frontend Build ----
FROM node:20-alpine AS frontend

LABEL org.opencontainers.image.source="https://github.com/mwihoti/omnicaption-ai"

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
COPY docker/run.sh /app/run.sh
RUN chmod +x /app/run.sh

# Data dirs
RUN mkdir -p /data/uploads /data/processing && \
    rm -f /etc/nginx/sites-enabled/default

# Expose ports
EXPOSE 80 8000

# Dispatcher: batch pipeline in grader mode (/input/tasks.json present),
# otherwise the web server. See docker/run.sh.
CMD ["/app/run.sh"]
