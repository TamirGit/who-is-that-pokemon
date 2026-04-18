# Who's That Pokemon?

Generation-based Pokemon silhouette guessing game built with Next.js.

## Features

- Select one or more generations (`Gen 1` through `Gen 9`) before the game starts.
- Serves runtime Pokemon data from Postgres with Redis caching.
- Shows each Pokemon as a black silhouette until the guess is submitted.
- Tracks score across rounds and supports replay when the pool is exhausted.
- Uses a protected internal sync endpoint to refresh data from PokeAPI on a schedule.

## Environment variables

- `DATABASE_URL`: Postgres connection string.
- `REDIS_URL`: Redis connection string.
- `SYNC_API_SECRET`: Bearer token for internal sync/status endpoints.
- `CRON_SECRET` (optional): if using Vercel Cron auth header flow; can be set to same value as `SYNC_API_SECRET`.

### Setting env vars locally (without Docker)

Recommended:

1. Copy `.env.example` to `.env.local`.
2. Fill real values in `.env.local`.

Notes:

- `next dev` reads `.env.local` automatically.
- `migrate`, `seed:pokemon`, and `bootstrap` scripts also read `.env.local` automatically.

PowerShell one-off alternative (current terminal only):

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pokemon"
$env:REDIS_URL="redis://localhost:6379"
$env:SYNC_API_SECRET="your-secret"
$env:CRON_SECRET="your-secret"
```

### Setting env vars locally (with Docker Compose)

1. Copy `.env.docker.example` to `.env.docker`.
2. Fill values in `.env.docker`.
3. Run:
   - `docker compose up --build`

Compose services load `.env.docker` via `env_file`.

## Runtime flow (current behavior)

1. `GET /api/pokemon` parses selected generations and limit.
2. It tries Redis filtered cache (`pokemon:filtered:*`).
3. On miss, it tries Redis generation caches (`pokemon:generation:*`).
4. On miss again, it reads from Postgres, then repopulates Redis generation + filtered caches.
5. `source` in response is:
   - `redis` when served from Redis (filtered or generation path)
   - `db` when served from Postgres fallback

Sync flow:

1. `POST /api/internal/sync-pokemon` (authorized) runs migrations, fetches Pokemon from PokeAPI, normalizes, and upserts transactionally into Postgres.
2. After DB commit, Redis generation caches are rebuilt and stale filtered caches are evicted.
3. `GET /api/internal/sync-status` (authorized) reports last sync metadata from `sync_state`.

## Local setup (without Docker)

1. Install dependencies:
   - `npm install`
2. Run migrations:
   - `npm run migrate`
3. Seed Pokemon dataset (pulls from PokeAPI and stores in Postgres + Redis):
   - `npm run seed:pokemon`
4. Start development server:
   - `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Debugging (VS Code / Cursor)

### Local process debug

1. Start debug-mode dev server:
   - `npm run dev:debug`
2. In Run and Debug, use:
   - `Next.js: Attach Local Node (9229)`
3. For client-side breakpoints, also run:
   - `Next.js: Browser`
   - Or use the compound: `Next.js: Fullstack Local`

## Hybrid local debug (Docker services + app in IDE)

Use this when you want Postgres/Redis in containers but debug the Next.js app from your IDE process.

1. Start only dependencies:
   - `docker compose up -d postgres redis`
2. In `.env.local`, use host-accessible URLs (not docker service hostnames):
   - `DATABASE_URL=postgres://pokemon:pokemon@localhost:5432/pokemon`
   - `REDIS_URL=redis://localhost:6379`
   - `SYNC_API_SECRET=...`
   - `CRON_SECRET=...`
3. Prepare data once:
   - `npm run migrate`
   - `npm run seed:pokemon`
4. Start app from IDE (or terminal):
   - `npm run dev`
5. Attach debugger in your IDE to the local Node/Next process as usual.

Notes:

- If your `.env.local` still points to `@postgres`/`@redis`, local IDE process will fail because those hostnames exist only inside Docker network.
- Stop dependencies with `docker compose down` (or `docker compose down -v` to reset volumes).

## Local setup (production-like, Docker)

Prerequisite: Docker Desktop (or compatible Docker engine) installed.

1. Start full stack (Postgres + Redis + bootstrap + app):
   - `Copy-Item .env.docker.example .env.docker` (PowerShell, first time only)
   - `docker compose up --build`
2. Open [http://localhost:3000](http://localhost:3000)
3. Stop stack:
   - `docker compose down`
4. Stop stack and reset DB/Redis volumes:
   - `docker compose down -v`

### Access from other devices on your LAN

- App now binds to `0.0.0.0` for both `dev` and `start`.
- Find your machine IP (for example `192.168.1.23`) and open:
  - `http://192.168.1.23:3000`
- If unreachable, allow inbound TCP `3000` in your OS firewall and ensure all devices are on the same network/subnet.

Bootstrap behavior:

- `bootstrap` runs `npm run bootstrap` once.
- It runs migrations and syncs data only if `pokemon` table is empty.
- This avoids refetching from PokeAPI on every restart.

Integration tests in the same stack:

- `docker compose --profile test run --rm integration-tests`

### Docker process debug

Use dedicated debug service (includes Node inspector on `9229`):

- `docker compose --profile debug up --build postgres redis bootstrap app-debug`

Then in VS Code/Cursor:

1. Start `Next.js: Attach Docker Node (9229)`
2. Start `Next.js: Browser`
3. Or use compound: `Next.js: Fullstack Docker`

Important:

- Use `app-debug` for debugging.
- Do not start `app` and `app-debug` together (both bind `3000`).

## Test

- `npm run test`
- `npm run test:integration` (real DB+Redis integration tests; requires `DATABASE_URL` + `REDIS_URL`)

## Notes on generation mapping

This implementation maps generations by national Pokedex ID ranges:

- `Gen 1`: 1-151
- `Gen 2`: 152-251
- `Gen 3`: 252-386
- `Gen 4`: 387-493
- `Gen 5`: 494-649
- `Gen 6`: 650-721
- `Gen 7`: 722-809
- `Gen 8`: 810-905
- `Gen 9`: 906-1025

Rules are centralized in `src/lib/generationRules.ts` so you can tune them without touching UI flow.

## Sync and operations

- Internal sync endpoint: `POST /api/internal/sync-pokemon` (also supports `GET` for Vercel Cron).
- Internal status endpoint: `GET /api/internal/sync-status`.
- Both require `Authorization: Bearer <SYNC_API_SECRET>` (or `<CRON_SECRET>` if configured).
- Vercel cron is defined in `vercel.json` to run weekly.

## Vercel setup

1. Create and attach Postgres and Redis to the project (Vercel-managed or external providers).
2. Add env vars in Vercel project settings:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `SYNC_API_SECRET`
   - `CRON_SECRET` (optional; can equal `SYNC_API_SECRET`)
3. After first deployment, initialize data:
   - Option A: run one-time seed from CI or local with production env:
     - `npm run migrate`
     - `npm run seed:pokemon`
   - Option B: call internal sync endpoint once:
     - `POST /api/internal/sync-pokemon` with `Authorization: Bearer <SYNC_API_SECRET>`
4. Keep weekly refresh enabled via `vercel.json` cron.

## Secret handling guidance

- Never commit real secrets to git.
- Keep `.env.local` and `.env.docker` local-only (ignored by `.gitignore`).
- In Vercel, store secrets only in Project Settings -> Environment Variables.
- Rotate `SYNC_API_SECRET`/`CRON_SECRET` periodically and after any suspected leak.
- Use different secrets for local, staging, and production.
