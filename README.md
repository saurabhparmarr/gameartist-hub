# GameArtist Hub

GameArtist Hub connects indie game studios with the artists who bring their worlds to life.

## Backend

A beginner-friendly REST API for game artists and studios. Artists can create profiles and portfolios; studios can publish projects and save artists; authenticated users can message one another.

## Frontend

The React frontend lives in `client/`. It uses Vite, React Router, Tailwind CSS v4, and the backend APIs for authentication, artist profiles and portfolios, projects, saved artists, and messaging. Artist and studio dashboards are role-protected. Artists can edit their own profile and portfolio; studios can manage their open projects and saved artists.

In PowerShell:

```powershell
cd C:\gameartist-hub\client
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). To create a production build, run `npm run build` from `client/`.

Set `VITE_API_URL` in `client/.env` to the backend API base URL. Copy `client/.env.example` to `client/.env` and adjust the URL if needed. The frontend stores the login token and safe user details in `localStorage` so a refresh keeps the session. This is convenient for a learning project, but JavaScript running through an XSS vulnerability can read the token. A production app should consider an HttpOnly, Secure, SameSite cookie-based session. Passwords are not stored in the browser.

## Technology stack

- Node.js and Express.js
- MongoDB and Mongoose
- JavaScript ES Modules
- bcryptjs for password hashing
- jsonwebtoken for authentication

## Folder structure

```text
server/
├── config/db.js
├── controllers/
├── middleware/
├── models/
├── routes/
├── utils/ApiResponse.js
├── app.js
├── server.js
├── .env.example
└── package.json
```

Controllers contain endpoint logic, models describe MongoDB documents, routes connect URLs to controllers, and middleware handles shared tasks like authentication and errors.

## Installation and startup

Requirements: Node.js, npm, and a running MongoDB instance.

In PowerShell:

```powershell
cd C:\gameartist-hub\server
npm install
npm run dev
```

For a normal Node.js start without nodemon, use `npm start`. The server defaults to `http://localhost:5000`.

## Environment variables

The backend reads variables from `server/.env`. Copy the example for a new setup:

```powershell
Copy-Item .env.example .env
```

Set a long, private, randomly generated `JWT_SECRET` in `.env`. Never share or commit that file. The checked-in `.env.example` contains placeholders, not a real secret. The example MongoDB URI uses the `medisync` database name, matching the seed script.

To seed demo accounts, set `SEED_DEMO_PASSWORD` in `server/.env` to a private password of at least 8 characters. All seeded demo accounts use this password. Keep it local and do not commit it.

```env
PORT=5050
MONGODB_URI=mongodb://127.0.0.1:27017/medisync
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
```

## Deployment

Deploy the React app from the `client/` directory on Vercel. Use the Vite preset, `npm run build`, and `dist` as the output directory. Set `VITE_API_URL` in Vercel's Production environment to the backend's HTTPS API base URL ending in `/api/v1`; production builds fail rather than silently embedding a localhost URL. The Vercel rewrite in `client/vercel.json` supports direct navigation and refreshes on React Router pages.

Deploy the Express API as a separate Node.js web service (the server currently starts with `app.listen`, so it is not a Vercel serverless function). Configure its start command as `npm start` with `server/` as the root, and set `NODE_ENV=production`, `MONGODB_URI` for the Atlas `medisync` database, a private `JWT_SECRET`, and `CORS_ORIGINS` to the exact Vercel frontend origin. Set `PORT` only if required by the hosting provider; the service uses the provider's port when supplied.

## API conventions

Base URL: `http://localhost:5050/api/v1`

Successful JSON responses have `statusCode`, `success`, `message`, and `data`. Errors have `success: false` and a `message`. Protected endpoints require `Authorization: Bearer <JWT>`. In Postman, choose **Authorization → Bearer Token** and paste the token returned by login.

## Authentication

| Method | URL | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register an artist or studio |
| POST | `/api/v1/auth/login` | Public | Verify credentials and get a JWT |

Register body:

```json
{
  "name": "Asha Artist",
  "email": "asha@example.com",
  "password": "securepass123",
  "role": "artist"
}
```

`role` is optional and defaults to `artist`; accepted roles are `artist` and `studio`. Studio registration also creates a studio profile. Success returns `201` and safe user data without the password. Duplicate email returns `409`; invalid input returns `400`.

Login body:

```json
{
  "email": "asha@example.com",
  "password": "securepass123"
}
```

Success returns `200`, `data.token`, and safe user data. Incorrect credentials return `401`.

## Artist profile APIs

| Method | URL | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/artists` | Public | List/search profiles |
| GET | `/api/v1/artists/:id` | Public | Get a profile by ArtistProfile ID |
| POST | `/api/v1/artists/profile` | Artist JWT | Create your own profile |
| PUT | `/api/v1/artists/profile` | Artist JWT | Update your own profile |

List query parameters: `name`, `skill`, `location`, `page` (default `1`), and `limit` (default `10`, maximum `100`). Example:

```text
GET /api/v1/artists?name=asha&skill=3D&location=Toronto&page=1&limit=10
```

Create profile body:

```json
{
  "bio": "I create stylized 3D game environments.",
  "skills": ["3D modeling", "Environment art"],
  "experience": 2,
  "location": "Toronto",
  "profileImage": "https://example.com/asha.png",
  "software": ["Blender", "Unreal Engine"]
}
```

Update profile body may contain one or more of the same fields. The profile is linked to the logged-in artist; do not send a user ID. Creating a second profile returns `409`. Studio accounts receive `403`.

## Portfolio APIs

| Method | URL | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/portfolio` | Artist JWT | Create a portfolio item |
| GET | `/api/v1/portfolio` | Public | List/filter portfolio items |
| GET | `/api/v1/portfolio/:id` | Public | Get an item by ID |
| PUT | `/api/v1/portfolio/:id` | Owning artist JWT | Update your item |
| DELETE | `/api/v1/portfolio/:id` | Owning artist JWT | Delete your item |

