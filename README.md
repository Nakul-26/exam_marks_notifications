# Exam Marks Notification

Full-stack app for managing exams/marks and sending WhatsApp notifications to parents.

## Project Structure

- `backend/` - Express + MongoDB API
- `frontend/` - React + Vite web app

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

See `.env.example` for required keys.

## Notes

- In Meta test mode, only approved recipient numbers can receive messages.
- Use phone numbers in E.164 digits format without `+` for Cloud API payload `to` value.
