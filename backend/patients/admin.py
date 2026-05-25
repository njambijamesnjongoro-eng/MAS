from django.contrib import admin

from .models import Patient, PatientHistory


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("health_id", "first_name", "last_name", "national_id", "phone_number", "created_at")
    search_fields = ("health_id", "first_name", "last_name", "national_id", "phone_number")
    list_filter = ("gender", "blood_group", "created_at")


@admin.register(PatientHistory)
class PatientHistoryAdmin(admin.ModelAdmin):
    list_display = ("patient", "updated_at")
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name")
