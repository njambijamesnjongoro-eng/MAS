from __future__ import annotations

from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="audit_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=120, db_index=True)
    module = models.CharField(max_length=80, db_index=True, default="system")
    target_type = models.CharField(max_length=120, db_index=True)
    target_id = models.CharField(max_length=120, blank=True)
    patient = models.ForeignKey(
        "patients.Patient",
        related_name="audit_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    details = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, default="success")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    device_info = models.CharField(max_length=255, blank=True)
    request_id = models.CharField(max_length=64, blank=True, db_index=True)
    is_emergency_access = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["module", "created_at"]),
            models.Index(fields=["target_type", "target_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} at {self.created_at:%Y-%m-%d %H:%M:%S}"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Audit logs are immutable and cannot be modified.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit logs are immutable and cannot be deleted.")
