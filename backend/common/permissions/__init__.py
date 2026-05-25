from __future__ import annotations

from rest_framework.permissions import BasePermission

from accounts.constants import RoleCode
from .roles import (
    APPOINTMENT_EDIT_ROLES,
    APPOINTMENT_REMINDER_DASHBOARD_ROLES,
    APPOINTMENT_VIEW_ROLES,
    ADMISSION_EDIT_ROLES,
    ADMISSION_VIEW_ROLES,
    AUDIT_VIEW_ROLES,
    BILLING_EDIT_ROLES,
    BILLING_VIEW_ROLES,
    COMMUNICATION_PREFERENCE_EDIT_ROLES,
    DIAGNOSIS_EDIT_ROLES,
    DIAGNOSIS_VIEW_ROLES,
    LAB_REQUEST_EDIT_ROLES,
    LAB_REQUEST_VIEW_ROLES,
    LAB_RESULT_EDIT_ROLES,
    IMAGING_REQUEST_EDIT_ROLES,
    IMAGING_RESULT_EDIT_ROLES,
    IMAGING_VIEW_ROLES,
    NOTIFICATION_VIEW_ROLES,
    PATIENT_CREATE_ROLES,
    PATIENT_DELETE_ROLES,
    PATIENT_EDIT_ROLES,
    PATIENT_HISTORY_EDIT_ROLES,
    PAYMENT_EDIT_ROLES,
    PRESCRIPTION_DISPENSE_ROLES,
    PRESCRIPTION_EDIT_ROLES,
    PRESCRIPTION_VIEW_ROLES,
    REPORT_VIEW_ROLES,
    STAFF_VIEW_ROLES,
    TIMELINE_VIEW_ROLES,
    VISIT_EDIT_ROLES,
    VISIT_VIEW_ROLES,
    VITALS_EDIT_ROLES,
    VITALS_VIEW_ROLES,
    WARD_MANAGE_ROLES,
    get_role_code,
    has_any_role,
)


def is_patient_self(user, patient) -> bool:
    return get_role_code(user) == RoleCode.PATIENT and getattr(patient, "linked_user_id", None) == user.id


class IsAuthenticatedAndActive(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active)


class CanViewPatientRecords(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, STAFF_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, STAFF_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanRegisterPatients(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PATIENT_CREATE_ROLES)


class CanEditPatientRecords(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PATIENT_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, PATIENT_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanDeletePatients(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PATIENT_DELETE_ROLES)


class CanEditPatientHistory(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PATIENT_HISTORY_EDIT_ROLES)


class CanReviewAuditLogs(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, AUDIT_VIEW_ROLES)


class CanViewVisits(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, VISIT_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, VISIT_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManageVisits(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, VISIT_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, VISIT_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanViewVitals(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, VITALS_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, VITALS_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanRecordVitals(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, VITALS_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, VITALS_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanViewDiagnoses(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, DIAGNOSIS_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, DIAGNOSIS_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManageDiagnoses(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, DIAGNOSIS_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, DIAGNOSIS_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanViewPrescriptions(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PRESCRIPTION_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, PRESCRIPTION_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManagePrescriptions(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PRESCRIPTION_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, PRESCRIPTION_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanDispensePrescriptions(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PRESCRIPTION_DISPENSE_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, PRESCRIPTION_DISPENSE_ROLES) and not is_patient_self(request.user, patient)


class CanViewLabRequests(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, LAB_REQUEST_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, LAB_REQUEST_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManageLabRequests(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, LAB_REQUEST_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, LAB_REQUEST_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanUploadLabResults(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, LAB_RESULT_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, LAB_RESULT_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanViewTimeline(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, TIMELINE_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, TIMELINE_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanViewAdmissions(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, ADMISSION_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, ADMISSION_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManageAdmissions(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, ADMISSION_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, ADMISSION_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanManageWards(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, WARD_MANAGE_ROLES)


class CanViewBilling(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, BILLING_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, BILLING_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManageBilling(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, BILLING_EDIT_ROLES)


class CanRecordPayments(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, PAYMENT_EDIT_ROLES)


class CanViewImaging(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, IMAGING_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, IMAGING_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManageImagingRequests(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, IMAGING_REQUEST_EDIT_ROLES)


class CanManageImagingResults(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, IMAGING_RESULT_EDIT_ROLES)


class CanViewNotifications(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, NOTIFICATION_VIEW_ROLES | {RoleCode.PATIENT})


class CanViewReports(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, REPORT_VIEW_ROLES)


class CanViewAppointments(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, APPOINTMENT_VIEW_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, APPOINTMENT_VIEW_ROLES) or is_patient_self(request.user, patient)


class CanManageAppointments(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, APPOINTMENT_EDIT_ROLES)

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, APPOINTMENT_EDIT_ROLES) and not is_patient_self(request.user, patient)


class CanManageAppointmentCommunicationPreferences(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, COMMUNICATION_PREFERENCE_EDIT_ROLES | {RoleCode.PATIENT})

    def has_object_permission(self, request, view, obj):
        patient = getattr(obj, "patient", obj)
        return has_any_role(request.user, COMMUNICATION_PREFERENCE_EDIT_ROLES) or is_patient_self(request.user, patient)


class CanViewAppointmentReminderDashboard(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, APPOINTMENT_REMINDER_DASHBOARD_ROLES)


class CanViewAppointmentReminderLogs(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, APPOINTMENT_REMINDER_DASHBOARD_ROLES)
