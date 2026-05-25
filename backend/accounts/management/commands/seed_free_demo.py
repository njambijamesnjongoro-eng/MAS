from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand

from accounts.constants import RoleCode
from accounts.models import Role, User


class Command(BaseCommand):
    help = "Seed free-tier demo users and sample hospital data for hosted demos."

    def handle(self, *args, **options):
        call_command("seed_phase2_demo")
        call_command("seed_phase3_demo")
        call_command("seed_appointments_demo")

        aliases = [
            ("admin", "admin.demo@example.com", RoleCode.HOSPITAL_ADMIN, "Martha", "Njeri"),
            ("doctor", "doctor.demo@example.com", RoleCode.DOCTOR, "Brian", "Odhiambo"),
            ("labtech", "labtech.demo@example.com", RoleCode.LAB_TECHNICIAN, "Janet", "Mutheu"),
            ("reception", "reception.demo@example.com", RoleCode.RECEPTIONIST, "Kevin", "Kariuki"),
        ]

        for username, email, role_code, first_name, last_name in aliases:
            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": email,
                    "role": Role.objects.get(code=role_code),
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_active": True,
                },
            )
            user.set_password("ChangeMe123456")
            user.save(update_fields=["password", "updated_at"])

        self.stdout.write(self.style.SUCCESS("Free-tier demo data seeded successfully."))
