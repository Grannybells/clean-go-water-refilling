# API Documentation

Living reference for every route exposed by the API. Append new sections here as routes are added.

## Base URL
`http://localhost:3000`

All requests/responses are JSON. Protected routes require header: `Authorization: Bearer <token>`.

> **No public registration, owner-only user management.** Users are created by the owner via `POST /api/users`. Admins can log in and use the app but cannot create or manage other users. The very first owner is created once via `npm run seed:owner` (or as part of `npm run db:reset`).

---

## Getting started — step by step

This walks you from a fresh checkout to calling an authenticated endpoint.

### 1. Install & configure

```bash
cd api
npm install
```

Make sure `.env` has valid MySQL credentials and your chosen owner credentials:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Test123123
DB_NAME=water-refilling

JWT_SECRET=<replace-with-a-long-random-string>

SEED_OWNER_EMAIL=owner@example.com
SEED_OWNER_PASSWORD=changeme123
SEED_OWNER_FIRST_NAME=Owner
SEED_OWNER_LAST_NAME=Account
```

### 2. Create the database and tables

Make sure MySQL is running, then:

```bash
npm run db:init
```

This creates the `water-refilling` database (if missing), every table, and seeds the four default roles. Safe to re-run — it uses `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE`.

> The server also auto-ensures the schema on every `npm run dev` / `npm start`, so you can skip this step if you don't mind the first boot being slightly slower.

### 3. Seed everything (modules, users, stations)

The fastest path to a usable DB:

```bash
npm run db:reset
```

Chains `db:drop → db:init → seed:modules → seed:users → seed:stations`. Destructive — drops every table and rebuilds from scratch. Use this when you want a known-good blank state.

For a non-destructive seed (e.g. first-time setup on a fresh empty DB), run the individual seeds instead:

```bash
npm run db:init           # create database + tables (idempotent)
npm run seed:modules      # module catalog + default role groups
npm run seed:users        # creates 8 sample users (see roster below)
npm run seed:stations     # 4 sample stations
```

Each seed is idempotent — re-running them skips rows that already exist. `seed:modules` is slightly different: it **upserts** the catalog, **clears and rewrites** the four default groups, and **backfills** existing users into their role's group.

**Seed roster** (`npm run seed:users` creates these, shared password from `SEED_USERS_PASSWORD` in `.env`):

| email                    | role     | default group       |
|--------------------------|----------|---------------------|
| owner@example.com        | owner    | owner_defaults      |
| admin@example.com        | admin    | admin_defaults      |
| operator1@example.com    | operator | operator_defaults   |
| operator2@example.com    | operator | operator_defaults   |
| staff1@example.com       | staff    | staff_defaults      |
| staff2@example.com       | staff    | staff_defaults      |
| staff3@example.com       | staff    | staff_defaults      |
| staff4@example.com       | staff    | staff_defaults      |

> There's also `npm run seed:owner` for the "just create a single owner from `SEED_OWNER_*`" bootstrap case — useful in production where you don't want the demo accounts.

### 4. Start the server

```bash
npm run dev
```

You should see:
```
Connected to MySQL at 127.0.0.1:3306/water-refilling
Schema check: table `users` ready.
...
API server running on http://localhost:3000
```

Sanity check from another terminal:
```bash
curl http://localhost:3000/health
# { "status": "ok", "timestamp": "..." }
```

### 5. Log in as the owner

```powershell
$login = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login `
  -Method Post -ContentType 'application/json' `
  -Body '{"email":"owner@example.com","password":"changeme123"}'

