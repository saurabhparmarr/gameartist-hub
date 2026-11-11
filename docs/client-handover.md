# Client Handover

This handover describes functionality and configuration visible in the repository. It distinguishes implemented behavior from possible future work and does not assert that a particular production deployment or database has been verified.

## Project overview

GameArtist Hub is a React web application backed by an Express API and MongoDB. Artists can present profiles and portfolios; studios can publish projects and save artists; authenticated users can exchange messages. A separate admin console provides account and project oversight.

## Features currently implemented

### Artist

- Artist account registration and login.
- Artist profile creation/update, profile discovery, and profile pages.
- Portfolio item creation, editing, deletion, and public display.
- Browsing open projects, saving profile/portfolio image URLs, and messaging.

### Studio

- Studio account registration and login, including creation of an initial studio profile.
- Studio project creation, editing, deletion, and project listing.
- Artist discovery and saved-artist management.
- Messaging artists.

### Administrator

- Server-protected admin dashboard with database-backed counts and recent records.
- Paginated/searchable artist, studio, user, and project management lists.
- Artist/studio activation and deactivation, with a restriction against changing the current admin's own account.
- Confirmed project removal.
- Audit record creation for account-status and project-removal actions, plus a read-only pending-record API.
- Admin accounts provisioned by a server-side interactive script, not public registration.

See the [Admin Panel Guide](./admin-panel.md) for precise workflows, endpoint contracts, and audit limitations.

## Planned or not currently implemented

These are not included in the current application behavior:

- Project applications, hiring/contract management, or application tracking.
- Real-time/WebSocket message delivery, push notifications, or message search.
- Image upload/storage; profile and portfolio images are URL fields.
- A public directory of studio profiles. `/studios` is a studio-focused landing page.
- A studio profile editor covering all profile fields.
- Full admin audit history UI or an action to resolve/retry pending audit records.
- Granular admin permission tiers or multi-factor authentication.

Treat these as potential future scope, not as completed handover deliverables.

## User roles and permissions

| Role | Main capabilities |
|---|---|
| Guest | Browse public artist profiles, portfolio items, and open projects; register as an artist or studio; sign in |
| Artist | Manage their own profile and portfolio, browse projects/artists, and use messaging |
| Studio | Manage their own projects and saved-artist list, browse artists, and use messaging |
| Admin | Access protected admin APIs and console; manage artist/studio account status and remove projects |

The backend verifies JWTs and loads the user's current role and active status from MongoDB on protected requests. Resource mutations are restricted to the appropriate role and owner. Disabled accounts cannot log in or continue making authenticated requests; their records remain in the database.

## Application architecture

```text
Browser
  └── React + Vite client (client/)
        └── HTTPS JSON requests, Bearer JWT
              └── Express API (server/, /api/v1)
                    ├── Authentication and role/ownership middleware
                    ├── Route controllers and validation
                    └── Mongoose models
                          └── MongoDB
```

The frontend and backend are independently deployable. The client API base URL is `VITE_API_URL`. Backend configuration includes database connectivity, JWT signing, allowed CORS origins, request limits, and production security headers. CI is defined in `.github/workflows/ci.yml`.

### Main code areas

- `client/src/pages/` and `client/src/components/`: user-facing and admin pages/shared UI.
- `client/src/context/` and `client/src/services/`: browser session and HTTP/API helpers.
- `server/routes/`: health, auth, artist, portfolio, project, saved-artist, message, and admin API routes.
- `server/controllers/`: endpoint behavior and data access.
- `server/middleware/`: JWT authentication, admin access, and centralized errors.
- `server/models/`: User, ArtistProfile, Studio, Portfolio, Project, SavedArtist, Message, and AdminAuditLog.
- `server/scripts/createAdmin.js`: explicit admin account provisioning.
- `server/tests/` and `client/src/**/*.test.*`: backend and frontend automated tests.

## Database overview

MongoDB stores:

- `User`: name, unique email, bcrypt password hash, role, active state, timestamps.
- `ArtistProfile` and `Studio`: role-specific profile information linked to a user.
- `Portfolio`: artist-owned portfolio entries.
- `Project`: studio-owned listings.
- `SavedArtist`: studio-to-artist saved relations.
- `Message`: sender, receiver, content, read state, timestamps.
- `AdminAuditLog`: administrative action metadata and status.

MongoDB references are represented as Mongoose ObjectIds. Account deactivation does not delete related records. Admin project removal deletes the project record; the current schema has no project-application records to cascade. Production auto-indexing is disabled; schema/index changes need a separately reviewed and approved maintenance plan.

## Deployment architecture and verification status

The repository is arranged for a Vercel frontend and a separate Render API, but the platform dashboards, deployment triggers, branch settings, and production database identity have not been verified as part of this documentation.

On November 11, 2026, both `https://gameartist-hub.vercel.app` and `https://gameartist-hub-wl76.vercel.app` returned HTTP 200 and served matching app title/assets. This does not identify the canonical production hostname. The repository-referenced `https://gameartist-hub.onrender.com` returned HTTP 200 at `/` and `/ready` at that time; this is not proof of a particular Render service or database.

Before sharing official live URLs or changing a deployment, the client/project owner should confirm:

1. The canonical frontend domain and Vercel project.
2. The Render service, connected repository/branch, auto-deploy policy, and health check.
3. That frontend `VITE_API_URL`, backend `CORS_ORIGINS`, and backend `MONGODB_URI` point to the intended environments.
4. Which branch is configured for production and whether a staging environment exists.

