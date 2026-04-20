# InternConnect 🎓

A full-stack college placement management system with role-based dashboards for Admins and Students.

---

## 🚀 Tech Stack

| Layer      | Technology                             |
|------------|----------------------------------------|
| Frontend   | React 18, Tailwind CSS, Chart.js       |
| Backend    | Node.js, Express.js                    |
| Database   | MongoDB (Mongoose)                     |
| Auth       | JWT + bcryptjs                         |
| Email      | Nodemailer (SMTP)                      |
| File Upload| Multer (CSV, Excel, PDF)               |
| Deployment | Vercel (frontend), Render (backend)    |

---

## 📁 Folder Structure

```
internconnect/
├── server/
│   ├── index.js                  # Entry point
│   ├── models/
│   │   ├── User.js               # Student + Admin schema
│   │   ├── Opportunity.js        # Job/internship schema
│   │   ├── Application.js        # Application + status history
│   │   └── AuditLog.js           # AuditLog, Announcement, Notification
│   ├── routes/
│   │   ├── auth.js               # Login, password change, seed admin
│   │   ├── students.js           # CRUD + bulk import/update + resume
│   │   ├── opportunities.js      # CRUD + eligibility engine
│   │   ├── applications.js       # Apply, status update, withdraw
│   │   ├── analytics.js          # Dashboard stats + charts data
│   │   ├── announcements.js      # Post/delete announcements
│   │   ├── notifications.js      # Student notifications
│   │   └── admin.js              # Audit logs
│   ├── middleware/
│   │   └── auth.js               # protect, adminOnly, studentOnly
│   └── utils/
│       └── email.js              # Nodemailer + HTML templates
│
└── client/
    ├── public/index.html
    └── src/
        ├── App.jsx               # Routes + auth guards
        ├── index.js
        ├── index.css             # Tailwind + custom classes
        ├── services/api.js       # Axios instance with interceptors
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── admin/AdminLayout.jsx
        │   ├── student/StudentLayout.jsx
        │   └── shared/NotificationBell.jsx
        └── pages/
            ├── auth/LoginPage.jsx
            ├── auth/ChangePassword.jsx
            ├── admin/AdminDashboard.jsx    # Charts + stats
            ├── admin/StudentsPage.jsx      # CRUD + bulk upload
            ├── admin/OpportunitiesAdmin.jsx
            ├── admin/ApplicationsAdmin.jsx
            ├── admin/AnnouncementsAdmin.jsx
            ├── admin/AuditLogsPage.jsx
            ├── student/StudentDashboard.jsx
            ├── student/OpportunitiesPage.jsx # Eligibility engine
            ├── student/MyApplications.jsx
            └── student/ProfilePage.jsx
```

---

## ⚙️ Local Setup

### 1. Clone & install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and SMTP credentials
```

### 3. Seed the admin account

Start the server, then run once:
```bash
curl -X POST http://localhost:5000/api/auth/seed-admin
```

This creates an admin with `studentId: ADMIN001` and `password: admin@123` (or whatever is in your `.env`).

### 4. Run development servers

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm start
```

Frontend runs at `http://localhost:3000`, proxies API calls to `http://localhost:5000`.

---

## 📊 Database Schema

### Users collection
| Field           | Type     | Notes                          |
|-----------------|----------|--------------------------------|
| studentId       | String   | Unique, uppercase (e.g. CS2024001) |
| name            | String   | Required                       |
| email           | String   | Unique, lowercase              |
| password        | String   | bcrypt hashed, excluded from queries |
| role            | Enum     | `student` \| `admin`           |
| department      | String   |                                |
| cgpa            | Number   | 0–10                           |
| amcatScore      | Number   |                                |
| isActive        | Boolean  | Soft enable/disable            |
| isFirstLogin    | Boolean  | Forces password reset          |
| placementStatus | Enum     | `not_placed` \| `placed` \| `opted_out` |

