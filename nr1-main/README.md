# nr1 (Viral Clip Generator)

This is the main application for converting YouTube videos into viral clips using AI-powered editing.

## Project Structure

- `server.js`: Main server file (Node.js/Express)
- `routes/`: API route handlers
- `index.html`: Main web interface
- `videos/`: Processed and temporary video storage
- `attached_assets/`: Additional resources and logs

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Development

- Use `npm run dev` for hot-reloading with nodemon.
- API endpoints are documented in the `routes/` folder.

## Contributing

- Please document your code and add comments for clarity.
- Follow best practices for Node.js and Express.

## License

MIT

## Advanced Features & Deployment

### Job Queue & Worker

- Video processing is handled asynchronously using BullMQ and Redis.
- Worker threads offload CPU-intensive tasks for scalability.

### Real-Time Progress

- WebSocket (socket.io) integration provides real-time job progress updates to the frontend.

### Cloud Storage

- Processed videos are uploaded to AWS S3 for scalable, reliable storage.
- Requires AWS credentials and S3 bucket configuration in environment variables.

### Advanced Caching

- Redis is used for caching video info and results.

### Enhanced Rate Limiting

- Sensitive endpoints are protected with advanced rate limiting and abuse detection.

### Service Worker

- Frontend includes a service worker for offline support and asset caching.

### Deployment Notes

- Set environment variables for AWS and Redis in Render.com or your cloud host.
- Ensure Redis and S3 are accessible from your deployment environment.

## Environment Variables

- `REDIS_URL`: Redis connection string
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`: AWS S3 configuration
