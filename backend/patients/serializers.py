from __future__ import annotations

from datetime import date

from rest_framework import serializers

from common.utils.security import build_patient_qr_payload, generate_qr_code_data_url, normalize_text

from .models import Patient, PatientHistory


class PatientHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientHistory
        fields = (
            "summary",
            "past_medical_history",
            "surgical_history",
            "family_history",
            "social_history",
            "current_medications",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def validate(self, attrs):
        for field in (
            "summary",
            "past_medical_history",
            "surgical_history",
            "family_history",
            "social_history",
            "current_medications",
            "notes",
        ):
            if field in attrs and attrs[field]:
                attrs[field] = normalize_text(attrs[field])
        return attrs


class PatientListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            "id",
            "health_id",
            "full_name",
            "first_name",
            "last_name",
            "national_id",
            "date_of_birth",
            "gender",
            "phone_number",
            "blood_group",
            "created_at",
        )

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class PatientDetailSerializer(serializers.ModelSerializer):
    history = PatientHistorySerializer(read_only=True)
    qr_code_data_url = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            "id",
            "health_id",
            "qr_identifier",
            "qr_code_data_url",
            "first_name",
            "last_name",
            "national_id",
            "date_of_birth",
            "gender",
            "phone_number",
            "email",
            "address",
            "emergency_contact",
            "blood_group",
            "allergies",
            "chronic_conditions",
            "created_at",
            "updated_at",
            "history",
        )

    def get_qr_code_data_url(self, obj):
        return generate_qr_code_data_url(build_patient_qr_payload(obj))


class PatientWriteSerializer(serializers.ModelSerializer):
    history = PatientHistorySerializer(required=False)

    class Meta:
        model = Patient
        fields = (
            "linked_user",
            "first_name",
            "last_name",
            "national_id",
            "date_of_birth",
            "gender",
            "phone_number",
            "email",
            "address",
            "emergency_contact",
            "blood_group",
            "allergies",
            "chronic_conditions",
            "history",
        )

    def validate_date_of_birth(self, value):
        if value >= date.today():
            raise serializers.ValidationError("Date of birth must be in the past.")
        return value

    def validate(self, attrs):
        text_fields = (
            "first_name",
            "last_name",
            "national_id",
            "phone_number",
            "email",
            "address",
            "emergency_contact",
            "allergies",
            "chronic_conditions",
        )
        for field in text_fields:
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs

    def create(self, validated_data):
        history_data = validated_data.pop("history", None)
        patient = Patient.objects.create(**validated_data)
        PatientHistory.objects.create(patient=patient, **(history_data or {}))
        return patient

    def update(self, instance, validated_data):
        history_data = validated_data.pop("history", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if history_data is not None:
            history, _ = PatientHistory.objects.get_or_create(patient=instance)
            for attr, value in history_data.items():
                setattr(history, attr, value)
            history.save()
        return instance
