# SaaS AI CV

SaaS AI CV is a full-stack web app for AI-assisted CV analysis, job matching,
and cover letter generation. Users can upload a CV, extract structured context,
compare it against job descriptions, and generate editable application drafts
from a protected dashboard.

## Features

- Account registration, login, refresh sessions, logout, profile updates,
  password reset, and email verification
- PDF/DOCX CV upload with parser status tracking
- AI CV analysis with structured report output
- Job description CRUD
- CV-to-job matching
- Cover letter generation and saved document editing
- Protected dashboard with workflow-specific routes
- Production-oriented API response envelopes, rate limiting, and environment
  validation

## Tech Stack

### Client

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives

### Server

- Express
- TypeScript
- MongoDB with Mongoose
- Redis for rate limiting/readiness
- Cloudinary for CV file storage
- Gemini for AI generation
- Resend or console email provider

## Project Structure

```text
.
├── client/   # Next.js frontend
└── server/   # Express API backend
```

## Prerequisites

- Node.js
- npm
- MongoDB
- Redis
- Cloudinary account
- Gemini API key
- Resend account for production email delivery

## Environment Setup

Create local environment files from the examples:

```bash
cp client/.env.example client/.env.local
cp server/.env.example server/.env
```

Never commit real environment files. The repository is configured to ignore
`.env`, `.env.local`, `.env.production.local`, and other local secret files.

For production, configure secrets in your hosting provider rather than in the
repository.

Required production configuration includes:

- `NEXT_PUBLIC_API_URL`
- `NODE_ENV=production`
- `CLIENT_ORIGIN`
- `APP_BASE_URL`
- `MONGODB_URI`
- `REDIS_URL`
- `ACCESS_TOKEN_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY`
- `EMAIL_PROVIDER=resend`
- `EMAIL_FROM`
- `RESEND_API_KEY`

## Local Development

Install dependencies:

```bash
cd client
npm install

cd ../server
npm install
```

Run the API:

```bash
cd server
npm run dev
```

Run the frontend in another terminal:

```bash
cd client
npm run dev
```

By default, the frontend uses `http://127.0.0.1:4000` as the API origin in local
development when `NEXT_PUBLIC_API_URL` is not set.

## Quality Checks

Client:

```bash
cd client
npm run lint
npm run typecheck
npm run build
```

Server:

```bash
cd server
npm run build
npm test
```

## Production Notes

Before publishing or deploying:

- Confirm no real `.env` files are staged in Git.
- Rotate any secrets that were ever stored locally or shared.
- Set production environment variables in the deployment platform.
- Run client lint, typecheck, and build.
- Run server build and tests.
- Use HTTPS for both frontend and backend.
- Configure `CLIENT_ORIGIN` to the exact frontend origin.
- Review CSRF/session protections, upload parser isolation, AI failure handling,
  and cleanup/retention operations before a broad production rollout.

## GitHub Publish Safety

This repository intentionally ignores:

- Local and production secret files
- Dependency folders
- Build output and caches
- Test reports and coverage output
- Logs and runtime temp files
- Private documentation under `docs/`

After initializing Git, verify the staged files before committing:

```bash
git add .
git status --short
```

If a secret file appears in the staged list, remove it from Git before pushing.

## License

MIT
