# Admin Panel Guide

This guide describes the admin functionality implemented in the repository. It does not document any specific provisioned administrator account or hosting configuration.

## Sign-in and authorization

- Admins sign in at `/admin/login` using the shared `POST /api/v1/auth/login` endpoint. There is no separate admin login API.
- Public registration (`POST /api/v1/auth/register`) accepts only the `artist` and `studio` roles.
- An operator provisions the initial admin account with `npm run admin:create` from `server/`, after configuring `MONGODB_URI` for the intended database. The script runs interactively, requires a password of at least 12 characters, hashes it with bcryptjs, and refuses to replace an existing account with the same email. Do not run it against production without the system owner's explicit approval and an approved operational procedure.
- The frontend's `AdminRoute` prevents non-admin users from viewing admin pages. This is a user-interface control, not the security boundary.
- Every `/api/v1/admin/*` endpoint runs the backend JWT authentication middleware followed by admin-role middleware. The authentication middleware verifies the token and reloads the account's role and active status from MongoDB. A valid artist/studio token cannot access an admin endpoint.
- Admin sign-in uses the same JWT and session flow as other roles. The browser stores the session in `localStorage`; see the limitations below.

## Dashboard

`/admin/dashboard` fetches live database data from `GET /api/v1/admin/dashboard`:

- Counts for artist and studio accounts: total, active, and disabled. Admin accounts are intentionally excluded from these account totals.
- Total project records.
- Up to five recent artist/studio registrations.
- Up to five recent projects, with the associated studio's name and email where available.

The page has loading, empty-list, error, and retry states. Counts are database values, not seeded UI constants.

## Management pages

The admin console provides `/admin/users`, `/admin/artists`, `/admin/studios`, and `/admin/projects`. Lists are server-paginated (10 records per UI page; API page size can be 1–100), searchable, and show empty/loading/error states.

### Users

- Search by account name or email.
- Filter by artist/studio role and active/disabled status.
- Review the account name, email, role, registration date, and status.
- Disable or reactivate an artist or studio account after confirmation.
- The current admin cannot change their own status. Admin accounts are not included as targets in this endpoint.

This is a summary list rather than a separate full user-details page.

### Artists

- Search account name/email and profile skills, location, or biography.
- Filter by active/disabled status.
- Review artist profile fields, experience, portfolio count, and a small sample of recent portfolio entries.
- Open the public artist profile.
- Disable or reactivate the associated artist account after confirmation.

### Studios

- Search account name/email and studio name, description, or location.
- Filter by active/disabled status.
- Review the studio name, profile summary, project count, and recent project links.
- Disable or reactivate the associated studio account after confirmation.

There is no full studio-detail editor in the admin console.

### Projects

- Search project title/description and associated studio name/email.
- Filter by open/closed status.
- Review project details and associated studio information, or open the public project page.
- Permanently remove a project after confirmation.

The delete operation removes the selected project document. There is no project-application model in the current repository. Confirm product and data-retention requirements before using this destructive action.

## Account activation and deactivation

The `PATCH /api/v1/admin/users/:id/status` endpoint changes `isActive` for artist and studio accounts only. Disabling an account prevents login and protected requests using its JWT. The associated account/profile/project records are not deleted. Public artist, portfolio, and project discovery/detail controllers exclude disabled owners; reactivation makes eligible records discoverable again.

The endpoint rejects invalid account IDs, non-boolean `isActive` values, missing targets, admin targets, and attempts to change the requesting admin's own account. The frontend asks for confirmation before submitting the change.

## Audit records and pending actions

Administrative account-status changes and project removals create an audit record before attempting the database mutation. Records include the actor ID/role/email, action, target type/ID/name, details, request IP and user agent, status, and timestamps. The action is then marked `completed` or `failed` when that follow-up succeeds.

`GET /api/v1/admin/audit-logs/pending?page=1&limit=10` returns only pending records, oldest first, with pagination. It also provides a read-only reconciliation assessment:

- For account status actions, whether the account exists and whether its current status matches the requested state.
- For project removal, whether the project still exists.

These are clues for an operator, not proof of exactly what happened. For example, a pending record can remain if the data mutation succeeded but the audit status update failed. Inspect the current target state before taking manual action.

**Known limitation:** the current frontend has no audit-log page. The API does not expose a history of completed/failed records, and there is no endpoint to retry, resolve, or clear a pending record. Do not edit audit records directly without an approved incident/maintenance procedure.

## Admin API

All paths below are relative to `/api/v1` and require both a valid authenticated JWT and the admin role.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/dashboard` | Live summary counts and recent records |
| `GET` | `/admin/users` | Paginated account list; supports `page`, `limit`, `search`, `role=all\|artist\|studio`, and `status=all\|active\|disabled` |
| `PATCH` | `/admin/users/:id/status` | Set `{ "isActive": true\|false }` for an artist/studio account |
| `GET` | `/admin/artists` | Paginated artist-profile list; supports `page`, `limit`, `search`, and account `status` |
| `GET` | `/admin/studios` | Paginated studio-profile list; supports `page`, `limit`, `search`, and account `status` |
| `GET` | `/admin/projects` | Paginated project list; supports `page`, `limit`, `search`, and `status=all\|open\|closed` |
| `DELETE` | `/admin/projects/:id` | Permanently remove one project |
| `GET` | `/admin/audit-logs/pending` | Paginated pending audit records and reconciliation clues |

List responses contain the resource array and `pagination` fields (`page`, `limit`, `total`, `totalPages`). Search input is length-limited and escaped before being used as a regular expression. Invalid pagination, filter, or status inputs return a client error.

## Security and privacy notes

- Admin authorization is enforced on the server for every admin route; never treat a hidden frontend link as authorization.
- Public signup cannot request the admin role.
- Admin lists select safe account fields and do not return password hashes or authentication tokens.
- Admin endpoints are behind the same request rate limiting and security middleware as the rest of the API.
- The frontend stores JWTs in `localStorage`. JavaScript running in the origin can access this token; XSS prevention and browser-origin security remain important. A different session-storage design would require a separately reviewed implementation.
- Do not place account credentials, JWT secrets, MongoDB URIs, or private user data in this guide, source control, or screenshots.

## Known limitations

- There is no built-in admin audit history UI or pending-action resolution workflow.
- Account deactivation is reversible and does not erase the user's data.
- Project removal is permanent and has no soft-delete/restore workflow.
- There is one admin role; finer-grained permissions, multi-factor authentication, and approval workflows are not implemented.
- `autoIndex` is disabled when the backend runs in production. Review index changes and obtain approval for any required production database maintenance.
- No production admin credentials or deployment settings are documented here.
