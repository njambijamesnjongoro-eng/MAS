# Phase 3 API Notes

Phase 3 expands the platform from clinical documentation into hospital operations. All endpoints remain JWT-protected and subject to server-side RBAC, throttling, and audit logging.

## Operations

### Wards and beds

- `GET /api/operations/wards/`
- `GET /api/operations/beds/`

Ward and bed inventory is restricted to operational staff who can manage admissions.

### Admissions

- `GET /api/operations/admissions/`
- `POST /api/operations/admissions/`
- `GET /api/operations/admissions/{id}/`
- `PATCH /api/operations/admissions/{id}/`
- `POST /api/operations/admissions/{id}/transfer/`
- `POST /api/operations/admissions/{id}/discharge/`
- `GET /api/operations/patients/{patient_id}/admissions/`

Business rules:

- One active admission per patient
- One active occupant per bed
- Bed must belong to selected ward
- Discharge releases the bed automatically

## Finance

- `GET /api/finance/invoices/`
- `POST /api/finance/invoices/`
- `GET /api/finance/invoices/{id}/`
- `PATCH /api/finance/invoices/{id}/`
- `GET /api/finance/invoices/{id}/receipt/`
- `GET /api/finance/payments/`
- `POST /api/finance/payments/`

Billing rules:

- Invoice totals are recalculated on save
- Partial payments are supported
- Invoice balance and status are updated after payment creation

## Imaging

- `GET /api/imaging/requests/`
- `POST /api/imaging/requests/`
- `GET /api/imaging/requests/{id}/`
- `PATCH /api/imaging/requests/{id}/`
- `GET /api/imaging/requests/{id}/result/`
- `POST /api/imaging/requests/{id}/result/`
- `PATCH /api/imaging/requests/{id}/result/`
- `GET /api/imaging/requests/{id}/download/`

File handling:

- Attachments are validated for size and allowed file types
- Download access is permission-checked on the backend
- Upload storage is organized by patient health ID and imaging type

## Notifications

- `GET /api/notifications/`
- `GET /api/notifications/summary/`
- `POST /api/notifications/{id}/read/`
- `POST /api/notifications/read-all/`

## Reporting

- `GET /api/reports/summary/`
- `GET /api/reports/export/?report_type=admissions&format=csv`
- `GET /api/reports/export/?report_type=revenue&format=pdf`

Supported `report_type` values:

- `admissions`
- `revenue`
- `patient_statistics`
- `diagnoses`
- `lab_activity`
- `pharmacy_usage`

Supported `format` values:

- `csv`
- `pdf`

## Audit additions

Phase 3 audit entries now include:

- `module`
- `device_info`
- `is_emergency_access`

Audit records are immutable and cannot be updated or deleted through the model layer.
