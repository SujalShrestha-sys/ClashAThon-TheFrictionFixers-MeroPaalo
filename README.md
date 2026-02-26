# MeroPaalo Backend (Single-Organization, Department-Based)

Backend API for a queue management system with:

- Departments (queues)
- Counters and staff
- Tokens (queue numbers)
- Public join & status pages
- Admin & staff dashboards

All logic is now **department-based only**. There is **no Institution model** and no multi-organization support.

---

## 1. Setup

### Project Structure

```text
MeroPaalo/
  frontend/
  backend/
```

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or cloud URI)

### Backend `.env`

Create `backend/.env`:

```env
PORT=5000
MONGODB_URL=your_mongo_connection_string
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend `.env` (recommended)

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Run Locally

From repo root:

```bash
cd backend
npm install
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- API base: `http://localhost:5000/api`
- Health: `GET http://localhost:5000/`

---

## 2. Auth, Roles & Conventions

### Auth

Protected routes use:

- `Authorization: Bearer <jwt>` **or**
- `token` httpOnly cookie (set on login/register)

### Roles

- `admin`
- `staff`
- `customer` (default on registration)

### Standard Responses

Success:

```json
{
  "success": true,
  "data": { }
}
```

Error (non-2xx):

```json
{
  "success": false,
  "message": "Error message"
}
```

`stack` is included only in non-production environments.

---

## 3. API Overview

All paths below are **relative to `/api`**.

- `/auth` – login / register / password reset
- `/departments` – create and manage queues
- `/counters` – physical counters, staff assignment
- `/queue-days` – open/close/pause/resume/reset queue for a date
- `/tokens` – issue tokens, serve next, update status, query
- `/display` – public & staff display info
- `/admin` – admin dashboard stats
- `/public` – public queue info for a department
- `/users` – list users, assign roles
- `/qr` – QR code generator for join URL

---

## 4. Endpoints by Module

### 4.1 Auth (`/auth`)

#### `POST /auth/register`

- **Auth**: Public
- **Body**:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "9812345678",
  "password": "secret123"
}
```

Rules:

- `name` and `password` required
- At least **one** of `email` or `phone` required
- Creates user with role `customer`

**Response 201**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "userId",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "9812345678",
      "role": "customer",
      "department": null
    }
  }
}
```

#### `POST /auth/login`

- **Auth**: Public
- **Body**:

```json
{
  "email": "jane@example.com",
  "phone": "9812345678",
  "password": "secret123"
}
```

At least one of `email` or `phone` + `password` required.

**Response 200**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "userId",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "9812345678",
      "role": "customer",
      "department": null
    }
  }
}
```

#### `POST /auth/logout`

Clears auth cookie.

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### `POST /auth/forgot-password`

Body:

```json
{ "email": "jane@example.com" }
```

Always returns 200 with generic message if user exists or not.

#### `GET /auth/reset-password/:token`

Validates reset token.

#### `POST /auth/reset-password/:token`

Body:

```json
{ "password": "newPassword123" }
```

Resets password if token is valid.

---

### 4.2 Departments (`/departments`)

#### `POST /departments`

- **Auth**: `admin`
- **Body**:

```json
{
  "name": "Outpatient",
  "description": "Main OPD",
  "avgServiceTime": 5,
  "isActive": true
}
```

**Response 201**: Raw department object.

#### `GET /departments`

- **Auth**: `admin | staff`
- **Query**: none
- **Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "departmentId",
      "name": "Outpatient",
      "description": "Main OPD",
      "avgServiceTime": 5,
      "isActive": true
    }
  ]
}
```

#### `GET /departments/:id`

Fetch single department.

#### `PATCH /departments/:id`

Update any of: `name`, `description`, `avgServiceTime`, `isActive`.

#### `DELETE /departments/:id`

Delete department.

---

### 4.3 Counters (`/counters`)

#### `POST /counters`

