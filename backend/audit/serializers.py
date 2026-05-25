from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    patient_health_id = serializers.CharField(source="patient.health_id", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor_username",
            "action",
            "module",
            "target_type",
            "target_id",
            "patient_health_id",
            "details",
            "status",
            "ip_address",
            "device_info",
            "request_id",
            "is_emergency_access",
            "created_at",
        )
