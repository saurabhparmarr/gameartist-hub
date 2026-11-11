# GameArtist Hub

GameArtist Hub is a web application for discovering game artists, showcasing portfolios, publishing studio project listings, saving artists, and communicating through direct messages. It provides separate workflows for artists and studios, plus a protected administration area.

## Documentation

- [Admin panel guide](docs/admin-panel.md)
- [Client handover guide](docs/client-handover.md)
- [API overview](#api-overview)
- [Local setup](#local-development)
- [Deployment guidance](#deployment-guidance)

## Project status and links

The following frontend addresses were checked on **November 11, 2026**. Both returned the GameArtist Hub page with the same title and asset references. That confirms they were reachable, but does **not** establish which is the canonical production domain:

- [gameartist-hub.vercel.app](https://gameartist-hub.vercel.app)
- [gameartist-hub-wl76.vercel.app](https://gameartist-hub-wl76.vercel.app)

Please confirm the primary domain in the Vercel project before treating either address as the official production link. The Render dashboard and deployment configuration were not inspected.

The backend URL referenced by the repository, `https://gameartist-hub.onrender.com`, returned HTTP 200 for `/` and `/ready` when checked on the same date. This is a point-in-time reachability check, not verification of the hosting configuration, database identity, or a full end-to-end production flow.

- Repository: [saurabhparmarr/gameartist-hub](https://github.com/saurabhparmarr/gameartist-hub)
- Screenshots: none are checked into this repository yet.

## What the application does

### Artist workflows

- Register and sign in as an artist.
- Create and edit an artist profile with biography, skills, experience, location, profile image URL, and software/tool information.
- Browse open projects and discover other public artists.
- Create, update, list, and delete portfolio items.
- Save profile and portfolio image URLs; file uploads are not implemented.
- Send and receive private, request/response messages.
- Use an artist dashboard to manage profile and portfolio information.

### Studio workflows

- Register and sign in as a studio.
- Create and update a studio profile during registration; the current UI does not provide a complete studio-profile editing workflow.
- Create, list, update, and delete the studio's own projects.
- Browse and save artists, then manage the studio's saved-artist list.
- Message artists.

### Admin workflows

- Sign in using a provisioned admin account; public registration cannot create admins.
- View database-backed user/project totals and recent registrations/projects.
- Search and paginate artist, studio, user, and project lists.
- Disable or reactivate artist/studio accounts.
- Remove projects.
- Inspect pending audit records and their read-only reconciliation assessment.

The admin API is protected independently of the frontend route guard. See the [admin panel guide](docs/admin-panel.md) for access rules, available endpoints, audit behavior, and limitations.

## Technology

| Area | Technologies |
|---|---|
| Frontend | React, React Router, Vite, Tailwind CSS v4, Axios |
| Backend | Node.js, Express 5, JavaScript ES modules |
| Database | MongoDB, Mongoose |
| Authentication | JWT bearer tokens, bcryptjs password hashing |
| Tests | Vitest, Testing Library, Node.js test runner, Supertest, MongoMemoryServer |
| Hosting model | Frontend and API are separate deployments; the repository describes Vercel and Render respectively, but their dashboard settings have not been verified here |

## Architecture and repository layout

```text
.
├── client/
│   ├── public/                 # Static frontend assets
│   ├── src/
│   │   ├── components/         # Shared UI, layouts, and route guards
│   │   ├── context/            # Authentication context
│   │   ├── pages/              # Artist, studio, public, and admin pages
│   │   └── services/           # HTTP/API clients
│   ├── vercel.json             # SPA route rewrite
│   └── package.json
├── server/
│   ├── config/                 # MongoDB connection
│   ├── controllers/            # Request handlers
│   ├── middleware/             # Authentication, authorization, errors
│   ├── models/                 # Mongoose schemas and indexes
│   ├── routes/                 # Versioned API route modules
│   ├── scripts/                # Admin account provisioning
│   ├── seed/                   # Optional demo-data script
│   ├── tests/                  # Backend tests and isolated DB setup
│   ├── utils/                  # API response and security helpers
│   ├── app.js                  # Express application and middleware
│   ├── server.js               # Environment validation, DB startup, listener
│   └── package.json
└── .github/workflows/ci.yml    # CI tests, audits, and frontend build
```

The browser calls the Express API at a configurable `/api/v1` base URL. Express authenticates protected requests with a JWT, loads the current user from MongoDB, and enforces role and ownership checks in middleware/controllers. MongoDB stores users, profiles, portfolios, projects, saved artists, messages, and admin audit records.

## Local development

### Requirements

- Node.js 22 is used in the checked-in CI workflow. Mongoose 9 requires a supported modern Node.js runtime; use a currently supported Node.js release.
- npm.
- A local MongoDB instance, or another development database you are authorized to use. Do not point local scripts at production.

### Configure the backend

In PowerShell:

```powershell
cd C:\gameartist-hub\server
Copy-Item .env.example .env
```

Edit `server/.env` for your local setup. Use a private random `JWT_SECRET` and a database URI that points only to a local/development database. The example uses port `5050`, a local MongoDB database named `medisync`, and a local frontend origin.

```powershell
npm ci
npm run dev
```

The backend loads `.env` when started from `server/`. Its default port in `server.js` is `5000`; the checked-in example sets `PORT=5050`.

### Configure and run the frontend

In a second terminal:

```powershell
cd C:\gameartist-hub\client
Copy-Item .env.example .env
npm ci
npm run dev
```

The frontend example points to `http://localhost:5050/api/v1`, matching the backend example's port. Vite prints its local URL (normally `http://localhost:5173`). If you change the API port or host, update both `PORT` and `VITE_API_URL` as appropriate.

### Optional demo data

`server/seed/seedDatabase.js` can create or refresh predefined demo accounts and related records. It connects to the configured MongoDB database and writes data unless `SEED_DRY_RUN=true`; it can update existing demo account password hashes. It refuses to run against a database other than `medisync` unless explicitly confirmed. Do not run it against production or an unapproved database. No seed script is run as part of normal startup or tests.

### Provision an administrator

Admin registration is not available through the public registration API. To create an admin in an explicitly chosen development or approved database, configure that database URI in the backend environment, then run `npm run admin:create` from `server/`. The script asks for the name and email and prompts for a hidden password (minimum 12 characters). It creates no account if the email already exists. Review the [admin panel guide](docs/admin-panel.md) before provisioning.

## API overview

Local API base URL: `http://localhost:5050/api/v1` when using the checked-in development examples. The production API URL must be configured by the deployment owner; a repository-referenced URL is listed above with its verification limitations.

Successful responses use a JSON envelope containing `success`, `message`, and `data` (and `statusCode`). Error responses use `success: false` and a message. Protected routes require an `Authorization: Bearer <JWT>` header. The API resolves the user from the JWT subject on each request and checks the account's current role and active status.

| Area | Endpoints | Access |
|---|---|---|
| Authentication | `POST /auth/register`, `POST /auth/login` | Public; registration accepts artist or studio |
| Artists | `GET /artists`, `GET /artists/:id` | Public |
| Artist profile | `POST /artists/profile`, `PUT /artists/profile` | Artist JWT; current account only |
| Portfolio | `GET /portfolio`, `GET /portfolio/:id` | Public |
| Portfolio changes | `POST /portfolio`, `PUT /portfolio/:id`, `DELETE /portfolio/:id` | Artist JWT; writes restricted to owner |
| Projects | `GET /projects`, `GET /projects/:id` | Public |
| Studio projects | `GET /projects/mine`, `POST /projects`, `PUT /projects/:id`, `DELETE /projects/:id` | Studio JWT; mutations restricted to owner |
| Saved artists | `GET /saved-artists`, `POST /saved-artists/:artistId`, `DELETE /saved-artists/:artistId` | Studio JWT; own saved list |
| Messaging | `GET /messages`, `GET /messages/:userId`, `POST /messages/:receiverId` | Any authenticated user; conversation limited to participants |
| Administration | `/admin/*` (see [endpoint details](docs/admin-panel.md#admin-api)) | Admin JWT |
| Health | `GET /`, `GET /ready` | Public; liveness and MongoDB readiness respectively |

Artist, portfolio, project, and admin collection endpoints support server-side pagination where implemented. Message conversation summaries and history support cursor pagination (maximum page size 50). Message APIs retain legacy full-array responses when pagination parameters are omitted; the current frontend accepts responses both with and without pagination metadata. This supports independently deployed old/new frontend and backend versions, but an older backend cannot provide the cursor-based load-more experience.

## Tests and checks

Run each suite from its own package directory:

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

The backend test setup creates an isolated MongoMemoryServer database. The frontend build requires an absolute HTTPS `VITE_API_URL` ending in `/api/v1`; the reserved `.invalid` URL above is only a build-time placeholder, not a working API. GitHub Actions runs tests, dependency audits, and the frontend build on pushes and pull requests. A local pass does not establish that a remote CI run or staging deployment passed.

## Deployment guidance

The instructions below describe the repository's deployment shape, not verified account settings. Confirm current Vercel/Render dashboards, branch triggers, domains, and environment values with the project owner before deployment.

### Frontend on Vercel

- Configure the project root as `client/`.
- Use `npm ci` for install, `npm run build` for build, and `dist` as the output directory.
- Set `VITE_API_URL` to the approved HTTPS backend API base URL ending in `/api/v1`.
- `client/vercel.json` rewrites SPA paths to `/`, supporting client-side routes and refreshes.
- Confirm which of the two reachable frontend candidates above is the canonical production domain.

### Backend on Render

- Configure the service root as `server/` and start command as `npm start`.
- Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `CORS_ORIGINS` in the hosting dashboard. `CORS_ORIGINS` must contain the exact approved frontend origin; production startup rejects a missing allowed-origin setting.
- The service listens on `PORT` supplied by the platform (with a local default of `5000`).
- Choose health-check behavior intentionally: `/` checks process liveness; `/ready` requires a successful MongoDB ping.
- `autoIndex` is disabled when `NODE_ENV=production`. Review schema index changes and handle any required database index work as a separately approved maintenance operation; no production migration or index operation is documented as already completed.

## Current limitations and future work

### Current limitations

- The `/studios` frontend page is a studio-focused marketing/landing page; there is no public studio directory API.
- Studio project management is implemented, but public project discovery returns open projects. There is no project-application workflow.
- Messaging uses HTTP requests; there are no WebSockets, push notifications, or real-time delivery.
- Artist profile and portfolio images are URL fields; the application does not upload or host image files.
- The frontend stores the JWT and safe user data in `localStorage`. This is convenient but exposes the token to JavaScript executing in the page; an HttpOnly, Secure, SameSite cookie-based design would require a separate security review and implementation.
- Admin pending-audit reconciliation is read-only. There is no endpoint to replay, complete, or clear a pending record. Some database failures can leave a pending record after the associated action already succeeded; inspect target state before manual intervention.
- The frontend canonical production hostname and hosting dashboard settings require confirmation by the deployment owner.

### Possible future improvements

- Confirm and document the canonical production domain and an approved staging environment.
- Evaluate a secure cookie-based session flow and add appropriate CSRF protections if adopted.
- Add real-time messaging only with a reviewed infrastructure and authorization design.
- Define an image storage/upload service and moderation policy before implementing uploads.
- Add a public studio discovery workflow and project applications if those are product requirements.
- Expand automated browser-based end-to-end tests and performance monitoring.

## Contributing

1. Open an issue describing the proposed change or bug.
2. Keep changes scoped and preserve existing artist, studio, and admin authorization rules.
3. Add or update tests for behavior changes.
4. Run both test suites, dependency audits, the frontend build, and `git diff --check`.
5. Submit a pull request with a concise summary, verification evidence, and any deployment/configuration implications.

## Contact

Use the [GitHub repository](https://github.com/saurabhparmarr/gameartist-hub) to report issues or request project information. No separate maintainer contact address is published in this repository.
