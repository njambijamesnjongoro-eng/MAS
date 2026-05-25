# Phase 1 Architecture Notes

## Current boundaries

- `accounts`: identity, roles, and token lifecycle
- `patients`: registration, profile access, history foundation, search
- `audit`: event capture and audit review
- `common`: security middleware and permission primitives

## Why the frontend proxies the backend

The Next.js app stores JWTs in `httpOnly` cookies via route handlers instead of browser storage. This reduces token exposure to client-side JavaScript and keeps API calls same-origin from the browser's perspective.

## Current RBAC model

- Patients can only retrieve their linked `Patient` record and history
- Receptionists and nurses can register patients
- Doctors, nurses, receptionists, hospital admins, and super admins can update patient profiles
- Doctors and nurses can update patient histories
- Audit logs are restricted to hospital admins and super admins

## Performance notes

- Search fields are indexed at the model level
- Patient list responses are paginated
- Profile queries use `select_related` for linked user and history
- QR generation happens only on profile retrieval, not list views
