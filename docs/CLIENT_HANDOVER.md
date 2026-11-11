# Client Handover

## Overview

GameArtist Hub is a React application with an Express API and MongoDB database. It supports artist profiles and portfolios, studio project listings, saved artists, messaging, and a protected admin console.

This guide describes behavior represented in the repository. Deployment credentials, provider dashboard settings, and production database configuration must be supplied and approved by the project owner. For local setup commands, see the [README](../README.md).

## Implemented features by role

### Artist

- Register and sign in as an artist.
- Create or update an artist profile with biography, skills, experience, location, profile image URL, and software/tool information.
- Browse public artist profiles, portfolio items, and open projects.
- Create, update, and delete own portfolio items.
- Send and receive authenticated messages.

### Studio

- Register and sign in as a studio; registration creates an initial studio profile.
- Create, view, update, and delete own projects.
- Browse open projects and artists, and manage the studio's saved-artist list.
- Send and receive authenticated messages.
- A complete studio-profile editing flow is not implemented.

### Admin

- Sign in through the shared login API using a provisioned admin account.
- View database-backed dashboard statistics and recent records.
- Search and paginate artist, studio, user, and project lists.
- Disable or reactivate artist and studio accounts.
- Permanently remove projects.
- Query pending audit records through a protected read-only endpoint.

See the [admin panel guide](./ADMIN_PANEL.md) for endpoint details and operational limitations.

## Roles and permissions

| Role | Implemented access |
|---|---|
| Guest | Browse public artist/profile and portfolio data, and project listings/details (the listing contains open projects); register as an artist or studio |
| Artist | Access artist dashboard; create/update own artist profile and manage own portfolio; use authenticated messaging |
| Studio | Access studio dashboard; manage own projects and saved-artist list; use authenticated messaging |
| Admin | Access `/admin/*` APIs and admin pages; manage artist/studio account status and remove projects |

Protected API requests verify the JWT and load the account's current role and active status from MongoDB. Role and ownership checks are enforced by backend middleware/controllers, not just frontend routes. Disabled accounts cannot log in or continue using protected APIs. Admin accounts cannot be created through public registration.

## Architecture

```text
Browser
  └── React + Vite frontend (client/)
        └── JSON API requests / Bearer JWT
              └── Express API (server/, /api/v1)
                    ├── Authentication and role/ownership checks
                    ├── Controllers and validation
                    └── Mongoose models → MongoDB
```

The client uses `VITE_API_URL` as its API base URL. The Express service connects to MongoDB with Mongoose. Major code areas are `client/src/pages/`, `client/src/components/`, `client/src/services/`, `server/routes/`, `server/controllers/`, `server/middleware/`, and `server/models/`.

## Database

Mongoose models represent:

- `User`: name, unique email, password hash, role (`artist`, `studio`, `admin`), and active status.
- `ArtistProfile` and `Studio`: profile data linked to users.
- `Portfolio`: artist-owned work.
- `Project`: studio-owned listings with `open` or `closed` status.
- `SavedArtist`: studio/artist relationship.
- `Message`: sender, receiver, content, and read state.
- `AdminAuditLog`: admin action, target, request metadata, and pending/completed/failed status.

Local environment examples use database name `gameartisthub`. Backend tests use an isolated MongoMemoryServer database with the same name; they do not use `MONGODB_URI`. In production, Mongoose `autoIndex` is disabled, so index changes need a separately reviewed database maintenance plan. Account deactivation retains records; project deletion removes the project document.

## Deployment

The frontend contains `client/vercel.json` for SPA route rewrites. There is no Render deployment manifest or provider dashboard configuration in the repository. The frontend and backend are separate deployable applications; the intended hosting providers are Vercel and Render, but project ownership must verify the live settings.

### Project-owner pre-launch checklist

- [ ] Confirm the canonical frontend domain and the Vercel project/domain assignment.
- [ ] Confirm the Render service, service root, connected repository/branch, auto-deploy policy, and health-check path.
- [ ] Set `VITE_API_URL` to the approved HTTPS API base URL ending in `/api/v1`.
- [ ] Set production `MONGODB_URI` to the intended `gameartisthub` database and verify backups/restore access.
- [ ] Set a strong private `JWT_SECRET`; confirm the token lifetime policy.
- [ ] Set `CORS_ORIGINS` to the exact approved frontend origin(s).
- [ ] Verify `NODE_ENV=production` and hosting-provided `PORT`.
- [ ] Confirm admin-account provisioning and access/recovery ownership.
- [ ] Confirm account deactivation, project moderation/deletion, and audit retention procedures.
- [ ] Validate login and role-specific workflows in an approved staging environment before production release.
- [ ] Confirm deployment branch behavior with the hosting providers; a push may trigger an automatic build/deploy according to their settings.

