from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "updated_at")
    search_fields = ("name", "code")


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")
    list_filter = ("is_active", "is_staff", "is_superuser", "role")
    fieldsets = UserAdmin.fieldsets + (
        (
            "Hospital Access",
            {
                "fields": (
                    "role",
                    "phone_number",
                    "must_change_password",
                    "last_password_change_at",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
    readonly_fields = ("created_at", "updated_at", "last_password_change_at")
