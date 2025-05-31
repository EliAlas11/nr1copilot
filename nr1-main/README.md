# NR1 Main - World-Class Video Processing Platform

## Overview

A modern, secure, scalable, and production-ready platform for video processing, analytics, and feedback, built with Node.js, Express, BullMQ, MongoDB, and PWA best practices.

## Features

- Modular backend (controllers, routes, utils)
- Secure (CORS, Helmet, rate limiting, input validation)
- Real-time job queue (BullMQ, Redis)
- PWA frontend (offline, installable, manifest, service worker)
- Advanced logging (Winston)
- **Per-user and per-IP rate limiting on all sensitive endpoints**
- **Audit logging for all sensitive actions (login, signup, feedback, analytics, video processing)**
- Dockerized, CI-ready, and cloud deployable
- Swagger/OpenAPI docs
- User authentication (JWT, ready for OAuth)
- Analytics, feedback, i18n endpoints
- MongoDB for user management
- World-class DevOps: Docker, CI, Prettier, ESLint, security policy

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env` and set your secrets (including `MONGO_URI` and `JWT_SECRET`)
3. Start MongoDB locally or use a cloud provider
4. Run `docker build -t nr1-main . && docker run -p 5000:5000 nr1-main` or use `npm install && npm start`

## API Versioning

All endpoints are now under `/api/v1/` (e.g., `/api/v1/user/signup`, `/api/v1/videos/:id`, `/api/v1/feedback`).

## Security & Observability

- **Advanced rate limiting**: Per-user and per-IP, with abuse monitoring
- **Audit logging**: All sensitive actions are logged (login, signup, feedback, analytics, video processing)

## API Docs

Visit `/api/docs` for Swagger UI.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Security

See [SECURITY.md](SECURITY.md)

## License

MIT