The repository does not establish that a staging environment or a particular production API URL is configured.

## Environment variables

Variable names below are taken from the application and checked-in examples. Keep actual secret values in local ignored files or provider secret stores; do not put them in commits.

| Variable | Component | Purpose and behavior |
|---|---|---|
| `VITE_API_URL` | Frontend | API base URL, normally ending in `/api/v1`; bundled into the frontend at build time. The client fallback is `http://localhost:5000/api/v1`; the example uses port `5050`. |
| `PORT` | Backend | HTTP listen port; defaults to `5000` when unset. |
| `MONGODB_URI` | Backend | MongoDB connection string. The checked-in local example targets database `gameartisthub`. |
| `JWT_SECRET` | Backend | Required for backend startup and JWT verification/signing. |
| `JWT_EXPIRES_IN` | Backend | JWT lifetime; defaults to `7d` if unset. |
| `CORS_ORIGINS` | Backend | Comma-separated allowed browser origins. Required at production startup; the example allows `http://localhost:5173`. |
| `NODE_ENV` | Backend | When set to `production`, startup requires CORS configuration and Mongoose automatic index creation is disabled. |
| `SEED_DEMO_PASSWORD` | Optional seed script | Password used for demo accounts; the script requires at least 8 characters. Do not publish or reuse an actual account password. |
| `SEED_DRY_RUN` | Optional seed script | Set to `true` to report planned counts without writing demo records. |
| `SEED_CONFIRM_DATABASE` | Optional seed script | Exact database name used to explicitly approve seeding a database other than `gameartisthub`. |

The seed script requires `MONGODB_URI` and checks the connected database name. It can write demo users and related records and may update demo password hashes; review its code and target before use. Never run it against production without explicit authorization.

## Run locally

Use the [README getting-started instructions](../README.md#getting-started). In brief, create ignored `server/.env` and `client/.env` files from their examples, point the backend to a local/approved development database, and run each app from its own directory. Backend example port is `5050`; the frontend example targets `http://localhost:5050/api/v1`. The Express API prefix is `/api/v1`.

The optional admin provisioning command is `npm run admin:create` from `server/`; use it only after confirming the configured database. The optional seed entry point is `node seed/seedDatabase.js` from `server/`. Neither command is run by normal app startup or the test suite.

## Testing and CI

Backend tests are invoked with `npm test` from `server/`. Frontend tests are invoked with `npm test` from `client/`; the frontend build uses `npm run build`. The backend tests use MongoMemoryServer rather than the configured `MONGODB_URI`.

The checked-in GitHub Actions workflow uses Node.js 22, runs `npm ci`, dependency audits and tests in both app directories, then builds the frontend with a reserved `.invalid` API URL. This documents the configured workflow; it does not assert that a particular CI run or deployment passed. See the [README tests section](../README.md#tests) for commands.

## Known limitations

- `/studios` is a marketing/landing page, not a studio directory.
- Studio project management exists; a complete studio profile editor and project application workflow do not.
- Messaging uses HTTP requests; real-time delivery and push notifications are not implemented.
- Profile and portfolio artwork use URLs; upload and hosted asset management are not implemented.
- Admin pending-audit records have a read-only API but no admin UI for audit history or resolving/retrying actions.
- Project removal is permanent; no soft-delete/restore mechanism is implemented.
- JWTs are stored in browser `localStorage`, where JavaScript running in the origin can access them. Migration to HttpOnly cookies is a possible future security improvement, not an implemented feature.
- Public project discovery lists open projects; there is no hiring/application workflow.
- Vercel/Render dashboard settings and canonical production URLs are owner-managed and are not defined by the repository.

## Maintenance recommendations

- Keep secrets in provider-managed secret stores; rotate them through an approved process.
- Monitor API liveness at `/` and database readiness at `/ready`.
- Review dependency audit findings and test upgrades before release.
- Maintain and test database backups and restoration procedures.
- Review schema/index changes separately; production auto-indexing is disabled.
- Consider a security review before changing browser session storage or adding upload/realtime services.
- Test deployment and role-specific workflows in staging before production changes.

## Decisions needed from the owner

- Canonical Vercel frontend URL and approved public API URL.
- Vercel/Render project ownership, connected branch, auto-deploy behavior, and release approvals.
- Production/staging MongoDB ownership, database name, backups, retention, and access policy.
- Admin provisioning, account recovery, and access-review process.
- Data retention and moderation policy for disabled users, audit records, and removed projects.
- Whether future work should include HttpOnly-cookie authentication, image uploads, real-time messaging, studio discovery, or project applications.

See also: [README](../README.md), [this client handover](./CLIENT_HANDOVER.md), and [Admin panel guide](./ADMIN_PANEL.md).
