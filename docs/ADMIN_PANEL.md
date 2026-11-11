# Admin Panel

## Sign-in and authorization

- Admins sign in at `/admin/login` through the shared `POST /api/v1/auth/login` endpoint. There is no separate admin login endpoint.
- Public `POST /api/v1/auth/register` accepts only `artist` and `studio` roles.
- An operator provisions admin accounts using `npm run admin:create` from `server/`. The command requires an interactive terminal and `MONGODB_URI`, prompts for the account details and hidden password, requires at least 12 password characters, hashes the password with bcryptjs, and refuses an email that already belongs to an account. Confirm the database target before running it.
- The frontend `AdminRoute` protects admin pages, but backend authorization is the security boundary. All `/api/v1/admin/*` routes apply JWT authentication and then admin-role middleware.
- Authentication verifies the JWT and reloads the account's role and active status from MongoDB. Disabled accounts are denied; an artist or studio cannot access admin APIs by manually sending a request.
- The admin session follows the shared frontend authentication flow and is stored in browser `localStorage`.

## Dashboard

`GET /api/v1/admin/dashboard` returns MongoDB-backed:

- Total artist/studio users, artist count, studio count, active count, and disabled count. Admin accounts are excluded from user totals.
- Total project count.
- Up to five recent artist/studio registrations and five recent projects.

Recent projects include studio name/email when available. The admin dashboard page presents loading, empty, error, and retry states. Counts come from database queries.

## Management pages

The frontend includes `/admin/users`, `/admin/artists`, `/admin/studios`, and `/admin/projects`. These collections are searchable and paginated; the UI requests 10 items per page, while the API accepts page sizes from 1 to 100. Search is length-limited and escaped before being used in a regular expression.

### Users

- Search by account name or email.
- Filter by `artist`/`studio` role and active/disabled status.
- Review name, email, role, registration date, and account status.
- Disable or reactivate artist and studio accounts after confirmation.

Admin accounts are not included in the user list/status endpoint. The signed-in admin cannot change their own account status.

### Artists

- Search account name/email and artist profile skills, location, or biography.
- Filter by active/disabled status.
- Review profile data, experience, portfolio count, and recent portfolio samples.
- Open the public artist profile.
- Disable or reactivate the associated artist account after confirmation.

### Studios

- Search account name/email and studio name, description, or location.
- Filter by active/disabled status.
- Review studio information, project count, and recent project links.
- Disable or reactivate the associated studio account after confirmation.

The console does not provide a full studio profile editor.

### Projects

- Search title/description and associated studio name/email.
- Filter by open/closed status.
- Review project and studio information, or open the public project page.
- Permanently remove a project after confirmation.

## User activation and deactivation

`PATCH /api/v1/admin/users/:id/status` accepts `{ "isActive": true }` or `{ "isActive": false }` for artist and studio accounts only. It rejects malformed IDs, non-boolean values, missing targets, admin targets, and attempts to change the requesting admin's status.

Deactivation does not delete the user, profile, portfolio, projects, or other related data. Disabled users cannot log in or make authenticated requests. Public artist, portfolio, and project discovery/detail controllers exclude disabled owners. Reactivating an account allows authenticated access again and makes its eligible public records discoverable.

## Audit records and pending actions

Account status changes and admin project removals create an audit record before the data mutation. Records include actor identity/role, action, target details, request IP/user agent, status, and timestamps. Successful actions are marked completed; a failed action is marked failed when that audit update succeeds.

`GET /api/v1/admin/audit-logs/pending?page=1&limit=10` returns pending records oldest first with pagination. The response includes a read-only reconciliation assessment:

- Account status action: whether the account is present and its current status matches the requested value.
- Project removal: whether the project still exists.

This assessment is a clue, not definitive proof of which process changed the target. For example, the project/status mutation can succeed while the final audit update fails, leaving a pending record. Check target state before any manual intervention.

## Admin API table

All paths below are relative to `/api/v1`; every endpoint requires a valid JWT and admin role.

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/admin/dashboard` | Dashboard statistics and recent records |
| `GET` | `/admin/users` | Searchable/paginated artist and studio accounts; `page`, `limit`, `search`, `role`, and `status` filters |
| `PATCH` | `/admin/users/:id/status` | Activate or deactivate an artist/studio account |
| `GET` | `/admin/artists` | Searchable/paginated artist profiles; supports account status filter |
| `GET` | `/admin/studios` | Searchable/paginated studio profiles; supports account status filter |
| `GET` | `/admin/projects` | Searchable/paginated projects; supports open/closed status filter |
| `DELETE` | `/admin/projects/:id` | Permanently remove a project |
| `GET` | `/admin/audit-logs/pending` | Paginated pending audit records with target-state assessment |

Collection responses contain a resource array and pagination metadata (`page`, `limit`, `total`, `totalPages`). User filters are `role=all|artist|studio` and `status=all|active|disabled`; project status is `all|open|closed`. Invalid query parameters receive a client error.

## Security notes

- Frontend route protection improves navigation only; API access is independently checked by backend authentication and admin-role middleware.
- Public registration cannot create administrators.
- Admin list queries select safe account fields; password hashes and JWTs are not returned in those lists.
- Admin routes use the application's shared Helmet, CORS, and request rate-limiting middleware.
- The frontend currently stores JWTs in `localStorage`, accessible to JavaScript executing in the page origin. HttpOnly-cookie migration is not implemented.
- Do not add credentials, tokens, private user data, or connection strings to documentation or screenshots.

## Known limitations

- There is no admin audit history page. The API exposes pending entries only and cannot retry, complete, or clear them.
- Account deactivation retains data; it is not deletion.
- Project removal is permanent; there is no soft-delete/restore flow.
- Admin permission tiers and multi-factor authentication are not implemented.
- A read-only audit assessment may need manual review, especially if the action succeeded but the final audit update did not.
- The `/studios` page is a landing page rather than a studio directory.

See the [client handover](./CLIENT_HANDOVER.md) and [repository README](../README.md) for broader project setup and limitations.
