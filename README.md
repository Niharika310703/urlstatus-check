# URL Health & Observability Platform

PulseBoard is a full-stack monitoring system that lets users authenticate, add URLs, run concurrent health checks, schedule recurring checks, inspect historical latency/status trends, and receive live dashboard updates.

## What is included

- Secure sign up and login with JWT authentication
- Per-user monitored URL management
- Concurrent URL health checks with response-time capture
- Graceful handling for invalid URLs, timeouts, HTTP failures, and DNS-style failures
- Scheduled checks using a background cron-driven polling worker
- Historical check storage plus daily aggregated reporting
- Real-time dashboard refresh via Socket.IO
- Structured JSON logging with correlation IDs
- Bonus admin role support with a simple admin overview endpoint

## Tech stack

### Backend

- Node.js + TypeScript
- Express
- Prisma ORM
- SQLite by default for zero-friction local setup
- Socket.IO
- Pino structured logging
- node-cron scheduler

### Frontend

- React 19 + TypeScript
- Vite
- Recharts
- Socket.IO client

## Project structure

```text
.
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  └─ src/
│  └─ web/
│     └─ src/
├─ package.json
└─ README.md
```

## Architecture overview

### High-level flow

1. Users authenticate through the API and receive a JWT.
2. Users add one or many monitored URLs from the dashboard.
3. Manual or scheduled runs trigger concurrent health checks.
4. Each check result is persisted to the database.
5. Daily aggregates are updated for trend reporting.
6. The API emits a Socket.IO event so connected dashboards refresh in real time.

### Data model

- `User`: authentication, ownership, role
- `MonitoredUrl`: current URL metadata, schedule state, last known status
- `CheckResult`: full history of checks, response times, error reasons, correlation IDs
- `AggregatedReport`: per-day rollups used for uptime and trend views

### Scheduler design

The scheduler runs every minute and queries for URLs whose `nextCheckAt` is due. Due URLs are processed concurrently using a configurable concurrency limiter. This keeps scheduling simple while still supporting many URLs and avoiding sequential execution.

### Observability design

- Request logs are emitted in structured JSON via Pino.
- Each request gets an `x-correlation-id` header.
- Health-check events are logged with URL ID, user ID, correlation ID, response time, and failure reason.
- Dashboard metrics are derived from persisted history and daily aggregates.

## Setup instructions

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Environment files

Backend example: `apps/api/.env.example`

Frontend example: `apps/web/.env.example`

Create these runtime files before starting locally:

- `apps/api/.env`
- `apps/web/.env`

Suggested backend values:

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=change-this-in-production
CHECK_TIMEOUT_MS=8000
CHECK_CONCURRENCY=10
ADMIN_EMAIL=admin@demo.com
ADMIN_PASSWORD=Admin123!
```

Suggested frontend values:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### Initialize the database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Start the app

```bash
npm run dev
```

Application URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health endpoint: `http://localhost:4000/health`

### Default seeded admin

- Email: `admin@demo.com`
- Password: `Admin123!`

## Build validation

```bash
npm run build
```

This project was validated with:

- Prisma client generation
- Prisma schema push
- Database seed
- Full backend TypeScript build
- Full frontend production build
- Runtime `/health` endpoint check

## Key API endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `POST /api/urls/bulk`
- `PATCH /api/urls/:id/schedule`
- `GET /api/urls/:id/history`
- `DELETE /api/urls/:id`
- `POST /api/checks/run`
- `GET /api/admin/overview`

## Sample JSON input

```json
[
	"https://www.google.com",
	"https://www.github.com",
	"https://en.wikipedia.org/saecs/Saweascasce"
]
```

## Design decisions and tradeoffs

### Why SQLite by default

I used SQLite to keep the submission easy to run without external infrastructure. Prisma isolates the persistence layer, so moving to PostgreSQL for a production version is straightforward by switching the datasource provider and updating `DATABASE_URL`.

### Why a cron-driven scheduler instead of per-URL jobs

For an interview submission, a minute-based worker that polls due URLs is simpler to reason about and still meets the scheduling/concurrency requirements. It avoids the operational overhead of adding Redis and a queue while preserving a clean upgrade path to BullMQ later.

### Why Socket.IO instead of polling-only

Socket.IO provides immediate dashboard refresh after checks complete, which makes the monitoring experience feel operational rather than static. Polling can still be added as a fallback if needed.

### Why daily aggregates plus raw history

Raw history is necessary for detailed charts and debugging. Aggregates make summary queries cheaper and set the project up for larger datasets.

## How AI was used

AI was used to speed up solution design, scaffolding, code implementation, iterative debugging, and documentation. The implementation was still validated through real build steps, database initialization, and runtime checks, and the resulting code is fully inspectable inside this repository.

## Suggested next improvements

- Swap SQLite to PostgreSQL for a production-style deployment
- Add Redis + BullMQ for dedicated background workers
- Add alerting channels such as email or Slack
- Add tests for auth, scheduler behavior, and dashboard API responses

# URL-Health-Observability-Platform-PulseBoard-