- **Auth**: `admin`
- **Body**:

```json
{
  "counterName": "Counter 1",
  "department": "departmentId",
  "status": "open"
}
```

`department` is required and must exist.

**Response 201**:

```json
{
  "success": true,
  "data": {
    "_id": "counterId",
    "counterName": "Counter 1",
    "department": "departmentId",
    "staff": null,
    "status": "open"
  }
}
```

#### `GET /counters`

- **Auth**: `admin | staff`
- **Query**:
  - `department` (optional) – filter by department

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "counterId",
      "counterName": "Counter 1",
      "department": { "_id": "departmentId", "name": "Outpatient" },
      "staff": { "_id": "userId", "name": "Staff A", "role": "staff" },
      "status": "open"
    }
  ]
}
```

#### `PATCH /counters/:id`

Update any counter fields (`counterName`, `department`, `status`).

#### `PATCH /counters/:id/assign-staff`

- **Body**:

```json
{ "staffId": "userId_or_null" }
```

`staffId` must be a valid user with role `staff` or `admin` (or `null` to unassign).

---

### 4.4 Queue Days (`/queue-days`)

Represents a working day for a department’s queue.

#### `GET /queue-days`

- **Auth**: `admin | staff`
- **Query**:
  - `department` (optional) – filter by department

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "queueDayId",
      "department": { "_id": "departmentId", "name": "Outpatient" },
      "date": "2026-02-26T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "17:00",
      "status": "active"
    }
  ]
}
```

#### `POST /queue-days/open`

- **Auth**: `admin`
- **Body**:

```json
{
  "department": "departmentId",
  "date": "2026-02-26",
  "startTime": "09:00",
  "endTime": "17:00"
}
```

Opens (or upserts) a queue-day for that date and department as `active`.

#### `PATCH /queue-days/:id/close`

Set `status` to `closed`.

#### `PATCH /queue-days/:id/pause`

Set `status` to `paused` (not allowed if already closed).

#### `PATCH /queue-days/:id/resume`

Set `status` back to `active` (not allowed if closed).

#### `POST /queue-days/:id/reset`

Cancels all tokens in `waiting | called | serving` for that queue-day and clears displays.

Response:

```json
{
  "success": true,
  "data": {
    "queueDayId": "queueDayId",
    "cancelledCount": 3
  }
}
```

---

### 4.5 Tokens (`/tokens`)

#### `POST /tokens/issue`

- **Auth**: Public (customer) or authenticated
- **Body**:

```json
{
  "department": "departmentId",
  "date": "2026-02-26"
}
```

`department` required. `date` optional (defaults to today).

Queue-day for that department and date must be `active`.

**Response 201**:

```json
{
  "success": true,
  "data": {
    "_id": "tokenId",
    "department": "departmentId",
    "queueDay": "queueDayId",
    "tokenNumber": "001",
    "status": "waiting",
    "issuedAt": "..."
  }
}
```

#### `GET /tokens/:id/status`

Public token status for customers.

Response:

```json
{
  "success": true,
  "data": {
    "tokenId": "tokenId",
    "tokenNumber": "001",
    "status": "waiting",
    "currentServing": {
      "tokenNumber": "003",
      "status": "serving"
    },
    "positionInLine": 4,
    "avgServiceMinutes": 5,
    "estimatedWaitTimeMinutes": 20
  }
}
```

#### `GET /tokens`

- **Auth**: `admin | staff`
- **Query**:
  - `department` (optional)
  - `queueDay` (optional)
  - `status` (optional: `waiting|called|serving|completed|missed|cancelled`)

#### `POST /tokens/serve-next`

- **Auth**: `admin | staff`
- **Body**:

```json
{
  "department": "departmentId",
  "counterId": "counterId"
}
```

Finds the earliest `waiting` token for today’s active queue-day and moves it to `called`.

#### Status-change endpoints

All **Auth**: `admin | staff`:

