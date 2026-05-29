# Claude Instructions for MeroPaalo Backend

## Project Overview

**MeroPaalo** is a department-based queue management system backend. It provides APIs for managing:
- **Departments** (queues/services)
- **Counters** (physical service points) and staff
- **Tokens** (queue numbers with status tracking)
- **Public pages** for joining queues and checking status
- **Admin & staff dashboards**

See [README.md](README.md) for architecture and setup details.

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up .env with MONGODB_URL, JWT_SECRET, PORT, CLIENT_URL
# See README.md for complete .env template

# Start development server (auto-reload with nodemon)
npm run dev

# Seed admin user (if needed)
npm run seed:admin
```

**Server runs on `http://localhost:5000`** (or PORT env var)

---

## Code Conventions

### Directory Structure

- **controllers/** - Business logic per feature (auth, tokens, departments, etc.)
- **model/** - Mongoose schemas (all schemas here, not split per feature)
- **routes/** - Express route definitions, centralized in `routes.js`
- **middlewares/** - Auth, error handling, async wrapper
- **database/** - DB connection setup
- **utils/** - Helpers (sendEmail, dateOnly)
- **seeds/** - Initial data scripts

### API Response Format

All endpoints follow this standard:

```json
// Success (200-201)
{ "success": true, "data": { /* entity or array */ } }

// Error (4xx-5xx)
{ "success": false, "message": "error description" }
```

**Status codes matter**: Controllers set `res.status(code)` before throwing errors. The error middleware converts them to JSON.

## API Endpoints
Base URL: `http://localhost:5000/api`

### Auth (public)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `GET /auth/reset-password/:token`
- `POST /auth/reset-password/:token`

### Departments
- `GET /departments` — requires `admin` or `staff`
- `POST /departments` — requires `admin`
- `GET /departments/:id` — requires `admin` or `staff`
- `PATCH /departments/:id` — requires `admin`
- `DELETE /departments/:id` — requires `admin`

### Counters
- `GET /counters` — requires `admin` or `staff`
- `POST /counters` — requires `admin`
- `PATCH /counters/:id` — requires `admin`
- `PATCH /counters/:id/assign-staff` — requires `admin`

### Queue Days
- `GET /queue-days` — requires `admin` or `staff`
- `POST /queue-days/open` — requires `admin`
- `PATCH /queue-days/:id/close` — requires `admin`
- `PATCH /queue-days/:id/pause` — requires `admin`
- `PATCH /queue-days/:id/resume` — requires `admin`
- `POST /queue-days/:id/reset` — requires `admin`

### Tokens
- `GET /tokens/:id/status` — public
- `POST /tokens/issue` — requires auth
- `GET /tokens/history` — requires auth
- `GET /tokens` — requires `admin` or `staff`
- `POST /tokens/serve-next` — requires `admin` or `staff`
- `PATCH /tokens/:id/call` — requires `admin` or `staff`
- `PATCH /tokens/:id/serve` — requires `admin` or `staff`
- `PATCH /tokens/:id/complete` — requires `admin` or `staff`
- `PATCH /tokens/:id/miss` — requires `admin` or `staff`
- `PATCH /tokens/:id/cancel` — requires `admin` or `staff`

### Display
- `GET /display` — public
- `GET /display/rows` — requires `admin` or `staff`

### Admin
- `GET /admin/dashboard` — requires `admin`

### Public
- `GET /public/departments` — public
- `GET /public/queue/:departmentId/info` — public

### Users
- `GET /users` — requires `admin`
- `PATCH /users/:userId/role` — requires `admin`
- `PATCH /users/:userId/department` — requires `admin`

### QR
- `GET /qr` — public
- `GET /qr/validate` — public

### Notes
- Protected endpoints accept JWT in `Authorization: Bearer <token>` or cookie `token`.
- `GET /tokens/history` returns the logged-in user’s join history.

### Authentication roles
- `admin` — full management
- `staff` — read and token queue operations for department
- authenticated customer — issue token, view own history

### Testing tips
- Start with public endpoints first, then authenticate for protected routes.
- Use `/auth/login` to get a valid token or cookie before testing auth-required routes.

### Endpoint order
The list above follows the route groups in `src/routes/routes.js`.

### Helper
If you need the exact request body shape for a route, check the matching controller in `src/controllers/`.

