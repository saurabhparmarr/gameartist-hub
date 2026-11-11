# GameArtist Hub

**A portfolio and project platform connecting game artists with independent studios.**

## Live demo and API links

| Service | Link |
|---|---|
| Frontend | https://gameartist-hub-wl76.vercel.app |
| API | API routes use `/api/v1`; the deployed base URL is supplied through `VITE_API_URL`. No production API URL is defined in repository configuration. |

On free-tier hosting, the API may respond slowly to its first request after a period of inactivity.

## Screenshots

Add real screenshots to `docs/screenshots/`; no screenshots are included yet.

| Page | Screenshot |
|---|---|
| Home | `docs/screenshots/home.png` |
| Artist profile | `docs/screenshots/artist.png` |
| Projects | `docs/screenshots/projects.png` |
| Admin panel | `docs/screenshots/admin.png` |

## Features

### Artists

- Register and sign in as an artist.
- Create and update a profile with skills, experience, biography, location, and portfolio-related URLs.
- Publish and manage portfolio items.
- Browse artists and open projects; message other users.

### Studios

- Register and sign in as a studio.
- Create projects, manage project status, and view the studio's own projects.
- Browse and save artists; message other users.
- `/studios` is a studio-focused landing page, not a studio directory.

### Admin

- Access a protected dashboard with user and project statistics.
- Search and paginate artist, studio, user, and project records.
- Disable or reactivate artist and studio accounts.
- Remove projects and inspect pending audit actions.

Public registration is limited to artist and studio roles. Admin accounts are provisioned by a server operator. See [Admin panel documentation](docs/ADMIN_PANEL.md).

## Technology stack

| Area | Technologies |
|---|---|
| Frontend | React, React Router, Vite, Tailwind CSS v4, Axios |
| Backend | Node.js, Express 5, JavaScript ES modules |
| Database | MongoDB, Mongoose |
| Authentication | JWT and bcryptjs |
| Testing | Vitest, Testing Library, Node.js test runner, Supertest, MongoMemoryServer |

## Architecture

```text
Browser
  └── React/Vite application (client/)
        └── JSON API requests with Bearer JWT
              └── Express API (server/, /api/v1)
                    ├── Authentication and role/ownership checks
                    ├── Controllers and validation
                    └── Mongoose models → MongoDB
```

The frontend and backend are independently configured applications. The frontend reads its API base URL from `VITE_API_URL`. The backend connects to MongoDB using `MONGODB_URI`; protected API requests verify a JWT and reload the account's role and active status.

## Getting started

Use a local or approved development MongoDB database. Do not configure local scripts with production credentials or a production database.

### Backend

Bash:

```bash
cd server
cp .env.example .env
npm ci
npm run dev
```

PowerShell:

```powershell
Set-Location server
Copy-Item .env.example .env
npm ci
npm run dev
```

Edit `server/.env` for local use. The example uses port `5050`, database `gameartisthub`, and `http://localhost:5173` as the allowed frontend origin. Set a private local `JWT_SECRET`. The server defaults to port `5000` if `PORT` is unset.

### Frontend

In another terminal, copy the frontend example and start Vite:

Bash:

```bash
cd client
cp .env.example .env
npm ci
npm run dev
```

PowerShell:

```powershell
Set-Location client
Copy-Item .env.example .env
npm ci
npm run dev
```

The example `VITE_API_URL` points to `http://localhost:5050/api/v1`. Vite prints the local frontend URL (normally `http://localhost:5173`).

### Optional database seeding

The optional seed entry point can be run from `server/` with `node seed/seedDatabase.js`. It requires `MONGODB_URI` and `SEED_DEMO_PASSWORD`; it writes demo records unless `SEED_DRY_RUN=true`. The expected database is `gameartisthub`; setting `SEED_CONFIRM_DATABASE` to another database's exact name explicitly approves that target. The script can create or update demo records and password hashes. Review the script and confirm the database before use; never run it against production.

### Optional admin provisioning

The server package provides `npm run admin:create`. From `server/`, run it only when `MONGODB_URI` targets the intended local or explicitly approved database. It prompts interactively for the account details and hidden password. Public registration cannot create admin accounts. Do not put credentials in the repository.

