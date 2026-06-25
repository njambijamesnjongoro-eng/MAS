# Hospital EHR Platform

Secure hospital Electronic Health Record platform for a single hospital, now extended through Phase 4 appointment reminders and deployment-ready operations.

## Stack

- Frontend: Next.js 16 + React 19 + Tailwind CSS 4
- Backend: Django 6 + Django REST Framework
- Database: PostgreSQL
- Cache: Redis
- Background tasks: Celery, with Vercel cron fallback for free-tier reminder scheduling
- Auth: JWT with refresh rotation and backend-enforced RBAC
- Deployment: Docker Compose + Nginx + free Render backend blueprint + Vercel frontend

## Current scope

### Phase 1 foundation

- Secure authentication and refresh-token flow
- Strict role-based access control
- Patient registration and demographic updates
- Fast patient search with pagination and filtering
- Patient profiles and medical history foundation
- Audit logging, CSRF, throttling, and HTTPS-ready settings

### Phase 2 clinical workflow

- Visit and encounter creation, editing, and closing
- Vital signs capture with BMI calculation
- Diagnosis recording with ICD support and severity
- Prescription creation and dispensing
- Lab request creation and lab result uploads with attachment support
- Unified patient medical timeline and doctor dashboard

### Phase 3 hospital operations

- Inpatient admissions with ward and bed allocation
- Bed transfer and discharge flow with automatic bed release
- Invoice generation, partial payments, and receipt-ready billing data
- Imaging requests, radiologist reports, and protected file downloads
- Internal notifications for operations, imaging, and finance
- Immutable advanced audit logging with module and device metadata
- Reporting foundation with CSV and PDF export
- Redis cache and Celery task foundation for scale-out operations
- OpenAPI schema plus Swagger and ReDoc API documentation

### Phase 4 appointment reminders

- Appointment scheduling with doctor and patient linkage
- Patient communication preferences for SMS and email reminders
- Reminder logs with delivery status, retry state, and provider metadata
- Celery-powered daily reminder scheduling and failed-delivery retries
- Free-tier fallback with Vercel cron plus inline backend reminder processing
- Africa's Talking SMS service integration layer
- SMTP or SendGrid email reminder integration layer
- Admin reminder dashboard and reminder history workspace

## Roles

- Super Admin
- Hospital Admin
- Doctor
- Nurse
- Lab Technician
- Pharmacist
- Receptionist
- Patient

Patients are restricted to their own history and cannot modify clinical or operational records. All permissions are enforced server-side.

## Repository layout

```text
.
|-- backend/
|   |-- accounts/
|   |-- appointments/
|   |-- audit/
|   |-- clinical/
|   |-- common/
|   |-- config/
|   |   `-- settings/
|   |-- finance/
|   |-- imaging/
|   |-- messaging/
|   |-- operations/
|   |-- patients/
|   |-- reporting/
|   |-- .env.example
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |   |-- clinical/
|   |   |   |-- dashboard/
|   |   |   |-- finance/
|   |   |   |-- imaging/
|   |   |   |-- messaging/
|   |   |   |-- operations/
|   |   |   `-- reporting/
|   |   |-- lib/
|   |   `-- types/
|   `-- .env.local.example
`-- docs/
```

## Backend architecture

- `accounts`: custom user model, role model, JWT login/logout/current-user endpoints
- `appointments`: appointments, communication preferences, reminder logs, Celery reminder scheduling, SMS and email delivery services
- `patients`: patient demographics, patient profile, and medical history foundation
- `clinical`: encounters, vitals, diagnoses, prescriptions, lab requests/results, patient timeline
- `operations`: wards, beds, admissions, transfers, discharge, operational dashboard summary, Phase 3 seed command
- `finance`: invoices, payments, auto-calculated balances, payment history
- `imaging`: imaging requests, result uploads, secure attachment download
- `messaging`: internal notifications and read tracking
- `reporting`: hospital summary metrics plus CSV/PDF export foundation
- `audit`: immutable activity trail for security-sensitive actions
- `common`: pagination, middleware, permission primitives, request and security helpers

## Frontend architecture

- Next.js App Router with secure route proxies to Django
- JWTs kept in `httpOnly` cookies and refreshed server-side
- Role-aware dashboard for clinical and operational users
- Dedicated workspaces for admissions, billing, imaging, notifications, and reporting
- Appointment booking, reminder operations, and communication-preference workspaces
- Reusable medical-style cards, forms, tables, toast notifications, and loading states

## Security design

- Django password hashing and validation
- JWT access and refresh tokens with rotation and blacklisting
- Backend-only authorization checks across clinical and operational modules
- Immutable audit logs for view, create, update, billing, admission, and download actions
- Validated medical file uploads and protected download routes
- Request throttling for search, write, upload, notification, and reporting endpoints
- CSRF middleware enabled on Django
- HTTPS-ready cookie and HSTS settings
- ORM-backed SQL injection protection
- Input normalization for free-text fields
- Redis and Celery foundation prepared for production task offloading
- Contact-validation and low-detail reminder messaging that avoids exposing medical details over SMS or email

## Key API routes

### Authentication

- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `POST /api/auth/refresh/`
- `GET /api/auth/me/`
- `GET /api/docs/`
- `GET /api/redoc/`

### Patients and Clinical

- `GET /api/patients/`
- `GET /api/clinical/dashboard/summary/`
- `GET /api/clinical/visits/`
- `POST /api/clinical/visits/`
- `GET /api/clinical/lab-requests/{id}/result/`
- `POST /api/clinical/lab-requests/{id}/result/`

### Operations

- `GET /api/operations/dashboard/summary/`
- `GET /api/operations/wards/`
- `GET /api/operations/beds/`
- `GET /api/operations/admissions/`
- `POST /api/operations/admissions/`
- `POST /api/operations/admissions/{id}/transfer/`
- `POST /api/operations/admissions/{id}/discharge/`
- `GET /api/operations/patients/{patient_id}/admissions/`

### Finance

- `GET /api/finance/invoices/`
- `POST /api/finance/invoices/`
- `GET /api/finance/invoices/{id}/receipt/`
- `GET /api/finance/payments/`
- `POST /api/finance/payments/`

### Imaging

- `GET /api/imaging/requests/`
- `POST /api/imaging/requests/`
- `GET /api/imaging/requests/{id}/result/`
- `POST /api/imaging/requests/{id}/result/`
- `GET /api/imaging/requests/{id}/download/`

### Notifications and Reporting

- `GET /api/notifications/`
- `GET /api/notifications/summary/`
- `POST /api/notifications/{id}/read/`
- `POST /api/notifications/read-all/`
- `GET /api/reports/summary/`
- `GET /api/reports/export/?report_type=admissions&format=csv`

### Appointments and Reminders

- `GET /api/appointments/appointments/`
- `POST /api/appointments/appointments/`
- `POST /api/appointments/appointments/{id}/send_reminder/`
- `GET /api/appointments/patients/{patient_id}/history/`
- `GET /api/appointments/patients/{patient_id}/communication-preferences/`
- `PUT /api/appointments/patients/{patient_id}/communication-preferences/`
- `GET /api/appointments/dashboard/summary/`
- `POST /api/appointments/dashboard/summary/`
- `GET /api/appointments/reminder-logs/`
- `POST /api/appointments/reminder-logs/{id}/retry/`
- `POST /api/appointments/cron/run/`

## Setup

### 1. Backend

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
```

