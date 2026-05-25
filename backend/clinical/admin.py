from django.contrib import admin

from .models import Diagnosis, LabRequest, LabResult, Prescription, Visit, VitalSigns


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("visit_id", "patient", "doctor", "visit_date", "status")
    search_fields = ("visit_id", "patient__health_id", "patient__first_name", "patient__last_name", "chief_complaint")
    list_filter = ("status", "visit_date")


@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ("visit", "temperature", "pulse_rate", "updated_at")
    search_fields = ("visit__visit_id", "patient__health_id")


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = ("visit", "primary_diagnosis", "icd_code", "severity", "created_at")
    search_fields = ("primary_diagnosis", "secondary_diagnosis", "icd_code", "patient__health_id")
    list_filter = ("severity", "created_at")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("medication_name", "patient", "visit", "status", "created_at")
    search_fields = ("medication_name", "patient__health_id", "visit__visit_id")
    list_filter = ("status", "created_at")


@admin.register(LabRequest)
class LabRequestAdmin(admin.ModelAdmin):
    list_display = ("test_name", "patient", "visit", "priority", "status", "created_at")
    search_fields = ("test_name", "patient__health_id", "visit__visit_id")
    list_filter = ("priority", "status", "created_at")


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("lab_request", "uploaded_by", "created_at")
    search_fields = ("lab_request__test_name", "lab_request__patient__health_id")