- `PATCH /tokens/:id/call`
- `PATCH /tokens/:id/serve`
- `PATCH /tokens/:id/complete`
- `PATCH /tokens/:id/miss`
- `PATCH /tokens/:id/cancel`

Each accepts:

```json
{ "counterId": "counterId" }
```

(`counterId` optional for `cancel`).

All return updated token in `{ success, data }`.

---

### 4.6 Display (`/display`)

#### `GET /display`

Public display for a department (and optional counter).

- **Query**:
  - `department` (required)
  - `counter` (optional)

Response:

```json
{
  "success": true,
  "data": {
    "department": "departmentId",
    "queueStatus": "active",
    "nowServing": {
      "tokenNumber": "003",
      "status": "serving",
      "calledAt": "...",
      "issuedAt": "..."
    },
    "nextTwo": [
      { "tokenNumber": "004", "status": "waiting", "issuedAt": "..." },
      { "tokenNumber": "005", "status": "waiting", "issuedAt": "..." }
    ]
  }
}
```

#### `GET /display/rows`

- **Auth**: `admin | staff`
- **Query**:
  - `department` (optional)
  - `counter` (optional)

Returns raw display rows with populated `department`, `counter`, and `currentToken`.

---

### 4.7 Admin Dashboard (`/admin`)

#### `GET /admin/dashboard`

- **Auth**: `admin`
- **Query**:
  - `department` (required)
  - `date` (optional; defaults to today)

Response:

```json
{
  "success": true,
  "data": {
    "department": "departmentId",
    "queueStatus": "active",
    "currentServingNumber": "003",
    "totalWaitingTokens": 4,
    "tokensToday": 19,
    "averageWaitTimeMinutes": 8,
    "totalCompletedToday": 12
  }
}
```

If no active/paused queue-day exists for that date, `queueStatus` is `"closed"` and counts are 0.

---

### 4.8 Public Queue Info (`/public`)

#### `GET /public/queue/:departmentId/info`

Public info for the “join” page.

Response:

```json
{
  "success": true,
  "data": {
    "institutionId": null,
    "institutionName": null,
    "queueName": "Outpatient",
    "queueStatus": "active",
    "startTime": "09:00",
    "endTime": "17:00"
  }
}
```

Notes:

- `institutionId` and `institutionName` are always `null` now (kept only for compatibility with frontend types).

---

### 4.9 Users (`/users`)

#### `GET /users`

- **Auth**: `admin`
- **Query**:
  - `role` (optional: `admin|staff|customer`)

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "userId",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "9812345678",
      "role": "customer",
      "department": null
    }
  ]
}
```

#### `PATCH /users/:userId/role`

- **Auth**: `admin`
- **Body**:

```json
{ "role": "staff" }
```

Allowed: `admin`, `staff`, `customer`.

Response:

```json
{
  "success": true,
  "data": {
    "id": "userId",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "9812345678",
    "role": "staff"
  }
}
```

---

### 4.10 QR (`/qr`)

#### `GET /qr`

- **Auth**: Public
- **Query**:
  - `institution` (still required by this endpoint)
  - `department` (required)

Response:

- `200` – `image/png` QR code

The QR encodes:

```text
${CLIENT_URL}/join?institution=<institution>&department=<department>
```

> Note: although the rest of the system no longer uses institutions, this endpoint still accepts an `institution` query parameter purely so existing QR codes and frontend logic keep working. It does **not** touch any Institution model.

---

## 5. Socket.IO Events

Socket setup is in `backend/server.js`.

Client rooms:

- Department room: `dept:${departmentId}`
- Token room: `token:${tokenId}`

Server emits (subset):

- `queue:statusChanged`
- `queue:reset`
- `dashboard:changed`
- `token:issued`
- `token:updated`
- `token:selfUpdated`
- `token:turnArrived`
- `display:updated`

These are used by the frontend dashboards and displays to update in real-time when queue state changes.

