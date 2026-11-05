# API

Node.js + Express + TypeScript + MySQL API with JWT auth, CORS, Helmet, and rate limiting.

## Setup

```bash
cd api
npm install
```

The `.env` file is already populated for local development.

## Initialize the database

Make sure MySQL is running, then create the database and tables:

```bash
npm run db:init
```

## Run

```bash
# dev with hot reload
npm run dev

# production build
npm run build
npm start
```

Server listens on `http://localhost:3000`.

## Endpoints

- `GET  /health` — health check
- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET  /api/users/me` — current user (requires `Authorization: Bearer <token>`)
- `GET  /api/users` — list users (requires auth)

## Security

- **helmet** — sets secure HTTP headers
- **cors** — configurable origin allowlist
- **express-rate-limit** — 100 req / 15 min globally; 10 req / 15 min on auth routes
- **jsonwebtoken** — Bearer token auth
- **bcryptjs** — password hashing (cost 10)
- JSON body size capped at 10kb
