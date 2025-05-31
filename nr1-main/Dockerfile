# World-class Dockerfile for Node.js + FFmpeg + BullMQ + PWA
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ENV NODE_ENV=production

# Expose port
EXPOSE 5000

CMD ["node", "app.js"]
