from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.constants import RoleCode
from accounts.models import User
from patients.models import Patient

from appointments.models import Appointment, PatientCommunicationPreference


class Command(BaseCommand):
    help = "Seed demo appointments and communication preferences for the appointment reminder system."

    def handle(self, *args, **options):
        doctor = User.objects.filter(role__code=RoleCode.DOCTOR).first()
        scheduler = User.objects.filter(role__code__in=[RoleCode.HOSPITAL_ADMIN, RoleCode.RECEPTIONIST]).first()
        patients = list(Patient.objects.all()[:3])

        if not doctor or not scheduler or not patients:
            self.stdout.write(self.style.WARNING("Seed skipped: create at least one doctor, one admin/receptionist, and patients first."))
            return

        for index, patient in enumerate(patients, start=1):
            appointment_date = timezone.localdate() + timedelta(days=index)
            appointment_time = timezone.localtime().replace(hour=8 + index, minute=30, second=0, microsecond=0).time()
            appointment, created = Appointment.objects.get_or_create(
                patient=patient,
                doctor=doctor,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                defaults={
                    "status": Appointment.Status.SCHEDULED,
                    "reason": f"Follow-up review {index}",
                    "notes": "Automated demo seed appointment.",
                    "phone_number": patient.phone_number,
                    "email": patient.email,
                    "scheduled_by": scheduler,
                    "updated_by": scheduler,
                },
            )
            PatientCommunicationPreference.objects.get_or_create(
                patient=patient,
                defaults={
                    "sms_enabled": True,
                    "email_enabled": bool(patient.email),
                    "phone_number": patient.phone_number,
                    "email": patient.email,
                    "updated_by": scheduler,
                },
            )
            action = "Created" if created else "Exists"
            self.stdout.write(self.style.SUCCESS(f"{action} appointment {appointment.id} for {patient.health_id}"))