### Quick test sequence
1. `POST /auth/register`
2. `POST /auth/login`
3. `GET /departments`
4. `GET /public/departments`
5. `GET /qr/validate?department=<id>`
6. `POST /tokens/issue`
7. `GET /tokens/history`
8. `GET /tokens/:id/status`
9. `GET /display`
10. `GET /admin/dashboard` (admin only)

### Use case
This list is enough to manually exercise the API in Postman, curl, or a frontend test harness.


### Keep in mind
- `POST /queue-days/open` is used to open a queue for a department/day.
- `GET /tokens/:id/status` is the token status check that can be used publicly.
- `POST /tokens/issue` and `GET /tokens/history` are the user-facing queue actions.

- **Token storage**: JWT in httpOnly cookies (`token`) + optional `Authorization: Bearer <jwt>` header
- **Roles**: `admin`, `staff`, `customer` (default on registration)
- **Protected routes**: Use `protect` middleware to verify JWT; use role checks for admin/staff
- **Department affinity**: Staff belongs to a specific department; apply filtering in queries

### Database & Mongoose Patterns

- **Timestamps**: All models have `timestamps: true` for `createdAt`/`updatedAt`
- **Indexes**: Department, queueDay, and status fields are indexed for query performance
- **Refs & population**: Use `.populate()` for related entities (e.g., token → department, customer)
- **Uniqueness**: Some composite fields have unique indexes (e.g., queueDay + tokenNumber per Token)

### Key Models & Relationships

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Customers, staff, admins | name, email, role, department |
| **Department** | Queue/service type | name, description |
| **Counter** | Service point + staff | name, department, staffId |
| **QueueDay** | Daily queue session | department, date, status |
| **Token** | Queue number entry | tokenNumber, status, department, queueDay, customer |
| **TokenDisplay** | What's shown on screens | currentToken, nextToken, department |
| **TokenHistory** | Audit trail | (check model for fields) |

---

## Important Patterns & Pitfalls

### Socket.io Integration

- Rooms are named: `inst:<institutionId>:dept:<departmentId>`
- Emit events when tokens change status (e.g., "called", "completed")
- Check `server.js` for Socket.io setup; `app.get("io")` retrieves instance

### QR Codes & Tokens

- QR codes encode token numbers for quick joins
- Each token must have unique `tokenNumber` per QueueDay
- Token status workflow: `waiting` → `called` → `serving` → `completed` (or `missed`/`cancelled`)
- **Authentication required**: Users must be logged in to issue/join a token via QR scan
- Frontend flow:
  1. User scans QR → Redirects to `/join?department=<departmentId>`
  2. Frontend calls `GET /api/qr/validate?department=<departmentId>` to check queue status & auth status
  3. If not authenticated → Redirect to login page with return URL
  4. If authenticated → Call `POST /api/tokens/issue` with `{ department, date? }` to join queue
  5. Backend now requires `protect` middleware on `issueToken` endpoint

### Email Notifications

- Uses Nodemailer; configured via `.env` (SMTP settings)
- Sent from `src/utils/sendEmail.js`
- Used for password resets, invitations, etc.

### Department-Only Logic

- **No Institution model** - all logic is department-based
- Queries should filter by `department` to isolate data
- Staff can only access their assigned department's data

---

## QR Code Authentication Flow (API Reference)

### Overview
The QR scanning flow ensures users are authenticated before joining a queue. Users scan a QR code, which opens the frontend join page. The frontend validates the queue status and user authentication, then prompts login if needed.

### Endpoints for QR Scanning Flow

**1. Generate QR Code**
```
GET /api/qr?department=<departmentId>
Response: PNG image (200)
```
Returns a scannable QR code that encodes the join URL.
- **Usage**: Display on physical signage at service counters
- **URL in QR**: `{CLIENT_URL}/join?department=<departmentId>`
- **Error (400)**: Missing department parameter

---

**2. Validate QR Code** ⭐ Frontend calls this
```
GET /api/qr/validate?department=<departmentId>
Response: JSON (200, 400, or 404)
```

