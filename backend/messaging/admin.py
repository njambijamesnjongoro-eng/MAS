from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "module", "is_read", "created_at")
    search_fields = ("title", "recipient__username", "message")
    list_filter = ("module", "is_read", "created_at")
