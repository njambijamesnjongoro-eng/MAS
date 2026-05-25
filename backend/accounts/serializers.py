from __future__ import annotations

from django.contrib.auth import authenticate
from rest_framework import serializers

from common.permissions.roles import get_role_code
from common.utils.security import normalize_text

from .models import Role, User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "code", "name", "description")


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    effective_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "effective_role",
            "role",
        )

    def get_effective_role(self, obj):
        return get_role_code(obj)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        username = normalize_text(attrs.get("username", ""))
        password = attrs.get("password")
        user = authenticate(
            request=self.context.get("request"),
            username=username,
            password=password,
        )
        if not user or not user.is_active:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_superuser and not user.role_id:
            raise serializers.ValidationError("User role is not assigned.")
        attrs["user"] = user
        return attrs
