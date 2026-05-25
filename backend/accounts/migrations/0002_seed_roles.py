from django.db import migrations


def seed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    roles = [
        ("super_admin", "Super Admin", "Platform-level administrative control."),
        ("hospital_admin", "Hospital Admin", "Hospital-wide operational administration."),
        ("doctor", "Doctor", "Clinical access to patient records and histories."),
        ("nurse", "Nurse", "Care-team access to patient records and histories."),
        ("lab_technician", "Lab Technician", "Read access to patient context for diagnostics."),
        ("pharmacist", "Pharmacist", "Read access to patient context for medication review."),
        ("receptionist", "Receptionist", "Front-desk access for registration and demographic updates."),
        ("patient", "Patient", "Read-only access to the linked patient record."),
    ]
    for code, name, description in roles:
        Role.objects.update_or_create(
            code=code,
            defaults={"name": name, "description": description},
        )


def unseed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(
        code__in=[
            "super_admin",
            "hospital_admin",
            "doctor",
            "nurse",
            "lab_technician",
            "pharmacist",
            "receptionist",
            "patient",
        ]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_roles, reverse_code=unseed_roles),
    ]
