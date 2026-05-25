from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "target_type", "actor", "patient", "status", "created_at")
    search_fields = ("action", "target_type", "target_id", "request_id")
    list_filter = ("status", "created_at")
