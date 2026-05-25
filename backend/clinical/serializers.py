from __future__ import annotations

import re

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from common.utils.security import normalize_text

from .models import Diagnosis, LabRequest, LabResult, Prescription, Visit, VitalSigns


class VitalSignsSerializer(serializers.ModelSerializer):
    blood_pressure = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = VitalSigns
        fields = (
            "id",
            "visit",
            "patient",
            "temperature",
            "blood_pressure",
            "pulse_rate",
            "respiratory_rate",
            "oxygen_saturation",
            "weight",
            "height",
            "bmi",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("bmi", "created_at", "updated_at", "patient")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.systolic_bp and instance.diastolic_bp:
            data["blood_pressure"] = f"{instance.systolic_bp}/{instance.diastolic_bp}"
        else:
            data["blood_pressure"] = ""
        return data

    def validate_blood_pressure(self, value: str):
        if not value:
            return value
        match = re.match(r"^\s*(\d{2,3})\s*/\s*(\d{2,3})\s*$", value)
        if not match:
            raise serializers.ValidationError("Blood pressure must use systolic/diastolic format, e.g. 120/80.")
        systolic, diastolic = int(match.group(1)), int(match.group(2))
        if systolic <= diastolic:
            raise serializers.ValidationError("Systolic pressure must be higher than diastolic pressure.")
        return value

    def validate(self, attrs):
        bp = attrs.pop("blood_pressure", None)
        if bp:
            match = re.match(r"^\s*(\d{2,3})\s*/\s*(\d{2,3})\s*$", bp)
            attrs["systolic_bp"] = int(match.group(1))
            attrs["diastolic_bp"] = int(match.group(2))
        return attrs


class NestedVitalSignsSerializer(VitalSignsSerializer):
    class Meta(VitalSignsSerializer.Meta):
        fields = (
            "temperature",
            "blood_pressure",
            "pulse_rate",
            "respiratory_rate",
            "oxygen_saturation",
            "weight",
            "height",
            "bmi",
        )
        read_only_fields = ("bmi",)


class DiagnosisSerializer(serializers.ModelSerializer):
    diagnosed_by_name = serializers.CharField(source="diagnosed_by.username", read_only=True)

    class Meta:
        model = Diagnosis
        fields = (
            "id",
            "visit",
            "patient",
            "diagnosed_by",
            "diagnosed_by_name",
            "primary_diagnosis",
            "secondary_diagnosis",
            "icd_code",
            "severity",
            "clinical_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "patient", "diagnosed_by")

    def validate(self, attrs):
        for field in ("primary_diagnosis", "secondary_diagnosis", "icd_code", "clinical_notes"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs


class NestedDiagnosisSerializer(DiagnosisSerializer):
    class Meta(DiagnosisSerializer.Meta):
        fields = (
            "primary_diagnosis",
            "secondary_diagnosis",
            "icd_code",
            "severity",
            "clinical_notes",
        )


class PrescriptionSerializer(serializers.ModelSerializer):
    prescribed_by_name = serializers.CharField(source="prescribed_by.username", read_only=True)
    dispensed_by_name = serializers.CharField(source="dispensed_by.username", read_only=True)

    class Meta:
        model = Prescription
        fields = (
            "id",
            "visit",
            "patient",
            "prescribed_by",
            "prescribed_by_name",
            "medication_name",
            "dosage",
            "frequency",
            "duration",
            "route",
            "instructions",
            "status",
            "dispensed_by",
            "dispensed_by_name",
            "dispensed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "created_at",
            "updated_at",
            "patient",
            "prescribed_by",
            "dispensed_by",
            "dispensed_at",
        )

    def validate(self, attrs):
        for field in ("medication_name", "dosage", "frequency", "duration", "route", "instructions"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs


class LabResultSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = LabResult
        fields = (
            "id",
            "lab_request",
            "uploaded_by",
            "uploaded_by_name",
            "result_text",
            "remarks",
            "attachment",
            "attachment_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "uploaded_by", "attachment_url", "lab_request")

    def get_attachment_url(self, obj):
        request = self.context.get("request")
        if not obj.attachment:
            return None
        if request:
            return request.build_absolute_uri(obj.attachment.url)
        return obj.attachment.url

    def validate(self, attrs):
        for field in ("result_text", "remarks"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs


class LabRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.username", read_only=True)
    result = LabResultSerializer(read_only=True)

    class Meta:
        model = LabRequest
        fields = (
            "id",
            "visit",
            "patient",
            "requested_by",
            "requested_by_name",
            "test_name",
            "priority",
            "clinical_notes",
            "status",
            "result",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "patient", "requested_by", "result")

    def validate(self, attrs):
        for field in ("test_name", "clinical_notes"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs


class NestedPrescriptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Prescription
        fields = ("id", "medication_name", "dosage", "frequency", "duration", "route", "instructions", "status")

    def validate(self, attrs):
        for field in ("medication_name", "dosage", "frequency", "duration", "route", "instructions"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs


class NestedLabRequestSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    result = LabResultSerializer(read_only=True)

    class Meta:
        model = LabRequest
        fields = ("id", "test_name", "priority", "clinical_notes", "status", "result")

    def validate(self, attrs):
        for field in ("test_name", "clinical_notes"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs


class VisitListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Visit
        fields = (
            "id",
            "visit_id",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "visit_date",
            "chief_complaint",
            "diagnosis_summary",
            "status",
            "follow_up_date",
            "created_at",
        )

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() or obj.doctor.username


class VisitDetailSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    vitals = VitalSignsSerializer(read_only=True)
    diagnosis = DiagnosisSerializer(read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    lab_requests = LabRequestSerializer(many=True, read_only=True)

    class Meta:
        model = Visit
        fields = (
            "id",
            "visit_id",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "visit_date",
            "chief_complaint",
            "symptoms",
            "diagnosis_summary",
            "treatment_plan",
            "follow_up_date",
            "status",
            "vitals",
            "diagnosis",
            "prescriptions",
            "lab_requests",
            "created_at",
            "updated_at",
        )

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() or obj.doctor.username


class VisitWriteSerializer(serializers.ModelSerializer):
    vitals = NestedVitalSignsSerializer(required=False)
    diagnosis = NestedDiagnosisSerializer(required=False)
    prescriptions = NestedPrescriptionSerializer(many=True, required=False)
    lab_requests = NestedLabRequestSerializer(many=True, required=False)

    class Meta:
        model = Visit
        fields = (
            "patient",
            "doctor",
            "visit_date",
            "chief_complaint",
            "symptoms",
            "diagnosis_summary",
            "treatment_plan",
            "follow_up_date",
            "status",
            "vitals",
            "diagnosis",
            "prescriptions",
            "lab_requests",
        )

    def validate(self, attrs):
        for field in ("chief_complaint", "symptoms", "diagnosis_summary", "treatment_plan"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        follow_up_date = attrs.get("follow_up_date")
        visit_date = attrs.get("visit_date") or getattr(self.instance, "visit_date", None)
        if follow_up_date and visit_date and follow_up_date < visit_date.date():
            raise serializers.ValidationError({"follow_up_date": "Follow-up date cannot be earlier than the visit date."})
        return attrs

    def _sync_prescriptions(self, visit: Visit, prescriptions_data, user):
        existing = {item.id: item for item in visit.prescriptions.all()}
        retained_ids = set()
        for payload in prescriptions_data:
            payload = dict(payload)
            item_id = payload.pop("id", None)
            if item_id and item_id in existing:
                retained_ids.add(item_id)
                item = existing[item_id]
                for attr, value in payload.items():
                    setattr(item, attr, value)
                item.save()
            else:
                created = Prescription.objects.create(
                    visit=visit,
                    patient=visit.patient,
                    prescribed_by=user,
                    **payload,
                )
                retained_ids.add(created.id)

        visit.prescriptions.exclude(id__in=retained_ids).delete()

    def _sync_lab_requests(self, visit: Visit, lab_requests_data, user):
        existing = {item.id: item for item in visit.lab_requests.all()}
        retained_ids = set()
        for payload in lab_requests_data:
            payload = dict(payload)
            item_id = payload.pop("id", None)
            if item_id and item_id in existing:
                retained_ids.add(item_id)
                item = existing[item_id]
                for attr, value in payload.items():
                    setattr(item, attr, value)
                item.save()
            else:
                created = LabRequest.objects.create(
                    visit=visit,
                    patient=visit.patient,
                    requested_by=user,
                    **payload,
                )
                retained_ids.add(created.id)

        visit.lab_requests.exclude(id__in=retained_ids).delete()

    @transaction.atomic
    def create(self, validated_data):
        vitals_data = validated_data.pop("vitals", None)
        diagnosis_data = validated_data.pop("diagnosis", None)
        prescriptions_data = validated_data.pop("prescriptions", [])
        lab_requests_data = validated_data.pop("lab_requests", [])
        request = self.context["request"]
        user = request.user
        validated_data["doctor"] = validated_data.get("doctor") or user
        visit = Visit.objects.create(created_by=user, updated_by=user, **validated_data)

        if vitals_data:
            VitalSigns.objects.update_or_create(
                visit=visit,
                defaults={**vitals_data, "patient": visit.patient, "recorded_by": user},
            )

        if diagnosis_data:
            Diagnosis.objects.update_or_create(
                visit=visit,
                defaults={**diagnosis_data, "patient": visit.patient, "diagnosed_by": user},
            )

        self._sync_prescriptions(visit, prescriptions_data, user)
        self._sync_lab_requests(visit, lab_requests_data, user)
        return visit

    @transaction.atomic
    def update(self, instance, validated_data):
        vitals_data = validated_data.pop("vitals", None)
        diagnosis_data = validated_data.pop("diagnosis", None)
        prescriptions_data = validated_data.pop("prescriptions", None)
        lab_requests_data = validated_data.pop("lab_requests", None)
        user = self.context["request"].user

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = user
        instance.save()

        if vitals_data is not None:
            VitalSigns.objects.update_or_create(
                visit=instance,
                defaults={**vitals_data, "patient": instance.patient, "recorded_by": user},
            )

        if diagnosis_data is not None:
            Diagnosis.objects.update_or_create(
                visit=instance,
                defaults={**diagnosis_data, "patient": instance.patient, "diagnosed_by": instance.doctor},
            )

        if prescriptions_data is not None:
            self._sync_prescriptions(instance, prescriptions_data, user)
        if lab_requests_data is not None:
            self._sync_lab_requests(instance, lab_requests_data, user)
        return instance


class TimelineEntrySerializer(serializers.Serializer):
    type = serializers.CharField()
    occurred_at = serializers.DateTimeField()
    title = serializers.CharField()
    summary = serializers.CharField()
    patient_id = serializers.IntegerField()
    visit_id = serializers.IntegerField(allow_null=True)
    status = serializers.CharField(allow_blank=True)
    metadata = serializers.DictField()


class DashboardVisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Visit
        fields = ("id", "visit_id", "patient", "patient_name", "visit_date", "chief_complaint", "status")

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"


class DashboardLabRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = LabRequest
        fields = ("id", "test_name", "priority", "status", "patient", "patient_name", "created_at", "visit")

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
