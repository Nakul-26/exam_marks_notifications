# Exam Marks Notification

Full-stack school management app for handling classes, students, teachers, exams, marks, and parent WhatsApp notifications.

## Project Structure

- `backend/` - Express + MongoDB API
- `frontend/` - React + Vite web app

## Website Features

### Admin Features

- Authentication
  - Admin login/logout
  - Session restore on refresh
- Student management
  - Add, edit, delete, and search students
  - Store roll number, student phone, father name, and father phone
  - Bulk student import through Excel upload
  - Empty Excel template download for student uploads
- Class management
  - Add, edit, delete, and search classes
  - Bulk class import through Excel upload
  - Empty Excel template download for class uploads
- Subject management
  - Add, edit, delete, and search subjects
- Teacher management
  - Add, edit, delete, and search teachers
  - Set password during teacher creation
  - Reset/update teacher password from the admin UI
  - Bulk teacher import through Excel upload
  - Empty Excel template download for teacher uploads
- Class-subject mapping
  - Map subjects to a class and section
  - Edit and delete mappings
- Class-student mapping
  - Map students to a class and section
  - Edit and delete mappings
- Teacher-subject mapping
  - Assign a teacher to a class-section-subject combination
  - Edit and delete mappings
- Exam management
  - Create, edit, delete, and search exams
  - Assign an exam to one or more class-sections
  - Filter exams by class-section, academic year, and status
  - Save exams as `draft`, `published`, or `completed`
  - Publish draft exams from the UI
- Exam subject management
  - Add, edit, and delete subjects inside a selected exam
  - Define exam date, maximum marks, passing marks, and instructions
  - Restrict exam subjects to subjects mapped to the selected class-sections
- Marks management
  - Add, edit, and delete marks entries
  - Filter marks by subject
  - Search marks by student, roll number, or subject
  - Subject-wise bulk marks entry table
  - Download Excel template for marks entry
  - Upload marks from Excel
  - Validate marks against the subject maximum
- WhatsApp marks notifications
  - Select an exam and optional subject
  - Search and select recipients
  - Send marks to parents on WhatsApp
  - Add an optional custom note to the message
  - View per-recipient send results
- Audit logs
  - View audit entries for major modules
  - Filter by actor role, status, action, path, and date range
  - Pagination
  - CSV export

### Teacher Features

- Authentication
  - Teacher login/logout
  - Session restore on refresh
- Restricted marks access
  - Teachers can only manage marks for their assigned class-section-subject mappings
- Restricted notification access
  - Teachers can only send marks notifications for students they are allowed to access
- Teacher UI modules
  - `Marks`
  - `Notifications`

## Platform Capabilities

- Role-based access control for `admin` and `teacher`
- Multi-tenant style data scoping by `collegeId`
- JWT access token flow with refresh token rotation
- CSRF protection for refresh/logout actions
- Account lock after repeated failed login attempts
- API rate limiting
- Secure HTTP headers with Helmet
- MongoDB query sanitization
- Audit logging for write operations and login events
- WhatsApp safeguards
  - Maximum recipients per request
  - Monthly sending cap
  - Invalid phone handling
  - Per-recipient success/failure reporting

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string
- Meta WhatsApp Cloud API credentials

## Setup

1. Install dependencies.

```bash
cd backend
npm install

cd ../frontend
npm install
```

2. Create the backend environment file.

```bash
cd backend
copy .env.example .env
```

3. Start the backend server.

```bash
cd backend
npm run dev
```

4. Start the frontend app.

```bash
cd frontend
npm run dev
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

- Backend MongoDB settings now use `MONGO_URI` plus `MONGO_DB_NAME` separately.

## Notes

- In Meta test mode, only approved recipient numbers can receive WhatsApp messages.
- WhatsApp recipient numbers are normalized to digits-only E.164 format before sending.
