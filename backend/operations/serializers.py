from __future__ import annotations

from rest_framework import serializers

from common.utils.security import normalize_text

from .models import Admission, Bed, Ward


class WardSerializer(serializers.ModelSerializer):
    occupied_beds_count = serializers.IntegerField(source="occupied_beds", read_only=True)

    class Meta:
        model = Ward
        fields = ("id", "ward_name", "ward_type", "capacity", "description", "created_at", "updated_at", "occupied_beds_count")
        read_only_fields = ("created_at", "updated_at", "occupied_beds_count")

    def validate(self, attrs):
        if "ward_name" in attrs:
            attrs["ward_name"] = normalize_text(attrs["ward_name"])
        if "description" in attrs:
            attrs["description"] = normalize_text(attrs["description"])
        return attrs


class BedSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.ward_name", read_only=True)

    class Meta:
        model = Bed
        fields = ("id", "bed_number", "ward", "ward_name", "occupancy_status", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at", "ward_name")

    def validate_bed_number(self, value):
        return normalize_text(value)


class AdmissionSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    ward_name = serializers.CharField(source="ward.ward_name", read_only=True)
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)
    admitted_by_name = serializers.CharField(source="admitted_by.username", read_only=True)

    class Meta:
        model = Admission
        fields = (
            "id",
            "patient",
            "patient_name",
            "admitted_by",
            "admitted_by_name",
            "ward",
            "ward_name",
            "bed",
            "bed_number",
            "admission_reason",
            "admission_date",
            "discharge_date",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "status", "admitted_by")

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def validate(self, attrs):
        if "admission_reason" in attrs:
            attrs["admission_reason"] = normalize_text(attrs["admission_reason"])
        bed = attrs.get("bed") or getattr(self.instance, "bed", None)
        if bed and bed.occupancy_status != Bed.OccupancyStatus.AVAILABLE and not self.instance:
            raise serializers.ValidationError({"bed": "Selected bed is not available."})
        ward = attrs.get("ward") or getattr(self.instance, "ward", None)
        if bed and ward and bed.ward_id != ward.id:
            raise serializers.ValidationError({"bed": "Selected bed does not belong to the chosen ward."})
        return attrs

    def create(self, validated_data):
        return Admission.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class TransferAdmissionSerializer(serializers.Serializer):
    ward = serializers.PrimaryKeyRelatedField(queryset=Ward.objects.all())
    bed = serializers.PrimaryKeyRelatedField(queryset=Bed.objects.all())