Update `.env` with PostgreSQL and Redis credentials, then run:

```powershell
..\.venv\Scripts\python manage.py migrate
..\.venv\Scripts\python manage.py createsuperuser
..\.venv\Scripts\python manage.py runserver 0.0.0.0:8000
```

Optional demo data:

```powershell
..\.venv\Scripts\python manage.py seed_phase2_demo
..\.venv\Scripts\python manage.py seed_phase3_demo
..\.venv\Scripts\python manage.py seed_appointments_demo
```

For local Celery validation:

```powershell
..\.venv\Scripts\celery -A config worker --loglevel=info
..\.venv\Scripts\celery -A config beat --loglevel=info
```

### 2. Frontend

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Frontend runs on [http://localhost:3000](http://localhost:3000) and proxies to Django at `BACKEND_URL`.

### 3. Full stack with Docker

```powershell
docker-compose up --build
```

Service entry points:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- Nginx gateway: [http://localhost](http://localhost)
- Swagger docs: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- ReDoc: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)

### 4. Production deployment notes

- `backend/config/settings/prod.py` now refuses to boot with the default placeholder secret key, so set a real `DJANGO_SECRET_KEY`.
- For hosted frontends, use `DJANGO_CORS_ALLOWED_ORIGIN_REGEXES` for wildcard domains such as Render or Vercel.
- Keep `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and `SECURE_SSL_REDIRECT` enabled in production.
- Run both Celery worker and Celery beat in production so appointment reminders and retry jobs execute automatically.
- Configure `AFRICASTALKING_*` and email credentials before enabling live reminders.
- `render.yaml` is the default free-tier Render backend blueprint for Vercel + Render deployments. It creates one Django web service and one PostgreSQL database.

### 5. Free-tier deployment notes

- For a zero-cost demo deployment, use Vercel for `frontend` and Render for the Django `backend` plus PostgreSQL.
- In that setup, set `CELERY_TASK_ALWAYS_EAGER=True` and `APPOINTMENT_REMINDER_INLINE_MODE=True` on the backend so notification and reminder tasks run inside the web process.
- The default [render.yaml](./render.yaml) runs migrations and `seed_free_demo` during deploy, then starts Gunicorn directly. This keeps the free web service lightweight during cold starts and health checks.
- Set `APPOINTMENT_CRON_SECRET` on both backend and frontend, and set `CRON_SECRET` on Vercel. The included [frontend/vercel.json](./frontend/vercel.json) schedules a once-daily Vercel cron that calls the backend reminder endpoint.
- Free Render web services block outbound SMTP ports, so use `SENDGRID_API_KEY` for HTTP API email delivery instead of SMTP when deploying on free Render.
- Free Render web services spin down after 15 minutes of inactivity, and free Render Postgres expires after 30 days. This is suitable for demos and testing, not for production hospital operations.

## Local verification performed

- `python manage.py check` with SQLite override for local validation
- `python manage.py check --deploy` with production settings and safe env overrides
- `python manage.py migrate --noinput` with SQLite override to confirm Phase 3 migrations apply
- `python manage.py makemigrations --check --dry-run`
- `npm run lint`
- `npm run build`

SQLite was used only as a local validation fallback. Primary runtime target remains PostgreSQL.

## Additional docs

- [Phase 1 / Phase 2 architecture notes](./docs/phase1-architecture.md)
- [Phase 2 API notes](./docs/phase2-api.md)
- [Phase 3 API notes](./docs/phase3-api.md)
- [Appointment reminder API notes](./docs/appointment-reminders-api.md)
- Deployment assets: [docker-compose.yml](./docker-compose.yml), [nginx.conf](./nginx.conf), [render.yaml](./render.yaml), [render-free.yaml](./render-free.yaml)

## Next-phase direction

- Appointment scheduling and queue management
- Pharmacy and lab operational completion workflows
- Multi-hospital tenancy
- National interoperability and standards alignment
- Mobile and telemedicine surfaces
