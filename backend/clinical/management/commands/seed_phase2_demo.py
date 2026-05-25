from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.constants import RoleCode
from accounts.models import Role, User
from clinical.models import Diagnosis, LabRequest, Prescription, Visit, VitalSigns
from patients.models import Patient, PatientHistory


class Command(BaseCommand):
    help = "Seed example Phase 2 clinical data for local testing."

    def handle(self, *args, **options):
        doctor_role = Role.objects.get(code=RoleCode.DOCTOR)
        nurse_role = Role.objects.get(code=RoleCode.NURSE)

        doctor, _ = User.objects.get_or_create(
            username="doctor.phase2",
            defaults={
                "email": "doctor.phase2@example.com",
                "role": doctor_role,
                "first_name": "Amina",
                "last_name": "Otieno",
                "is_active": True,
            },
        )
        if not doctor.has_usable_password():
            doctor.set_password("ChangeMe123456")
            doctor.save()

        nurse, _ = User.objects.get_or_create(
            username="nurse.phase2",
            defaults={
                "email": "nurse.phase2@example.com",
                "role": nurse_role,
                "first_name": "Grace",
                "last_name": "Mwangi",
                "is_active": True,
            },
        )
        if not nurse.has_usable_password():
            nurse.set_password("ChangeMe123456")
            nurse.save()

        patient, _ = Patient.objects.get_or_create(
            national_id="P2-DEMO-001",
            defaults={
                "first_name": "Daniel",
                "last_name": "Kamau",
                "date_of_birth": date(1989, 4, 14),
                "gender": Patient.Gender.MALE,
                "phone_number": "+254700000001",
                "email": "daniel.kamau@example.com",
                "address": "Nairobi",
                "emergency_contact": "Jane Kamau +254700000002",
                "blood_group": Patient.BloodGroup.O_POSITIVE,
                "allergies": "Penicillin",
                "chronic_conditions": "Hypertension",
                "created_by": doctor,
                "updated_by": doctor,
            },
        )
        PatientHistory.objects.get_or_create(
            patient=patient,
            defaults={
                "summary": "Established patient with intermittent hypertension.",
                "past_medical_history": "No prior surgeries.",
                "current_medications": "Amlodipine",
                "notes": "Phase 2 seeded record.",
                "created_by": doctor,
                "updated_by": doctor,
            },
        )

        visit, _ = Visit.objects.get_or_create(
            patient=patient,
            doctor=doctor,
            visit_date=timezone.now(),
            defaults={
                "chief_complaint": "Persistent cough",
                "symptoms": "Dry cough, fatigue, mild chest discomfort",
                "diagnosis_summary": "Upper respiratory tract infection",
                "treatment_plan": "Symptomatic treatment and hydration",
                "follow_up_date": timezone.localdate() + timedelta(days=7),
                "status": Visit.Status.IN_PROGRESS,
                "created_by": doctor,
                "updated_by": doctor,
            },
        )

        VitalSigns.objects.update_or_create(
            visit=visit,
            defaults={
                "patient": patient,
                "recorded_by": nurse,
                "temperature": 37.4,
                "systolic_bp": 126,
                "diastolic_bp": 82,
                "pulse_rate": 88,
                "respiratory_rate": 18,
                "oxygen_saturation": 97,
                "weight": 72,
                "height": 176,
            },
        )

        Diagnosis.objects.update_or_create(
            visit=visit,
            defaults={
                "patient": patient,
                "diagnosed_by": doctor,
                "primary_diagnosis": "Upper respiratory tract infection",
                "secondary_diagnosis": "Hypertension",
                "icd_code": "J06.9",
                "severity": Diagnosis.Severity.MILD,
                "clinical_notes": "Monitor blood pressure and return if symptoms worsen.",
            },
        )

        Prescription.objects.get_or_create(
            visit=visit,
            patient=patient,
            prescribed_by=doctor,
            medication_name="Paracetamol",
            defaults={
                "dosage": "500 mg",
                "frequency": "Three times daily",
                "duration": "5 days",
                "route": "Oral",
                "instructions": "After meals if fever persists.",
            },
        )

        LabRequest.objects.get_or_create(
            visit=visit,
            patient=patient,
            requested_by=doctor,
            test_name="Full blood count",
            defaults={
                "priority": LabRequest.Priority.ROUTINE,
                "clinical_notes": "Rule out bacterial infection.",
                "status": LabRequest.Status.REQUESTED,
            },
        )

        self.stdout.write(self.style.SUCCESS("Phase 2 demo data seeded successfully."))
