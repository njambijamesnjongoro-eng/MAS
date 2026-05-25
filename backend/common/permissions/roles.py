from __future__ import annotations

from typing import Iterable

from accounts.constants import RoleCode

STAFF_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.LAB_TECHNICIAN,
    RoleCode.PHARMACIST,
    RoleCode.RECEPTIONIST,
}

PATIENT_CREATE_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.NURSE,
    RoleCode.RECEPTIONIST,
}

PATIENT_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.RECEPTIONIST,
}

PATIENT_DELETE_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
}

PATIENT_HISTORY_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
}

AUDIT_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
}

VISIT_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.LAB_TECHNICIAN,
    RoleCode.PHARMACIST,
}

VISIT_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
}

VITALS_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
}

VITALS_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
}

DIAGNOSIS_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
}

DIAGNOSIS_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
}

PRESCRIPTION_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.PHARMACIST,
}

PRESCRIPTION_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
}

PRESCRIPTION_DISPENSE_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.PHARMACIST,
}

LAB_REQUEST_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.LAB_TECHNICIAN,
}

LAB_REQUEST_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
}

LAB_RESULT_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.LAB_TECHNICIAN,
}

TIMELINE_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
}

ADMISSION_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.RECEPTIONIST,
}

ADMISSION_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
}

WARD_MANAGE_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
}

BILLING_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.RECEPTIONIST,
    RoleCode.PHARMACIST,
}

BILLING_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.RECEPTIONIST,
}

PAYMENT_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.RECEPTIONIST,
}

IMAGING_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.LAB_TECHNICIAN,
}

IMAGING_REQUEST_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
}

IMAGING_RESULT_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.LAB_TECHNICIAN,
}

NOTIFICATION_VIEW_ROLES = STAFF_VIEW_ROLES

REPORT_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
}

APPOINTMENT_VIEW_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.RECEPTIONIST,
}

APPOINTMENT_EDIT_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.DOCTOR,
    RoleCode.NURSE,
    RoleCode.RECEPTIONIST,
}

APPOINTMENT_REMINDER_DASHBOARD_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.RECEPTIONIST,
}

COMMUNICATION_PREFERENCE_EDIT_ROLES = APPOINTMENT_EDIT_ROLES


def get_role_code(user) -> str | None:
    if not user or not getattr(user, "is_authenticated", False):
        return None
    if getattr(user, "is_superuser", False):
        return RoleCode.SUPER_ADMIN
    role = getattr(user, "role", None)
    return getattr(role, "code", None)


def has_any_role(user, roles: Iterable[str]) -> bool:
    return get_role_code(user) in set(roles)
