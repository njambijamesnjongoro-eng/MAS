from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models

from .constants import RoleCode


class Role(models.Model):
    code = models.CharField(max_length=40, unique=True, choices=RoleCode.CHOICES)
    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class User(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.ForeignKey(
        Role,
        related_name="users",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    phone_number = models.CharField(max_length=20, blank=True)
    must_change_password = models.BooleanField(default=False)
    last_password_change_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["username"]

    def __str__(self) -> str:
        return self.username
