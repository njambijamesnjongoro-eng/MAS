from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.constants import RoleCode
from accounts.models import Role, User
from clinical.models import Visit
from finance.models import Invoice, Payment
from imaging.models import ImagingRequest
from messaging.models import Notification
from operations.models import Admission, Bed, Ward
from patients.models import Patient


class Command(BaseCommand):
    help = "Seed example Phase 3 operational data for local testing."

    def handle(self, *args, **options):
        hospital_admin_role = Role.objects.get(code=RoleCode.HOSPITAL_ADMIN)
        doctor_role = Role.objects.get(code=RoleCode.DOCTOR)
        lab_role = Role.objects.get(code=RoleCode.LAB_TECHNICIAN)
        receptionist_role = Role.objects.get(code=RoleCode.RECEPTIONIST)

        admin, _ = User.objects.get_or_create(
            username="admin.phase3",
            defaults={
                "email": "admin.phase3@example.com",
                "role": hospital_admin_role,
                "first_name": "Martha",
                "last_name": "Njeri",
                "is_active": True,
            },
        )
        doctor, _ = User.objects.get_or_create(
            username="doctor.phase3",
            defaults={
                "email": "doctor.phase3@example.com",
                "role": doctor_role,
                "first_name": "Brian",
                "last_name": "Odhiambo",
                "is_active": True,
            },
        )
        lab_user, _ = User.objects.get_or_create(
            username="lab.phase3",
            defaults={
                "email": "lab.phase3@example.com",
                "role": lab_role,
                "first_name": "Janet",
                "last_name": "Mutheu",
                "is_active": True,
            },
        )
        receptionist, _ = User.objects.get_or_create(
            username="reception.phase3",
            defaults={
                "email": "reception.phase3@example.com",
                "role": receptionist_role,
                "first_name": "Kevin",
                "last_name": "Kariuki",
                "is_active": True,
            },
        )

        for user in (admin, doctor, lab_user, receptionist):
            if not user.has_usable_password():
                user.set_password("ChangeMe123456")
                user.save()

        patient, _ = Patient.objects.get_or_create(
            national_id="P3-DEMO-001",
            defaults={
                "first_name": "Rose",
                "last_name": "Wanjiru",
                "date_of_birth": date(1978, 8, 21),
                "gender": Patient.Gender.FEMALE,
                "phone_number": "+254711111111",
                "email": "rose.wanjiru@example.com",
                "address": "Nairobi West",
                "emergency_contact": "Peter Wanjiru +254722222222",
                "blood_group": Patient.BloodGroup.A_POSITIVE,
                "allergies": "None known",
                "chronic_conditions": "Diabetes mellitus",
                "created_by": receptionist,
                "updated_by": receptionist,
            },
        )

        visit, _ = Visit.objects.get_or_create(
            patient=patient,
            doctor=doctor,
            visit_date=timezone.now() - timedelta(hours=2),
            defaults={
                "chief_complaint": "Shortness of breath",
                "symptoms": "Shortness of breath, fatigue, chest tightness",
                "diagnosis_summary": "Community acquired pneumonia",
                "treatment_plan": "Admit for monitoring, imaging, and antimicrobial therapy",
                "follow_up_date": timezone.localdate() + timedelta(days=5),
                "status": Visit.Status.IN_PROGRESS,
                "created_by": doctor,
                "updated_by": doctor,
            },
        )

        ward, _ = Ward.objects.get_or_create(
            ward_name="Medical Ward A",
            defaults={
                "ward_type": Ward.WardType.GENERAL,
                "capacity": 24,
                "description": "General adult medical ward.",
            },
        )
        bed, _ = Bed.objects.get_or_create(
            ward=ward,
            bed_number="A-12",
            defaults={"occupancy_status": Bed.OccupancyStatus.AVAILABLE},
        )

        admission, created = Admission.objects.get_or_create(
            patient=patient,
            status=Admission.Status.ACTIVE,
            defaults={
                "admitted_by": admin,
                "ward": ward,
                "bed": bed,
                "admission_reason": "Oxygen support and close inpatient monitoring.",
            },
        )
        if created:
            bed.occupancy_status = Bed.OccupancyStatus.OCCUPIED
            bed.save(update_fields=["occupancy_status", "updated_at"])

        invoice, _ = Invoice.objects.get_or_create(
            patient=patient,
            admission=admission,
            defaults={
                "consultation_fee": Decimal("1500.00"),
                "lab_fee": Decimal("2200.00"),
                "pharmacy_fee": Decimal("3100.00"),
                "admission_fee": Decimal("5500.00"),
                "radiology_fee": Decimal("1800.00"),
                "insurance_provider": "Demo Health Insurance",
                "insurance_policy_number": "P3-INS-2026-001",
                "issued_by": receptionist,
            },
        )

        Payment.objects.get_or_create(
            invoice=invoice,
            transaction_reference="P3-DEMO-CASH-001",
            defaults={
                "amount_paid": Decimal("2500.00"),
                "payment_method": Payment.PaymentMethod.CASH,
                "recorded_by": receptionist,
            },
        )
        invoice.amount_paid = sum((payment.amount_paid for payment in invoice.payments.all()), Decimal("0.00"))
        invoice.save()

        imaging_request, _ = ImagingRequest.objects.get_or_create(
            patient=patient,
            visit=visit,
            imaging_type=ImagingRequest.ImagingType.XRAY,
            defaults={
                "requested_by": doctor,
                "clinical_notes": "Chest X-ray to assess extent of pulmonary infiltrates.",
                "status": ImagingRequest.Status.REQUESTED,
            },
        )

        Notification.objects.get_or_create(
            recipient=doctor,
            title="Admission alert",
            message=f"{patient.health_id} admitted to {ward.ward_name}, bed {bed.bed_number}.",
            module="operations",
            patient=patient,
        )
        Notification.objects.get_or_create(
            recipient=lab_user,
            title="Imaging request queued",
            message=f"{imaging_request.get_imaging_type_display()} requested for {patient.health_id}.",
            module="imaging",
            patient=patient,
        )

        self.stdout.write(self.style.SUCCESS("Phase 3 demo data seeded successfully."))