### Opportunities collection
| Field                    | Type     | Notes                     |
|--------------------------|----------|---------------------------|
| companyName              | String   |                           |
| role                     | String   |                           |
| eligibility.minCGPA      | Number   |                           |
| eligibility.minAMCAT     | Number   |                           |
| eligibility.departments  | [String] | Empty = all depts         |
| status                   | Enum     | `active` \| `upcoming` \| `closed` |
| applicationDeadline      | Date     |                           |

### Applications collection
| Field               | Type     | Notes                          |
|---------------------|----------|--------------------------------|
| student             | ObjectId | Ref: User                      |
| opportunity         | ObjectId | Ref: Opportunity               |
| status              | Enum     | `applied` → `shortlisted` → `selected` / `rejected` |
| statusHistory       | Array    | Full audit trail of changes    |
| cgpaAtApplication   | Number   | Snapshot at time of apply      |

---

## 🔌 Key API Endpoints

### Auth
| Method | Endpoint                    | Access  |
|--------|-----------------------------|---------|
| POST   | `/api/auth/login`           | Public  |
| GET    | `/api/auth/me`              | Any     |
| POST   | `/api/auth/change-password` | Any     |
| POST   | `/api/auth/seed-admin`      | Public (run once) |

### Students
| Method | Endpoint                        | Access |
|--------|---------------------------------|--------|
| GET    | `/api/students`                 | Admin  |
| POST   | `/api/students`                 | Admin  |
| PUT    | `/api/students/:id`             | Admin  |
| DELETE | `/api/students/:id`             | Admin  |
| POST   | `/api/students/:id/reset-password` | Admin |
| POST   | `/api/students/bulk/create`     | Admin  |
| POST   | `/api/students/bulk/update`     | Admin  |
| PUT    | `/api/students/me/profile`      | Student|
| POST   | `/api/students/me/resume`       | Student|

### Opportunities
| Method | Endpoint                  | Access   |
|--------|---------------------------|----------|
| GET    | `/api/opportunities`      | Any auth |
| GET    | `/api/opportunities/:id`  | Any auth |
| POST   | `/api/opportunities`      | Admin    |
| PUT    | `/api/opportunities/:id`  | Admin    |
| DELETE | `/api/opportunities/:id`  | Admin    |

### Applications
| Method | Endpoint                                | Access  |
|--------|-----------------------------------------|---------|
| GET    | `/api/applications`                     | Admin   |
| GET    | `/api/applications/my`                  | Student |
| POST   | `/api/applications/:oppId/apply`        | Student |
| PATCH  | `/api/applications/:id/status`          | Admin   |
| DELETE | `/api/applications/:id/withdraw`        | Student |

---

## 📦 Bulk CSV Format

### Bulk Create (required columns)
```
Student ID, Name, Email, CGPA, AMCAT Score, Department, Batch
CS2024001, John Doe, john@college.edu, 8.5, 420, CSE, 2024
```

### Bulk Update (Student ID required, rest optional)
```
Student ID, CGPA, AMCAT Score, Department, Batch
CS2024001, 8.7, 450, CSE, 2024
```

---

## 🌐 Deployment

### Backend on Render
1. Push `server/` to GitHub
2. Create a new Web Service on Render
3. Set environment variables from `.env.example`
4. Build command: `npm install`
5. Start command: `npm start`

### Frontend on Vercel
1. Push `client/` to GitHub
2. Import project on Vercel
3. Set `REACT_APP_API_URL=https://your-render-backend.onrender.com/api`
4. Deploy

### MongoDB Atlas
1. Create a free cluster
2. Add your Render IP to the allowlist (or use `0.0.0.0/0` for development)
3. Copy the connection string to `MONGODB_URI` in your env

---

## 🔐 Security Notes

- All routes are JWT-protected
- Admin routes have `adminOnly` middleware; student routes have `studentOnly`
- Passwords hashed with bcrypt (12 salt rounds)
- Resume uploads restricted to PDF, 5MB max
- CSV uploads restricted to .csv/.xlsx/.xls only
- Input validated with `express-validator`

---

## 📧 Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail.
2. Generate an App Password: Google Account → Security → App Passwords
3. Use that App Password as `SMTP_PASS` in your `.env`

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```
