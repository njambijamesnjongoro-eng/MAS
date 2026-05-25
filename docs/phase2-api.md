# Phase 2 API Notes

## Clinical module overview

Phase 2 adds a dedicated `clinical` Django app and keeps Phase 1 patient registration intact. The main write surface is the visit workflow, which supports nested submission of vitals, diagnosis, prescriptions, and lab requests.

## Main endpoints

### Dashboard

- `GET /api/clinical/dashboard/summary/`
  Returns role-aware dashboard data:
  - patient count
  - today's visits
  - open visits
  - pending lab requests
  - recent patients

### Patient-specific clinical history

- `GET /api/clinical/patients/{patient_id}/visits/`
  Returns paginated encounter history for one patient.

- `GET /api/clinical/patients/{patient_id}/timeline/`
  Returns a reverse-chronological unified timeline combining:
  - visits
  - vitals
  - diagnoses
  - prescriptions
  - lab requests
  - lab results

### Visits

- `GET /api/clinical/visits/`
  Supports filtering by `patient`, `doctor`, `status`, `visit_date_from`, `visit_date_to`, `follow_up_from`, `follow_up_to`, plus search by `visit_id`, patient name, complaint, and diagnosis summary.

- `POST /api/clinical/visits/`
  Accepts nested payload:

```json
{
  "patient": 1,
  "visit_date": "2026-05-19T08:30:00Z",
  "chief_complaint": "Headache and dizziness",
  "symptoms": "Frontal headache, dizziness, mild nausea",
  "diagnosis_summary": "Migraine without aura",
  "treatment_plan": "Hydration, analgesics, follow-up in one week",
  "follow_up_date": "2026-05-26",
  "status": "open",
  "vitals": {
    "temperature": 36.8,
    "blood_pressure": "124/82",
    "pulse_rate": 82,
    "respiratory_rate": 18,
    "oxygen_saturation": 98,
    "weight": 68,
    "height": 170
  },
  "diagnosis": {
    "primary_diagnosis": "Migraine without aura",
    "secondary_diagnosis": "",
    "icd_code": "G43.0",
    "severity": "moderate",
    "clinical_notes": "No red-flag neurological signs."
  },
  "prescriptions": [
    {
      "medication_name": "Paracetamol",
      "dosage": "1 g",
      "frequency": "Three times daily",
      "duration": "3 days",
      "route": "Oral",
      "instructions": "After food",
      "status": "active"
    }
  ],
  "lab_requests": [
    {
      "test_name": "Full blood count",
      "priority": "routine",
      "clinical_notes": "Check for anemia",
      "status": "requested"
    }
  ]
}
```

- `PATCH /api/clinical/visits/{id}/`
  Updates the same nested structure. Omitted prescriptions and lab requests are removed from that visit's set.

- `POST /api/clinical/visits/{id}/close/`
  Marks the visit closed and writes an audit event.

### Module list/search endpoints

- `GET /api/clinical/vitals/`
- `GET /api/clinical/diagnoses/`
- `GET /api/clinical/prescriptions/`
- `GET /api/clinical/lab-requests/`

All are paginated and support filter/search combinations suited to the module.

### Prescription dispensing

- `POST /api/clinical/prescriptions/{id}/dispense/`
  Allowed to pharmacists, hospital admins, and super admins.

### Lab result upload

- `POST /api/clinical/lab-requests/{id}/result/`
- `PATCH /api/clinical/lab-requests/{id}/result/`

Accepts `multipart/form-data` or JSON. Supported fields:
- `result_text`
- `remarks`
- `attachment`

On save, the linked lab request moves to `completed`.

## Permission summary

- Doctors: create/update/close visits, diagnoses, prescriptions, lab requests, and view vitals
- Nurses: record and update vitals, view clinical history
- Pharmacists: view prescriptions and mark them dispensed
- Lab technicians: view lab requests and upload lab results
- Patients: view only their own history and timeline

All permissions are enforced on backend APIs even if the frontend hides unavailable actions.
