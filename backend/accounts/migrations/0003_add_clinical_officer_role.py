from django.db import migrations, models


def add_clinical_officer_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.update_or_create(
        code="clinical_officer",
        defaults={
            "name": "Clinical Officer",
            "description": "Frontline clinician access for intake, triage, consultation, diagnosis, prescriptions, and orders.",
        },
    )


def remove_clinical_officer_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(code="clinical_officer").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_seed_roles"),
    ]

    operations = [
        migrations.AlterField(
            model_name="role",
            name="code",
            field=models.CharField(
                choices=[
                    ("super_admin", "Super Admin"),
                    ("hospital_admin", "Hospital Admin"),
                    ("clinical_officer", "Clinical Officer"),
                    ("doctor", "Doctor"),
                    ("nurse", "Nurse"),
                    ("lab_technician", "Lab Technician"),
                    ("pharmacist", "Pharmacist"),
                    ("receptionist", "Receptionist"),
                    ("patient", "Patient"),
                ],
                max_length=40,
                unique=True,
            ),
        ),
        migrations.RunPython(add_clinical_officer_role, reverse_code=remove_clinical_officer_role),
    ]