Create body:

```json
{
  "title": "Forest Shrine",
  "description": "A stylized environment concept.",
  "category": "3D Environment",
  "imageUrl": "https://example.com/forest-shrine.png",
  "tools": ["Blender", "Unreal Engine"]
}
```

`title` and `category` are required. Categories: `Concept Art`, `3D Environment`, `Character Art`, `Animation`, `Other`. Update accepts one or more of `title`, `description`, `category`, `imageUrl`, and `tools`.

List query parameters: `category`, `tools`, `artistId` (artist's User ID), `page`, and `limit` (maximum `100`). Example:

```text
GET /api/v1/portfolio?category=3D%20Environment&tools=Blender&page=1&limit=10
```

## Studio project APIs

| Method | URL | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/projects` | Studio JWT | Create a project |
| GET | `/api/v1/projects` | Public | List open projects |
| GET | `/api/v1/projects/:id` | Public | Get a project by ID |
| PUT | `/api/v1/projects/:id` | Owning studio JWT | Update your project |
| DELETE | `/api/v1/projects/:id` | Owning studio JWT | Delete your project |

Create body:

```json
{
  "title": "Environment Artist Needed",
  "description": "Create a stylized forest level for our game.",
  "skillsRequired": ["Environment art", "Blender"],
  "budget": 1500
}
```

`title` and `description` are required. `budget` is optional and must be non-negative. `status` defaults to `open`; the allowed values are `open` and `closed`. Updates accept `title`, `description`, `skillsRequired`, `budget`, and `status`. The studio is taken from the JWT, not the request body.

Project list query parameters: `skill`, `page` (default `1`), and `limit` (default `10`, maximum `100`). Only open projects are listed. A project detail URL can still retrieve a closed project by ID.

## Saved artist APIs

| Method | URL | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/saved-artists/:artistId` | Studio JWT | Save an artist by User ID |
| GET | `/api/v1/saved-artists` | Studio JWT | List this studio's saved artists |
| DELETE | `/api/v1/saved-artists/:artistId` | Studio JWT | Remove an artist from this studio's list |

These endpoints do not need a JSON body. Only existing artist accounts can be saved. Saving the same artist twice returns `409`. Each studio can only read or remove its own saved records.

## Messaging APIs

| Method | URL | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/messages/:receiverId` | Any logged-in user | Send a message to a User ID |
| GET | `/api/v1/messages/:userId` | Any logged-in user | Read messages exchanged with a User ID |

Send message body:

```json
{
  "content": "Hi, I would like to discuss your portfolio."
}
```

The sender is taken from the JWT. You cannot message yourself. Conversation messages are returned oldest-first and only when the authenticated user is one of the participants. Messaging is request/response only; there are no WebSockets or real-time updates.

## Frontend dashboard notes

The frontend provides role-based routes at `/artist/dashboard` and `/studio/dashboard`; the studio workspace also includes `/studio/projects`, `/studio/saved-artists`, and authenticated `/messages`. Project and portfolio mutations are sent to the backend, which remains responsible for checking role and resource ownership.

The backend does not provide a studio-owned project list (its public project list contains open projects only), project applications, an inbox/conversation list, real-time messaging, or image uploads. The studio project page filters owned projects from the public open-project results; a closed project can still be opened by its known ID. The messaging page discovers contacts from public profiles/open projects and browser-local recent contacts, then loads message history only through the authorized conversation endpoint. Portfolio and profile images must be supplied as URLs.

## Postman testing checklist

1. Start MongoDB, then run `npm run dev` from `server/`. Check the public API with `GET http://localhost:5050/api/v1/artists?page=1`.
2. Register an artist using `POST /api/v1/auth/register`; log in with `POST /api/v1/auth/login` and save the returned token in Postman.
3. Use that token to create an artist profile and portfolio item. Test their public list/detail endpoints, filters, updates, and portfolio deletion.
4. Register and log in a second artist. Try updating/deleting the first artist's portfolio item; expect `403`.
5. Register and log in a studio. Confirm it gets `403` for artist-only operations.
6. With the studio token, create a project. List open projects, filter by skill, get project details, update project status to `closed`, verify it no longer appears in the list, then delete it.
7. With the studio token, save the first artist using their **User ID**. List saved artists, try saving them again (expect `409`), then remove them.
8. Send a message from the artist to the studio and another from the studio to the artist. Fetch both conversations and confirm messages are oldest-first. Try a missing receiver, invalid ID, and self-message.
9. For protected endpoints, remove the Bearer token and confirm the response is `401`. Try invalid IDs (expect `400`) and IDs for missing records (expect `404`).