Checks if queue is open and returns user's authentication status. Works for both authenticated and unauthenticated users.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "department": {
      "_id": "dept123",
      "name": "Passport Counter",
      "description": "Document verification service"
    },
    "queueStatus": "active",
    "isAuthenticated": false,
    "userName": null,
    "message": "Please log in to join the queue"
  }
}
```

**Errors:**
- **(400)** Queue closed: `"Queue is closed for today. Please try again during business hours."`
- **(404)** Department inactive: `"Department not found or is inactive"`

---

**3. Issue Token** ⭐ Requires Authentication
```
POST /api/tokens/issue
Authorization: Bearer <jwt> OR Cookie: token=<jwt>
Body: { "department": "<departmentId>", "date": "YYYY-MM-DD" (optional) }
Response: JSON (201) or Error (401, 400)
```

Creates a token for the authenticated user to join the queue.

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "token123",
    "tokenNumber": "001",
    "status": "waiting",
    "department": "dept123",
    "queueDay": "queueday456",
    "customer": "user789",
    "issuedAt": "2026-05-29T10:30:00.000Z"
  }
}
```

**Errors:**
- **(401)** Not authenticated: `"Authentication required. Please log in to join the queue."`
- **(400)** Queue not active: `"Queue is not active for this department on the selected date"`
- **(400)** Invalid date format: `"date must be in YYYY-MM-DD format"`

---

### Frontend Flow Implementation

```
User Action                 Frontend API Call               Backend Response
────────────────────────────────────────────────────────────────────────────
1. Scan QR              →   [Redirect to /join page]
                            
2. Page loads           →   GET /api/qr/validate?dept=X   →   Queue status + auth status

3a. Not auth?           →   Show "Login Required" button
                            User clicks → Go to login page
                            
3b. Authenticated?      →   Show "Join Queue" button

4. User clicks Join     →   POST /api/tokens/issue         →   Token created (201)
                            {department: X}
                            
5. Success              →   Show token number to user
                            Display in queue
```

---

### Error Handling Strategy

| Scenario | HTTP | Message | Frontend Action |
|----------|------|---------|-----------------|
| Not logged in | 401 | "Authentication required..." | Redirect to login |
| Queue closed | 400 | "Queue is closed for today..." | Show "Try later" message |
| Dept inactive | 404 | "Department not found or is inactive" | Show "Service unavailable" |
| Already joined | N/A | Can call issue again (creates new token) | Show option to create new token |

---

## Development Tips

### Error Handling Pattern

Controllers throw errors with `res.status(code)` set before throwing:

```javascript
// In controller
if (!item) {
  res.status(404);
  throw new Error("Item not found");
}
```

The `asyncHandler` middleware catches all promise rejections and passes errors to the global error handler, which sends a JSON response.

**Key Points:**
- Always wrap async handlers with `asyncHandler()` middleware
- Set `res.status()` BEFORE throwing error
- Error middleware catches and formats all errors as JSON
- In production, stack traces are hidden for security

### Middleware Chain Order

Routes use this middleware chain:
1. `asyncHandler()` - Catches promise rejections
2. `protect` - Verifies JWT token (if needed)
3. `authorize("role1", "role2")` - Checks user role (if needed)
4. Controller function

Example:
```javascript
router.patch("/:id/complete", protect, authorize("staff", "admin"), asyncHandler(completeToken));
```

1. **Error handling**: Controllers throw errors; the error middleware catches them. Set `res.status()` before throwing.
2. **Async helpers**: Use `asyncHandler()` middleware to wrap async controllers (auto-catches errors).
3. **Validation**: No centralized validator; check `package.json` scripts — may need to add one (e.g., joi, zod).
4. **Testing**: No test suite currently (`"test": "echo error"`); suggest adding Jest + SuperTest for API testing.
5. **CORS**: Configured for `CLIENT_URL` (frontend). Update `.env` for different origins.
6. **Production notes**:
   - Set `NODE_ENV=production` and `JWT_SECURE=true`
   - Use environment-specific `.env` files
   - Enable HTTPS for cookie security

---

## Common Tasks

| Task | File(s) |
|------|---------|
| Add new API endpoint | Create route in `routes/<feature>.routes.js`, logic in `controllers/<feature>.controller.js` |
| Add new entity type | Create schema in `model/<entity>.model.js`, add routes & controller |
| Fix auth issues | Check `middlewares/auth.middleware.js` and cookie options in controllers |
| Debug token flow | Trace through `controllers/token.controller.js` and watch Socket.io emissions |
| Send email | Use `src/utils/sendEmail.js` (configure SMTP in `.env`) |

---

## Next Steps for Improvement

- Add input validation (Joi, Zod, or similar)
- Add comprehensive test suite
- Add API documentation (Swagger/OpenAPI)
- Consider adding rate limiting & request logging
