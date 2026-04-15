# EduSync — Smart AI-Based Class Scheduler & Attendance System

## 🏗 Project Structure

```
edusync/
├── backend/          ← Node.js + Express + MongoDB API
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/
│   │   ├── User.js
│   │   └── index.js   (Course, Subject, Classroom, Timetable, Attendance, etc.)
│   ├── routes/
│   │   ├── auth.js    (login, signup, /me)
│   │   └── api.js     (all CRUD endpoints)
│   ├── server.js
│   ├── seed.js        ← demo data seeder
│   └── .env
│
└── frontend/         ← React 18 app
    ├── public/
    └── src/
        ├── components/
        │   ├── AuthPage.jsx
        │   └── AppShell.jsx  (dashboard, all views)
        ├── context/AuthContext.jsx
        └── utils/api.js      (axios + all API calls)
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB running locally OR MongoDB Atlas URI

---

### 1. Backend Setup

```bash
cd backend
npm install

# Edit .env if needed (change MONGODB_URI for Atlas)
# Default: mongodb://localhost:27017/edusync

# Seed demo data (users, subjects, courses, etc.)
npm run seed

# Start backend server
npm run dev
# Runs on: http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
# Runs on: http://localhost:3000
```

---

## 🔑 Demo Login Credentials

| Role    | Email                  | Password     |
|---------|------------------------|--------------|
| Admin   | admin@school.edu       | admin123     |
| Faculty | riya@school.edu        | faculty123   |
| Student | rahul@school.edu       | student123   |

---

## ✨ Features

- **JWT Authentication** — Secure login/signup with role-based access
- **Admin Dashboard** — Manage courses, subjects, faculty, students, classrooms
- **AI Timetable Generator** — Constraint-based algorithm (no faculty/room/batch conflicts)
- **Face Scan Attendance** — Camera-based biometric attendance with confidence score
- **WiFi Attendance** — Campus WiFi session tracking
- **Results Management** — Internal/external marks, auto grade calculation
- **Fee Tracking** — Semester-wise fee status
- **Announcements** — Faculty/Admin → batch-specific notifications

---

## 🛠 Tech Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Frontend | React 18, React Router v6, Axios  |
| Backend  | Node.js, Express.js               |
| Database | MongoDB + Mongoose                |
| Auth     | JWT (jsonwebtoken) + bcryptjs     |

---

## 🌐 API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET  /api/auth/me`

### Data (Protected — Bearer token required)
- `GET/POST/PUT/DELETE /api/courses`
- `GET/POST/PUT/DELETE /api/subjects`
- `GET/POST/PUT/DELETE /api/classrooms`
- `GET /api/timetable`
- `POST /api/timetable/generate` (Admin only)
- `GET/POST /api/attendance`
- `GET/POST /api/facescanlogs`
- `GET/POST /api/wifisessions`
- `GET/POST /api/results`
- `GET/POST/PUT /api/fees`
- `GET/POST /api/announcements`
- `GET/POST /api/users` (Admin only)
