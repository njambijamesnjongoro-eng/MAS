from django.contrib import admin

from .models import Admission, Bed, Ward


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ("ward_name", "ward_type", "capacity", "created_at")
    search_fields = ("ward_name", "description")
    list_filter = ("ward_type",)


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ("bed_number", "ward", "occupancy_status", "updated_at")
    search_fields = ("bed_number", "ward__ward_name")
    list_filter = ("ward", "occupancy_status")


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = ("patient", "ward", "bed", "status", "admission_date", "discharge_date")
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name", "admission_reason")
    list_filter = ("status", "ward")
