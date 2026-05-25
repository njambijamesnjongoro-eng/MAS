# Appointment Reminder API Notes

## Overview

The appointment reminder module adds scheduling, patient communication preferences, reminder delivery logging, and Celery-driven background reminders to the Hospital EHR platform.

The reminder content is intentionally minimal and avoids exposing diagnosis, visit reason, or other sensitive medical details over SMS or email.

## Core backend resources

- `Appointment`
- `PatientCommunicationPreference`
- `ReminderLog`

## Background jobs

- `appointments.tasks.schedule_next_day_appointment_reminders_task`
  - Runs daily via Celery beat
  - Finds next-day appointments
  - Creates reminder logs
  - Queues SMS and email delivery jobs
- `appointments.tasks.process_appointment_reminder_log_task`
  - Sends an individual SMS or email reminder
  - Updates delivery status and provider response metadata
  - Schedules retries for transient failures
- `appointments.tasks.retry_due_appointment_reminders_task`
  - Scans for failed reminder logs whose retry time has arrived
  - Requeues reminder delivery

## API routes

### Appointments

- `GET /api/appointments/appointments/`
- `POST /api/appointments/appointments/`
- `GET /api/appointments/appointments/{id}/`
- `PATCH /api/appointments/appointments/{id}/`
- `POST /api/appointments/appointments/{id}/send_reminder/`

### Patient reminder context

- `GET /api/appointments/patients/{patient_id}/history/`
- `GET /api/appointments/patients/{patient_id}/communication-preferences/`
- `PUT /api/appointments/patients/{patient_id}/communication-preferences/`

### Reminder operations

- `GET /api/appointments/dashboard/summary/`
- `POST /api/appointments/dashboard/summary/`
- `GET /api/appointments/reminder-logs/`
- `POST /api/appointments/reminder-logs/{id}/retry/`
- `GET /api/appointments/reference-data/`

## Permission model

- Doctors, receptionists, hospital admins, and super admins can schedule appointments.
- Patients can only view their own appointment history.
- Reminder dashboard and reminder-log operations are restricted to staff roles with reminder-management access.
- Communication preferences are enforced server-side and validated against patient context.

## Delivery integrations

### SMS

- Provider: Africa's Talking
- Required settings:
  - `AFRICASTALKING_USERNAME`
  - `AFRICASTALKING_API_KEY`
  - `AFRICASTALKING_SENDER_ID` optional

### Email

- Provider: SMTP or SendGrid SMTP-compatible delivery
- Required settings:
  - `EMAIL_HOST`
  - `EMAIL_PORT`
  - `EMAIL_HOST_USER`
  - `EMAIL_HOST_PASSWORD`
  - `DEFAULT_FROM_EMAIL`

## Deployment checklist

- Enable Redis and point `REDIS_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND` to it.
- Run both Celery worker and Celery beat in production.
- Set a real `DJANGO_SECRET_KEY`.
- Keep secure cookies and SSL redirect enabled in production.
- Provide valid Africa's Talking and email credentials before enabling reminder operations for real patients.