## Tests

Run the backend checks from `server/`:

```bash
npm test
npm audit --audit-level=moderate
```

Run the frontend checks from `client/`:

```bash
npm test
npm audit --audit-level=moderate
VITE_API_URL=https://api.example.invalid/api/v1 npm run build
```

PowerShell build equivalent:

```powershell
$env:VITE_API_URL = "https://api.example.invalid/api/v1"
npm run build
```

The `.invalid` URL is a build-time placeholder, not a working API. Backend tests use MongoMemoryServer. The checked-in CI workflow installs each app's dependencies, runs both test suites and dependency audits, and builds the frontend; this describes the workflow, not the result of a particular run.

## API overview

The API prefix is `/api/v1`. Protected endpoints require `Authorization: Bearer <JWT>`. Artist and studio actions are restricted by role and resource ownership; all admin routes additionally require the admin role.

| Area | Endpoints (relative to `/api/v1`) | Access |
|---|---|---|
| Authentication | `POST /auth/register`, `POST /auth/login` | Public; registration accepts artist or studio |
| Artists | `GET /artists`, `GET /artists/:id` | Public |
| Artist profile | `POST /artists/profile`, `PUT /artists/profile` | Artist; own profile |
| Portfolio | `GET /portfolio`, `GET /portfolio/:id` | Public |
| Portfolio management | `POST /portfolio`, `PUT /portfolio/:id`, `DELETE /portfolio/:id` | Artist; mutations restricted to owner |
| Projects | `GET /projects`, `GET /projects/:id` | Public; listing contains open projects |
| Studio projects | `GET /projects/mine`, `POST /projects`, `PUT /projects/:id`, `DELETE /projects/:id` | Studio; own projects |
| Saved artists | `GET /saved-artists`, `POST /saved-artists/:artistId`, `DELETE /saved-artists/:artistId` | Studio; own saved list |
| Messages | `GET /messages`, `GET /messages/:userId`, `POST /messages/:receiverId` | Authenticated users; history is limited to the requested pair |
| Admin | `GET /admin/dashboard`, `GET /admin/users`, `GET /admin/artists`, `GET /admin/studios`, `GET /admin/projects`, `GET /admin/audit-logs/pending`, `PATCH /admin/users/:id/status`, `DELETE /admin/projects/:id` | Admin |
| Health | `GET /`, `GET /ready` | Public; liveness and MongoDB readiness |

Message conversation and history endpoints support cursor pagination; requests without pagination parameters retain legacy full-array response behavior. See the [admin endpoint and access details](docs/ADMIN_PANEL.md#admin-api-table).

## Deployment

The repository includes a Vercel SPA rewrite at `client/vercel.json`; hosting account settings and a production API URL are not stored in the repository.

For a Vercel frontend, configure the client app's build with `npm ci` and `npm run build`, publish `dist/`, and set `VITE_API_URL` to the approved HTTPS API base URL ending in `/api/v1`.

For a Render backend, configure the server app to run `npm start`, and set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `CORS_ORIGINS` in the service environment. In production, `CORS_ORIGINS` must include the approved frontend origin; Mongoose automatic index creation is disabled. Confirm the deployment root, health check, branch/auto-deploy behavior, and environment values in the hosting projects before release.

## Known limitations

- JWT tokens are stored in browser `localStorage`. Migration to HttpOnly cookies is a roadmap consideration, not an implemented feature.
- Profile and portfolio images are URLs; image upload/storage is not implemented.
- Messaging uses HTTP requests and is not real-time.
- `/studios` is a landing page, not a studio directory; project applications are not implemented.
- The admin panel has no audit-history page or pending-action resolution workflow.
- See the [client handover known limitations](docs/CLIENT_HANDOVER.md#known-limitations) for more detail.

## Documentation links

- [Client handover](docs/CLIENT_HANDOVER.md)
- [Admin panel](docs/ADMIN_PANEL.md)

## Contributing

Open an issue or pull request with a clear description of the change. Add or update tests for behavior changes, and run the relevant tests, dependency audit, frontend build, and `git diff --check` before submitting. Do not include credentials, secrets, or private user information in issues, screenshots, or commits.