No staging compatibility or end-to-end production behavior is claimed as verified by these HTTP checks.

## Environment variables

Use placeholders in docs and keep real values in the appropriate local or hosting secret store. The checked-in `.env.example` files contain development examples; do not copy them unchanged into a production environment.

The client `.gitignore` excludes `.env*` files except `.env.example`. The server/.gitignore file ignores environment files, including suffixed variants such as .env.local, .env.production, and .env.development, while allowing example files such as .env.example and .env.production.example to remain trackable. Do not store production secrets in the repository.

| Variable | Component | Purpose |
|---|---|---|
| `VITE_API_URL` | Frontend | Absolute API base URL, ending in `/api/v1`; bundled into the client at build time |
| `PORT` | Backend | HTTP listen port; hosting platforms commonly provide this automatically |
| `MONGODB_URI` | Backend | MongoDB connection string for the selected environment |
| `JWT_SECRET` | Backend | Private signing secret for authentication tokens |
| `JWT_EXPIRES_IN` | Backend | JWT lifetime; the application defaults to `7d` when unset |
| `CORS_ORIGINS` | Backend | Comma-separated exact browser origins allowed to call the API; required in production |
| `NODE_ENV` | Backend | Set to `production` for a production deployment; controls production startup and index behavior |
| `SEED_DEMO_PASSWORD` | Optional seed only | Password used by the demo-data script for its demo accounts; minimum 8 characters |
| `SEED_DRY_RUN` | Optional seed only | Set to `true` to prevent seed writes |
| `SEED_CONFIRM_DATABASE` | Optional seed only | Exact database name required to authorize seeding a database other than the script's default `medisync` |

The demo seed script is not part of normal application startup. It connects to `MONGODB_URI`, requires `SEED_DEMO_PASSWORD`, and can create/update demo records and password hashes unless dry-run is enabled. Do not run it against production. The admin provisioning script uses the configured `MONGODB_URI` and does not have a dedicated admin password environment variable.

## Run locally

Use a local or specifically approved development MongoDB database. Never reuse production credentials or point development scripts at production.

### Backend

```powershell
cd C:\gameartist-hub\server
Copy-Item .env.example .env
# Edit .env: keep MONGODB_URI on a local/development database and set a private JWT_SECRET.
npm ci
npm run dev
```

The checked-in backend example uses `PORT=5050`, database name `medisync`, and `CORS_ORIGINS=http://localhost:5173`. The server defaults to port `5000` if `PORT` is unset.

### Frontend

In another terminal:

```powershell
cd C:\gameartist-hub\client
Copy-Item .env.example .env
npm ci
npm run dev
```

The frontend example uses `VITE_API_URL=http://localhost:5050/api/v1`. Keep it consistent with the backend port. Vite prints the local frontend URL when started.

### Local administrator (optional)

To create an administrator in the configured local/approved database, run `npm run admin:create` from `server/` in an interactive terminal. Confirm `MONGODB_URI` before running it. The script prompts for identity details and a hidden password; it does not provision through public registration.

## Testing and quality checks

Run commands in the relevant package folder:

```powershell
cd C:\gameartist-hub\server
npm test
npm audit --audit-level=moderate

cd C:\gameartist-hub\client
npm test
npm audit --audit-level=moderate
$env:VITE_API_URL = "https://api.example.invalid/api/v1"
npm run build
```

The `.invalid` address is a reserved placeholder used to satisfy the production build's API URL validation; it is not a service to run against. The backend tests use isolated MongoMemoryServer fixtures. The CI workflow uses Node.js 22, runs both test suites and dependency audits, and builds the frontend. A local pass alone does not demonstrate that hosted CI or staging passed.

## Known limitations and maintenance recommendations

- Browser authentication tokens are stored in `localStorage`; assess XSS exposure and consider a separately reviewed HttpOnly-cookie migration if appropriate.
- Messaging is request/response based and has no real-time delivery.
- Images are externally hosted URLs, not uploaded files.
- The `/studios` page is not a directory backed by studio records.
- There is no project-application workflow.
- Audit log pending records have no admin UI resolution action. Compare the record's target with current database state before any manual remediation.
- Disabled accounts are retained, not erased. Confirm retention and reactivation policy with the data owner.
- Destructive project removal is permanent. Confirm moderation, retention, and recovery requirements before production use.
- Monitor `/ready` (MongoDB readiness) separately from `/` (process liveness).
- Review dependency updates and CI findings before upgrading. Keep secrets in platform secret stores, rotate credentials through approved procedures, and ensure backup/restore procedures are owned and tested.
- Review production index changes separately because Mongoose auto-indexing is disabled in production.

## Client configuration and approvals

The client/project owner should supply or approve:

- Canonical Vercel domain, Render service and deployment branch, and staging/production release process.
- Per-environment MongoDB connection and backup/retention policy.
- Secret generation, access control, and rotation for `JWT_SECRET` and database credentials.
- Approved CORS origins and production frontend API URL.
- Admin-account provisioning and administrator access policy.
- Policies for account deactivation/reactivation, project removal, audit record retention, and manual pending-action reconciliation.
- Hosting plans for image uploads, real-time messaging, studio discovery, or project applications if these are required.

No credentials, personal contact details, real database records, or production secrets are included in this handover.
