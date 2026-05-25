from __future__ import annotations

from django.conf import settings
from django.db import models


class Notification(models.Model):
    title = models.CharField(max_length=160)
    message = models.TextField()
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notifications", on_delete=models.CASCADE)
    patient = models.ForeignKey("patients.Patient", related_name="notifications", on_delete=models.SET_NULL, null=True, blank=True)
    module = models.CharField(max_length=80, default="system", db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "created_at"]),
        ]

    def __str__(self) -> str:
        return self.title
