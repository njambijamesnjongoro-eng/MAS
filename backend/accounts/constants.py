class RoleCode:
    SUPER_ADMIN = "super_admin"
    HOSPITAL_ADMIN = "hospital_admin"
    CLINICAL_OFFICER = "clinical_officer"
    DOCTOR = "doctor"
    NURSE = "nurse"
    LAB_TECHNICIAN = "lab_technician"
    PHARMACIST = "pharmacist"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"

    CHOICES = [
        (SUPER_ADMIN, "Super Admin"),
        (HOSPITAL_ADMIN, "Hospital Admin"),
        (CLINICAL_OFFICER, "Clinical Officer"),
        (DOCTOR, "Doctor"),
        (NURSE, "Nurse"),
        (LAB_TECHNICIAN, "Lab Technician"),
        (PHARMACIST, "Pharmacist"),
        (RECEPTIONIST, "Receptionist"),
        (PATIENT, "Patient"),
    ]
