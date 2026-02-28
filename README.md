# Exam Marks Notification

Full-stack app for managing school exams, marks, and parent WhatsApp notifications.

## Project Structure

- `backend/` - Express + MongoDB API
- `frontend/` - React + Vite web app

## User Roles

### Admin

- Login/logout with session restore
- Student management (add, edit, delete, search)
- Class management (add, edit, delete, search)
- Subject management (add, edit, delete, search)
- Teacher management (add, edit, delete, optional password update)
- Teacher password reset from admin UI
- Teacher-Subject mapping (class-section-subject to teacher)
- Class-Subject mapping
- Class-Student mapping
- Exam management
  - Create/edit/delete exams
  - Map exams to one or more class-sections
  - Filter by class, year, status
  - Publish draft exams
- Exam Subject management
  - Add/edit/delete subjects inside an exam
  - Date, max marks, passing marks, instructions
- Marks management
  - Single entry CRUD
  - Subject-wise filtering and search
  - Bulk entry table
  - Excel template download/upload for bulk marks
- WhatsApp marks notifications to parents
  - Exam + optional subject selection
  - Recipient selection
  - Optional additional message
  - Per-recipient send result tracking
- Audit logs
  - Filter by role, status, action, path, date range
  - Pagination
  - CSV export

### Teacher

- Login/logout with session restore
- Marks management for assigned class-subject mappings only
- Notifications for assigned students only
- UI access to `Marks` and `Notifications` modules

## Key Features

- Role-based access control (`admin`, `teacher`)
- Multi-tenant style data scoping by `collegeId`
- JWT access token + refresh token session flow
- Account lock after repeated failed logins
- API rate limiting and secure HTTP headers
- Mongo query sanitization
- Write-operation audit logging
- WhatsApp safeguards
  - Max recipients per request
  - Monthly send cap
  - Error/status reporting per recipient

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string
- Meta WhatsApp Cloud API credentials

## Setup

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Create environment file for backend:

```bash
cd backend
copy .env.example .env
```

3. Start backend:

```bash
cd backend
npm run dev
```

4. Start frontend:

```bash
cd frontend
npm run dev
```

## Environment Variables

See `backend/.env.example` for required keys.

## Notes

- In Meta test mode, only approved recipient numbers can receive messages.
- Use phone numbers in E.164 digits format without `+` for Cloud API payload `to` value.