$token = $login.token
```

The response contains `{ user, token }`. **Save the `token`** — every protected request uses it as `Authorization: Bearer <token>`.

### 6. Create another user (the admin-driven "register")

Creating a user **is** creating their login. The password you set here is the one they'll use at `/api/auth/login`.

```powershell
$body = @{
  email      = 'juan@example.com'
  password   = 'juan-temp-123'
  first_name = 'Juan'
  last_name  = 'Dela Cruz'
  role       = 'staff'
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/users `
  -Method Post -ContentType 'application/json' `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body
```

Rules:
- Caller must be `owner` or `admin`.
- `role` must exist in `user_roles` (defaults to `staff`).
- Only an `owner` can create another `owner`.
- Password is hashed with bcrypt before storage.

Optional extras in the body: `phone`, `address`, `birth_date` (`YYYY-MM-DD`), `gender`, `avatar_url`, `modules` (string[]), `groups` (string[]).

### 7. The new user logs in

Juan can now log in with the password the owner set:

```json
POST /api/auth/login
{ "email": "juan@example.com", "password": "juan-temp-123" }
```

He gets his own token, scoped to `role: "staff"`.

### 8. Call an authenticated endpoint

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/users/me `
  -Headers @{ Authorization = "Bearer $juansToken" }
```

### Common issues

| Symptom | Likely cause |
|---|---|
| `ECONNREFUSED` on boot | MySQL not running, or wrong `DB_*` in `.env` |
| `Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD...` | Those env vars are empty in `.env` |
| `An owner already exists` from seed | Expected — seed is idempotent |
| `401 Missing or invalid Authorization header` | Forgot the `Authorization: Bearer <token>` header |
| `401 Invalid or expired token` | Token expired (default 1 day). Log in again. |
| `403 Forbidden: insufficient role` | Caller isn't `owner`/`admin` for that endpoint |
| `409 Email already registered` | That email already exists in `users` |
| `429 Too many requests` | Hit the rate limit — wait 15 min or restart server |

---

## Auth

### `POST /api/auth/login`
Public. Rate-limited (10 / 15min per IP).

**Body**
```json
{
  "email": "juan@example.com",
  "password": "secret123"
}
```

**200**
```json
{
  "user": {
    "id": 1,
    "email": "juan@example.com",
    "role": "staff",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "phone": null,
    "address": null,
    "birth_date": null,
    "gender": null,
    "avatar_url": null,
    "created_at": "2026-11-04T08:30:00.000Z",
    "updated_at": "2026-11-04T08:30:00.000Z"
  },
  "modules": ["home.view", "customer.view", "inventory.view"],
  "token": "eyJhbGciOi..."
}
```

`modules` is the user's effective permission set (see **Permissions model** below). It's already encoded inside the JWT; it's also returned here so the client doesn't have to decode the token.

**Errors:** `400` missing field · `401` invalid credentials · `429` rate-limited

---

## Users

### `POST /api/users`
Create a new user account. Requires auth **and** role `owner` (admin cannot create users — user management is owner-only).

The server will:
1. Validate `role` exists in `user_roles`.
2. Hash the password with bcrypt.
3. Insert `users` + `user_details` + optional `user_modules` + optional `users_modules_grp` in a single transaction.

**Body**
```json
{
  "email": "juan@example.com",
  "password": "secret123",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "role": "staff",
  "phone": "+63 912 345 6789",
  "address": "123 Rizal St, Manila",
  "birth_date": "1995-06-15",
  "gender": "male",
  "avatar_url": null,
  "modules": ["pos", "daily_sales"],
  "groups": ["cashier"]
}
```

Required fields: `email`, `password`, `first_name`, `last_name`.
Optional: `role` (defaults to `staff`), all `user_details` fields, `modules` (string[]), `groups` (string[]).

**201**
```json
{
  "user": {
    "id": 7,
    "email": "juan@example.com",
    "role": "staff",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "phone": "+63 912 345 6789",
    "address": "123 Rizal St, Manila",
    "birth_date": "1995-06-15",
    "gender": "male",
    "avatar_url": null,
    "created_at": "2026-11-04T08:30:00.000Z",
    "updated_at": "2026-11-04T08:30:00.000Z"
  }
}
```

**Errors:**
- `400` missing required field / `password` < 6 chars / `modules`/`groups` not array / unknown `role`
- `401` missing or expired token
- `403` caller is not owner/admin · caller is not owner but tried to create an owner
- `409` email already registered

---

### `GET /api/users/me`
Requires auth. Returns the caller's full profile (users ⋈ user_details).

**No body.**

**200**
```json
{
  "user": {
    "id": 1,
    "email": "juan@example.com",
    "role": "staff",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "phone": null,
    "address": null,
    "birth_date": null,
    "gender": null,
    "avatar_url": null,
    "created_at": "2026-11-04T08:30:00.000Z",
    "updated_at": "2026-11-04T08:30:00.000Z"
  },
  "modules": ["home.view", "customer.view", "inventory.view"]
}
```

`modules` is re-computed from the database on every call — safe to use for a client "refresh permissions" button without forcing a logout.

**Errors:** `401` missing/expired token · `404` user not found

---

### `PATCH /api/users/me`
Update the caller's own profile. Requires auth only — no module gate, since it's own-data.

**Body** (at least one field required, each field optional)
```json
{
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "phone": "+63 912 345 6789",
  "address": "Manila",
  "birth_date": "1995-06-15",
  "gender": "male",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

Any field can be set to `null` except `first_name` and `last_name` (must be non-empty strings). `birth_date` must be `YYYY-MM-DD`. `gender` must be one of `"male"`, `"female"`, `"other"`, or `null`.

**Not allowed here** — email, role, password, modules, groups. Use the dedicated endpoints for those (owner-only).

**200** → `{ "user": { ...updated profile... } }` matching the `/me` response shape.

**Errors:** `400` empty body / wrong types / bad date format / unknown field constraints · `401` · `404` user_details row missing

---

### `GET /api/users`
Requires auth and the module **`users.view`** (owner has it via `*`). **Owner accounts are excluded from the list** — use `GET /api/users/:id` or `GET /api/users/me` to retrieve them directly.

**No body.**

**200**
```json
{
  "users": [
    { "id": 2, "email": "...", "role": "admin", "first_name": "...", "last_name": "...", "...": "..." },
    { "id": 5, "email": "...", "role": "staff", "first_name": "...", "last_name": "...", "...": "..." }
  ]
}
```

**Errors:** `401` missing/expired token · `403` insufficient role

---

### `GET /api/users/:id`
Returns one user with their role and a full permissions breakdown. Requires auth and the module **`users.view`** (owner has it via `*`).

**200**
```json
{
  "user": { "id": 5, "email": "staff1@example.com", "role": "staff", "first_name": "Staff", "last_name": "One", "...": "..." },
  "modules": {
    "effective": ["home.view", "customer.view", "inventory.view"],
    "direct": [
      { "id": 12, "module_name": "sales.view", "granted_by": 1, "created_at": "2026-11-05T..." }
    ],
    "groups": [
      {
        "id": 8,
        "group_name": "staff_defaults",
        "assigned_by": null,
        "created_at": "2026-11-05T...",
        "modules": ["home.view", "customer.view", "inventory.view"]
      }
    ]
  }
}
```

- `effective` — flat set of what the user actually has access to (same as what lands in the JWT at login). Returns `["*"]` for owners.
- `direct` — rows from `user_modules` (individually granted)
- `groups` — rows from `users_modules_grp`, each with the modules the group contains

**Errors:** `400` invalid id · `401` · `403` · `404` user not found

---

### `PATCH /api/users/:id`
Update another user's profile fields. Requires auth and the module **`users.edit`** (owner has it via `*`).

Same body shape and validation rules as `PATCH /api/users/me`. The same fields are disallowed (email, role, password, etc.) — use their dedicated endpoints.

**200** → `{ "user": { ...updated profile... } }`

**Errors:** `400` invalid id / empty body / wrong types · `401` · `403` missing `users.edit` · `404` user not found

---

### `PATCH /api/users/:id/role`
Change a user's role. Requires auth **and** role `owner`.

**Body**
```json
{ "role": "operator" }
```

Rules:
- `role` must exist in `user_roles`
- Only an `owner` can set `role: "owner"` (admins get `403`)
- Cannot demote the only remaining owner (`409`)
- Changing role does **not** touch the user's group memberships or direct grants — admin manages those explicitly via the grant/group endpoints below

**200**
```json
{
  "user": { "id": 5, "role": "operator", "...": "..." },
  "requires_relogin": true
}
```

Why `requires_relogin`: permissions live in the JWT, so the target user keeps their old permissions until they log out and back in (or their token expires).

**Errors:** `400` missing/unknown `role` · `401` · `403` · `404` · `409` only-owner demotion

---

### `POST /api/users/:id/modules`
Grant one module to a user directly (independent of any group).

**Body**
```json
{ "module_name": "sales.view" }
```

- `module_name` must exist in the `modules` catalog
- User must not already have this module granted directly (if they have it via a group, this still succeeds and creates a direct grant — useful if they later leave the group)

**201**
```json
{ "message": "Module granted", "requires_relogin": true }
```

**Errors:** `400` missing field / unknown module · `401` · `403` · `404` user not found · `409` already granted directly

---

### `DELETE /api/users/:id/modules/:moduleName`
Revoke a direct module grant from a user. Does not affect modules the user gets through groups — remove them from the group separately if needed.

**200**
```json
{ "message": "Module revoked", "requires_relogin": true }
```

**Errors:** `400` invalid id · `401` · `403` · `404` the module wasn't directly granted to this user

---

### `POST /api/users/:id/groups`
Add a user to a module group (e.g. `staff_defaults`, `admin_defaults`, or a custom group).

**Body**
```json
{ "group_name": "operator_defaults" }
```

- `group_name` must exist (= have at least one row in `module_groups`)
- User must not already be in that group

**201**
```json
{ "message": "Group assigned", "requires_relogin": true }
```

**Errors:** `400` missing field / unknown group · `401` · `403` · `404` user not found · `409` already in group

---

### `DELETE /api/users/:id/groups/:groupName`
Remove a user from a group. Does not affect their direct module grants.

**200**
```json
{ "message": "Group removed", "requires_relogin": true }
```

**Errors:** `400` · `401` · `403` · `404` user is not in that group

---

## Settings → Modules (catalog)

The module catalog is **code-managed** — rows are created and removed via `MODULE_CATALOG` in `src/config/modules.ts` + `npm run seed:modules`. Only the human-readable `description` can be edited at runtime, so UI copy can be tweaked without a code change.

**Why not full CRUD?** Module names (`customer.view`, `settings.stations.edit`, etc.) are hardcoded in the Expo client and the API route gates. Inventing or deleting modules at runtime would create orphan tokens that don't correspond to any actual check — so the catalog is treated as immutable structure, with description-only edits for UX purposes.

The tokens `settings.modules.create` and `settings.modules.delete` exist in the catalog for UI symmetry but have **no endpoints** — grant them if you want, they just don't do anything.

### `GET /api/modules`
Required module: **`settings.modules.view`**. Owner gets it via `*`; admin does not have it by default (owner-only area).

**Optional query:**
- `?page=customer` — filter to one page

**200**
```json
{
  "modules": [
    { "module_name": "customer.view",   "page": "customer", "action": "view",   "description": "View customers" },
    { "module_name": "customer.create", "page": "customer", "action": "create", "description": "Create customers" },
    ...
  ]
}
```

To add new entries, edit `MODULE_CATALOG` in `src/config/modules.ts` and run `npm run seed:modules`.

**Errors:** `401` · `403`

---

### `PATCH /api/modules/:name`
Update a module's `description` field. Only the description is editable — `module_name`, `page`, and `action` are frozen (change those by editing code + re-seeding).

Required module: **`settings.modules.edit`**.

**Body**
```json
{ "description": "See the customer list and detail screens" }
```

Pass `null` to clear the description. The field is required in the body (not optional) to avoid ambiguous "no-op" requests.

**200**
```json
{
  "module": {
    "module_name": "customer.view",
    "page": "customer",
    "action": "view",
    "description": "See the customer list and detail screens"
  }
}
```

**Note on durability**: changes here are overwritten the next time `npm run seed:modules` runs, since the seed upserts each module's description from `MODULE_CATALOG`. For permanent wording, also update the description in `src/config/modules.ts`.

**Errors:** `400` missing or wrong-typed `description` · `401` · `403` missing `settings.modules.edit` · `404` module not found

---

## Settings → Groups (module groups)

Groups are collections of modules that can be assigned to users in bulk (via `POST /api/users/:id/groups`). All routes are **module-gated**:

| Method | Required module          |
|--------|--------------------------|
| GET    | `settings.groups.view`   |
| POST   | `settings.groups.create` |
| PATCH (rename) / add-module / remove-module | `settings.groups.edit` |
| DELETE | `settings.groups.delete` |

Admin does not have these tokens by default — groups are owner-only unless owner explicitly grants.

**Reserved groups** — `staff_defaults`, `operator_defaults`, `admin_defaults`, `owner_defaults`. These are owned by `npm run seed:modules`: you can read them but cannot create a group with one of those names, mutate their contents, rename them, or delete them via the API. Edit `DEFAULT_GROUPS` in `src/config/modules.ts` and re-run the seed instead.

### `GET /api/module-groups`
List every group with its modules and current user count.

**200**
```json
{
  "groups": [
    { "group_name": "admin_defaults",   "modules": ["customer.view", "..."], "user_count": 1, "is_reserved": true  },
    { "group_name": "cashier_bundle",   "modules": ["sales.view", "sales.create"], "user_count": 3, "is_reserved": false }
  ]
}
```

---

### `GET /api/module-groups/:name`
One group, including its modules and user count.

**200**
```json
{
  "group": {
    "group_name": "cashier_bundle",
    "modules": ["sales.view", "sales.create", "transactions.view"],
    "user_count": 3,
    "is_reserved": false,
    "description": "Cashier bundle for POS staff",
    "created_at": "2026-11-05T..."
  }
}
```

**Errors:** `404` not found

---

### `POST /api/module-groups`
Create a new custom group.

**Body**
```json
{
  "group_name": "cashier_bundle",
  "modules": ["sales.view", "sales.create", "transactions.view"],
  "description": "Cashier bundle for POS staff"
}
```

Validation:
- `group_name` — 1–100 chars, `[A-Za-z0-9_-]` only. Must not already exist. Must not be reserved.
- `modules` — non-empty array. Each entry must exist in the `modules` catalog. Duplicates are deduped.
- `description` — optional string.

**201** → `{ "group": { ... } }`

**Errors:** `400` bad shape / unknown module · `409` name exists or is reserved

---

### `PATCH /api/module-groups/:name`
Rename a group. Cascades through `users_modules_grp` so user memberships keep pointing at the renamed group.

**Body**
```json
{ "new_name": "frontline_bundle" }
```

**200**
```json
{
  "group": { "group_name": "frontline_bundle", "modules": [...], "user_count": 3, "is_reserved": false },
  "renamed": { "modulesRenamed": 3, "membershipsRenamed": 3 },
  "requires_relogin": true
}
```

**Errors:** `400` bad name shape · `404` source not found · `409` target already exists / source or target reserved

---

### `POST /api/module-groups/:name/modules`
Add a module to an existing (non-reserved) group.

**Body**
```json
{ "module_name": "transactions.create" }
```

**201** → `{ "group": {...}, "requires_relogin": <bool> }`

**Errors:** `400` unknown module · `404` group not found · `409` module already in group · `409` group is reserved

---

### `DELETE /api/module-groups/:name/modules/:moduleName`
Remove a module from a (non-reserved) group.

**200** → `{ "group": {...}, "requires_relogin": <bool> }`

**Errors:** `404` group/module not found · `409` group is reserved

---

### `DELETE /api/module-groups/:name`
Delete a (non-reserved) group entirely. **Cascades**: also removes all `users_modules_grp` rows pointing at that group name.

**200**
```json
{
  "message": "Group deleted",
  "cascade": { "modulesRemoved": 3, "membershipsRemoved": 2 },
  "requires_relogin": true
}
```

**Errors:** `404` not found · `409` reserved

---

## Settings → Stations

All station routes are **module-gated**, not role-gated. Each verb requires its matching `settings.stations.*` token:

| Method | Required module          |
|--------|--------------------------|
| GET    | `settings.stations.view` |
| POST   | `settings.stations.create` |
| PATCH  | `settings.stations.edit` |
| DELETE | `settings.stations.delete` |

Admin has `settings.stations.*` in `admin_defaults`. Owner gets everything via `*`. Grant tokens individually (e.g. `settings.stations.view` alone) for read-only access.

`station_id` is client-supplied (letters/digits/underscore/hyphen, max 20 chars) — e.g. `"ALPHA"`, `"STN-01"`. It must be unique across stations.

### `POST /api/stations`
Create a new station.

**Body**
```json
{
  "station_id": "ALPHA",
  "station_name": "Alpha Refilling Station",
  "station_address": "123 Rizal St, Manila",
  "station_lat": 14.5995124,
  "station_lng": 120.9842195,
  "contact_number": "+63 912 345 6789",
  "description": "Main branch",
  "is_active": true
}
```

Required: `station_id`, `station_name`, `station_address`.
Optional: `station_lat`, `station_lng` (decimals), `contact_number`, `description`, `is_active` (defaults to `true`).

**201**
```json
{
  "station": {
    "station_id": "ALPHA",
    "station_name": "Alpha Refilling Station",
    "station_address": "123 Rizal St, Manila",
    "station_lat": "14.5995124",
    "station_lng": "120.9842195",
    "contact_number": "+63 912 345 6789",
    "description": "Main branch",
    "is_active": 1,
    "created_by": 1,
    "created_at": "2026-11-04T08:30:00.000Z",
    "updated_at": "2026-11-04T08:30:00.000Z"
  }
}
```

**Errors:** `400` missing field / invalid `station_id` format · `401` · `403` · `409` station_id already exists

---

### `GET /api/stations`
List all stations, newest first.

**200**
```json
{ "stations": [ { "station_id": "ALPHA", "...": "..." }, { "station_id": "BRAVO", "...": "..." } ] }
```

---

### `GET /api/stations/:id`
Returns a single station by `station_id`.

**200** → `{ "station": {...} }` · **404** if not found.

---

### `PATCH /api/stations/:id`
Partial update. Only fields present in the body are changed. `station_id` cannot be renamed.

**Body (any subset)**
```json
{
  "station_name": "Alpha (renovated)",
  "station_address": "456 Mabini St",
  "is_active": false
}
```

**200** → `{ "station": {...} }` (updated row) · **400** if body contains no updatable fields · **404** if not found.

---

### `DELETE /api/stations/:id`
Hard delete. Returns **204** on success. Any `contracts` rows referencing this `station_id` become orphans (no FK) — delete those first if you care.

**Errors:** `401` · `403` · `404`

---

## Contracts

Assigns a user to a station for a given period. All contract routes require auth **and** role `owner` or `admin`. Dates are `YYYY-MM-DD`.

### `POST /api/contracts`
Create a contract. The server validates that `user_id` and `station_id` actually exist.

**Body**
```json
{
  "user_id": 7,
  "station_id": "ALPHA",
  "start_date": "2026-11-04",
  "end_date": "2027-11-04"
}
```

Required: `user_id`, `station_id`, `start_date`.
Optional: `end_date` (null = open-ended / still active).

**201**
```json
{
  "contract": {
    "id": 12,
    "user_id": 7,
    "station_id": "ALPHA",
    "start_date": "2026-11-04",
    "end_date": "2027-11-04",
    "created_by": 1,
    "created_at": "2026-11-04T08:30:00.000Z",
    "updated_at": "2026-11-04T08:30:00.000Z",
    "user_first_name": "Juan",
    "user_last_name": "Dela Cruz",
    "user_email": "juan@example.com",
    "station_name": "Alpha Refilling Station"
  }
}
```

**Errors:** `400` missing/invalid field, bad date format, `end_date < start_date` · `401` · `403` · `404` user or station not found

---

### `GET /api/contracts`
List all contracts, newest first. Response joins user + station info.

**Optional query filters:**
- `?user_id=7` — only contracts for user 7
- `?station_id=ALPHA` — only contracts for station ALPHA
- Combine both to narrow further.

**200**
```json
{
  "contracts": [
    {
      "id": 12, "user_id": 7, "station_id": "ALPHA",
      "start_date": "2026-11-04", "end_date": "2027-11-04",
      "user_first_name": "Juan", "user_last_name": "Dela Cruz",
      "user_email": "juan@example.com", "station_name": "Alpha Refilling Station",
      "created_by": 1, "created_at": "...", "updated_at": "..."
    }
  ]
}
```

---

### `GET /api/contracts/:id`
Single contract (same joined shape). **404** if not found.

---

### `PATCH /api/contracts/:id`
Partial update. Any subset of `user_id`, `station_id`, `start_date`, `end_date`. Server re-validates existence and date order.

**Body example**
```json
{ "end_date": "2026-12-31" }
```

**200** → `{ "contract": {...} }` · **400** on validation failure · **404** if contract or referenced user/station not found.

---

### `DELETE /api/contracts/:id`
Hard delete. Returns **204**. **404** if not found.

---

## Settings

Settings is a **container page** with four sub-features, each with its own URL and token namespace:

| Sub-feature | URL root                   | Token namespace          | Admin default?        |
|-------------|----------------------------|--------------------------|-----------------------|
| Device      | `/api/settings/device`     | `settings.device.*`      | ✅ yes                |
| Stations    | `/api/stations`            | `settings.stations.*`    | ✅ yes                |
| Groups      | `/api/module-groups`       | `settings.groups.*`      | ❌ owner-only         |
| Modules     | `/api/modules`             | `settings.modules.view`  | ❌ owner-only         |

Each sub-section below documents its routes. Owner gets all via the `*` role bypass. Admin gets Device + Stations out of the box; Groups and Modules are owner-only unless an owner explicitly grants an individual user `settings.groups.*` or `settings.modules.view`.

---

## Settings → Device

Per-device records (one row per mobile install, keyed by `device_id`).

| role     | access |
|----------|--------|
| owner    | Full CRUD (via `*` bypass) |
| admin    | Full CRUD (via `settings.device.*` in `admin_defaults`) |
| operator | **403** on all routes |
| staff    | **403** on all routes |

**Schema columns** (all nullable except audit columns):

| column         | type          | notes                                                                   |
|----------------|---------------|-------------------------------------------------------------------------|
| id             | INT auto-inc  |                                                                         |
| station_id     | VARCHAR(20)   | logical reference — no FK                                               |
| station_name   | VARCHAR(150)  | denormalized snapshot                                                   |
| user_id        | INT           | logical reference — no FK                                               |
| user_name      | VARCHAR(255)  | denormalized snapshot                                                   |
| **device_id**  | VARCHAR(190)  | **UNIQUE** — unique per installation (e.g. Expo install ID)             |
| device_name    | VARCHAR(100)  | human label (e.g. "MCH Tablet #1")                                      |
| device_model   | VARCHAR(100)  | e.g. `"iPad (9th generation)"`, `"SM-A525F"`                            |
| os_name        | VARCHAR(255)   | `"ios"` / `"android"`                                                   |
| os_version     | VARCHAR(255)   | e.g. `"17.2.1"`                                                         |
| app_version    | VARCHAR(255)   | e.g. `"1.0.0"`                                                          |
| push_token     | VARCHAR(255)  | Expo push token for notifications                                       |
| last_seen_at   | TIMESTAMP     | accepts ISO 8601 (e.g. `"2026-11-05T10:30:00Z"`); stored as UTC         |
| created_by     | INT           | user who created the record                                             |
| created_at     | TIMESTAMP     |                                                                         |
| updated_at     | TIMESTAMP     |                                                                         |

Multiple rows with `device_id = NULL` are allowed (MySQL `UNIQUE` permits multiple NULLs) — the uniqueness constraint only applies to non-null values.

### `POST /api/settings/device`
Required module: `settings.device.create`.

**Body** (all optional)
```json
{
  "station_id": "MCH",
  "station_name": "Marcos Highway",
  "user_id": 3,
  "user_name": "Operator One",
  "device_id": "EXP-ABC123XYZ",
  "device_name": "MCH Tablet #1",
  "device_model": "iPad (9th generation)",
  "os_name": "ios",
  "os_version": "17.2.1",
  "app_version": "1.0.0",
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxx]",
  "last_seen_at": "2026-11-05T10:30:00Z"
}
```

No server-side validation that `station_id` or `user_id` reference real rows — add your own in the controller later if needed.

**201** → `{ "settings": {...} }` with every column populated.

**Errors:** `400` wrong-type field · `401` · `403` missing `settings.device.create` · `409` `device_id` already registered

---

### `GET /api/settings/device`
Required module: `settings.device.view`. Lists all device records, newest first.

**200**
```json
{ "settings": [ {...}, {...} ] }
```

---

### `GET /api/settings/device/:id`
Required module: `settings.device.view`.

**200** → `{ "settings": {...} }` · **404** if not found.

---

### `PATCH /api/settings/device/:id`
Required module: `settings.device.edit`. Partial update — only fields present in the body are changed. Any field can be set to `null` to clear it.

**Body example**
```json
{ "app_version": "1.0.1", "push_token": null, "last_seen_at": "2026-11-05T12:00:00Z" }
```

**200** → `{ "settings": {...} }` (updated row) · **400** empty body / wrong types · **404** if not found · **409** if setting `device_id` to one already held by another row.

---

### `DELETE /api/settings/device/:id`
Required module: `settings.device.delete`. Hard delete. **204** on success, **404** if not found.

---

## System

### `GET /health`
Public. No payload.

**200**
```json
{ "status": "ok", "timestamp": "2026-11-04T08:30:00.000Z" }
```

---

## Global behavior (applies to every route)

- **Helmet** sets secure headers on all responses.
- **CORS** — `Access-Control-Allow-Origin: *` currently (change `CORS_ORIGIN` in `.env` for prod).
- **Global rate limit** — 100 requests / 15 min per IP across the whole API. Response when tripped: `429 { "message": "Too many requests, please try again later." }`.
- **Body size** — JSON and urlencoded bodies capped at `10kb`.
- **404 fallback** — unmatched routes return `{ "message": "Route not found" }`.

---

## Bootstrapping the first owner

There is no public self-registration. For a brand-new install, create the first owner with the one-shot seed script:

1. Fill in your choice of credentials in `.env`:
   ```
   SEED_OWNER_EMAIL=owner@yourdomain.com
   SEED_OWNER_PASSWORD=choose-a-strong-password
   SEED_OWNER_FIRST_NAME=Juan
   SEED_OWNER_LAST_NAME=Dela Cruz
   ```
2. Run:
   ```bash
   npm run seed:owner
   ```

The script is idempotent — if an `owner` already exists it exits without changes. After that, log in with the owner account and use `POST /api/users` to create everyone else.

---

## Permissions model

### Two layers of gating

| Layer | Middleware | Granularity | Used by |
|---|---|---|---|
| Role | `authorize('owner', 'admin')` | Coarse — bars whole route trees from most roles | Admin-panel endpoints (stations, contracts, user creation) |
| Module | `requireModule('customer.view')` | Fine — per page + action | Mobile-app endpoints (anything the staff/operator app touches) |

A route can use one, the other, or both. Both middlewares rely on `req.user` populated by `authenticate` from the JWT.

### Roles (`user_roles` table)
`users.role` is a free-form `VARCHAR(50)` that references `user_roles.role_name`. The table is seeded with four roles; add rows to extend:

| role     | description                                              |
|----------|----------------------------------------------------------|
| owner    | Top-level account — receives `['*']` effective modules by role, bypassing group lookups |
| admin    | Administrator with full user management + default view access to app pages              |
| operator | Default: view access to home, customer, inventory, sales, transactions                  |
| staff    | Default: view access to home, customer, inventory                                       |

### Module catalog (`modules` table)
The source of truth for what module names exist. Enforcing module grants against this list keeps typos from silently breaking access.

Seeded modules (via `npm run seed:modules`):

| page / sub-page       | actions                           |
|-----------------------|-----------------------------------|
| home                  | view                              |
| customer              | view, create, edit, delete        |
| inventory             | view, create, edit, delete        |
| sales                 | view, create, edit, delete        |
| transactions          | view, create, edit, delete        |
| users                 | view, create, edit, delete        |
| settings.device       | view, create, edit, delete        |
| settings.stations     | view, create, edit, delete        |
| settings.groups       | view, create, edit, delete        |
| settings.modules      | view (catalog is code-managed)    |

Settings is a container page with four sub-features; each gets its own token namespace. Wildcards cascade: `settings.*` grants everything under Settings, `settings.stations.*` grants every action on Stations, etc.

Module names are `page.action` strings, e.g. `customer.view`, `sales.edit`.

### Default role groups
Each role is linked to a group in `module_groups`. When `POST /api/users` creates a user, they are automatically added to their role's group — no manual permission setup needed. `npm run seed:modules` also **backfills existing users** into their role's group, so running it on an existing DB is safe.

| group              | modules                                                                                            |
|--------------------|----------------------------------------------------------------------------------------------------|
| `staff_defaults`   | `home.view`, `customer.view`, `inventory.view`                                                     |
| `operator_defaults`| staff + `sales.view`, `transactions.view`                                                          |
| `admin_defaults`   | operator + `settings.device.*` + `settings.stations.*` (no groups/modules — those stay owner-only) |
| `owner_defaults`   | every module in the catalog, enumerated explicitly (25 modules at time of writing)                 |

To change a group's contents, edit `DEFAULT_GROUPS` in `src/config/modules.ts` and re-run `npm run seed:modules`. The owner group is auto-generated from the full catalog, so adding a new module to `MODULE_CATALOG` automatically extends it.

### Why owner has both an explicit group *and* a role bypass
The runtime short-circuit in `getEffectiveModules` returns `['*']` for owners — small JWTs, single wildcard check, impossible to lock out an owner by misconfiguring groups. The explicit `owner_defaults` membership in the DB is an auditable record ("yes, the owner is formally granted these N modules") and would still grant full access if the bypass were ever removed. Belt and suspenders.

### Per-user overrides
On top of the role default, a user can be granted extra access via:
- `user_modules` — direct grants (e.g. `customer.create` for one staff member who also does signups)
- `users_modules_grp` — membership in additional groups (e.g. an accounting bundle)

### Wildcards
Wildcards cascade up the dot hierarchy. For a check like `requireModule('settings.stations.edit')`, any of the following in the user's effective set grants access:

| token in user's set       | grants `settings.stations.edit`? |
|---------------------------|----------------------------------|
| `settings.stations.edit`  | yes (exact)                      |
| `settings.stations.*`     | yes (page wildcard)              |
| `settings.*`              | yes (section wildcard)           |
| `*`                       | yes (used only for owner bypass) |
| `customer.view`           | no                               |
| `settings.stations.view`  | no (different action)            |

The algorithm walks every prefix level: for `a.b.c.d`, it checks `a.b.c.*`, `a.b.*`, `a.*`, then `*`.

### Where the modules come from at request time
- **At login**: `getEffectiveModules(userId, role)` computes the user's set:
  - if `role === 'owner'` → `['*']` (short-circuit, no DB query)
  - else → `UNION` of `user_modules` and modules reachable via `users_modules_grp` / `module_groups`
- The set is **embedded in the JWT** and returned in the body.
- Every subsequent request carries them via the token — zero DB queries on permission checks.
- **Changes take effect on next login.** Admin granting a new module to a logged-in user requires that user to log out and back in. If you need live-propagation, migrate to the DB-lookup variant of `getEffectiveModules`.

### Applying `requireModule` to routes
Example (not currently applied — stations/contracts stay role-gated for now):

```ts
router.get('/customers',      authenticate, requireModule('customer.view'),   listCustomers);
router.post('/customers',     authenticate, requireModule('customer.create'), createCustomer);
router.patch('/customers/:id',authenticate, requireModule('customer.edit'),   updateCustomer);
router.delete('/customers/:id',authenticate, requireModule('customer.delete'), deleteCustomer);
```

### Modules in API responses
Both `POST /api/auth/login` and `GET /api/users/me` include a `modules` array — the exact same list the server used to sign the JWT. The client (Expo) stores this in auth context and drives menu visibility and `<RequireModule>` wrappers off it.

### Per-user modules (`user_modules` table)
Direct user → module grants. One row per grant.

| column       | type           | notes                                |
|--------------|----------------|--------------------------------------|
| id           | INT auto-inc   |                                      |
| user_id      | INT            | references `users.id`                |
| module_name  | VARCHAR(100)   | free-form identifier (e.g. `billing`)|
| granted_by   | INT (nullable) | admin that granted it                |
| created_at   | TIMESTAMP      |                                      |

### Module groups (`module_groups` table)
Defines **what's inside** a named group. One row per (group, module) pair — a group with 5 modules has 5 rows sharing the same `group_name`.

| column       | type           | notes                        |
|--------------|----------------|------------------------------|
| id           | INT auto-inc   |                              |
| group_name   | VARCHAR(100)   | the group's name             |
| module_name  | VARCHAR(100)   | module included in the group |
| description  | VARCHAR(255)   |                              |
| created_by   | INT (nullable) |                              |
| created_at   | TIMESTAMP      |                              |

### Bulk assignment (`users_modules_grp` table)
Assigns an entire group to a user. One row = "user X is in group Y."

| column       | type           | notes                   |
|--------------|----------------|-------------------------|
| id           | INT auto-inc   |                         |
| user_id      | INT            |                         |
| group_name   | VARCHAR(100)   | matches `module_groups` |
| assigned_by  | INT (nullable) |                         |
| created_at   | TIMESTAMP      |                         |

### Computing a user's effective modules
```sql
-- Direct grants
SELECT module_name FROM user_modules WHERE user_id = ?
UNION
-- Grants via group membership
SELECT mg.module_name
FROM users_modules_grp umg
JOIN module_groups mg ON mg.group_name = umg.group_name
WHERE umg.user_id = ?;
```

---

## Not yet implemented

- Mobile-app page endpoints: customer, inventory, sales, transactions CRUD (tables don't exist yet). Settings CRUD is done.
- Email change endpoint (currently not updatable via `PATCH /api/users/:id`)
- User deactivation / deletion
- Password change (`PATCH /api/users/me/password`) + admin reset (`PATCH /api/users/:id/password`)
- Role management (`/api/roles` — list/create roles beyond the seeded four)
- Module catalog mutation (`POST /api/modules`) — usually better done as a seed-script change

Add their sections above as they're built.
