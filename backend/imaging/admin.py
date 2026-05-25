from django.contrib import admin

from .models import ImagingRequest, ImagingResult


@admin.register(ImagingRequest)
class ImagingRequestAdmin(admin.ModelAdmin):
    list_display = ("patient", "imaging_type", "status", "created_at")
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name")
    list_filter = ("imaging_type", "status")


@admin.register(ImagingResult)
class ImagingResultAdmin(admin.ModelAdmin):
    list_display = ("imaging_request", "uploaded_by", "created_at")
    search_fields = ("imaging_request__patient__health_id",)
