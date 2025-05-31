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

# Viral Clip Generator – Professional Features

## New Features (2025)

- User Account System (Login/Signup UI, backend stubs)
- Analytics Dashboard (UI, backend stub)
- Advanced Clip Customization (UI modal, backend stub)
- Social Sharing Integration (improved ARIA, platform buttons)
- Accessibility & Internationalization (language selector, ARIA)
- Tutorials & Help Center (help modal/FAQ)
- Security & Privacy (privacy policy modal, TOS)
- Performance & Offline (PWA prompt, offline notice)
- Feedback & Support (feedback modal, backend stub)
- SEO & Marketing (Open Graph/meta tags, blog/news link)

## API Endpoints (Stubs)

- `POST /api/auth/login` – User login (not implemented)
- `POST /api/auth/signup` – User signup (not implemented)
- `GET /api/analytics` – Analytics dashboard data (stub)
- `POST /api/feedback` – Submit feedback (stub)
- `GET /api/languages` – Supported languages (stub)
- `POST /api/customize` – Advanced clip customization (stub)
- `GET /api/dashboard` – User dashboard analytics (stub)

## Future Plans
- Implement secure authentication (JWT, OAuth)
- Real analytics and user dashboards
- Full i18n and language switching
- Advanced video customization and preview
- Persistent user feedback and support system

---
See `/index.html` for all UI/UX improvements and `/server.js`, `/routes/video-routes.js` for backend stubs.
