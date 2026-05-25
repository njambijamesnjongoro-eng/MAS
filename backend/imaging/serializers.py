from __future__ import annotations

from django.urls import reverse
from rest_framework import serializers

from common.utils.security import normalize_text

from .models import ImagingRequest, ImagingResult


class ImagingResultSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = ImagingResult
        fields = (
            "id",
            "imaging_request",
            "uploaded_by",
            "uploaded_by_name",
            "radiologist_report",
            "remarks",
            "attachment",
            "attachment_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("uploaded_by", "uploaded_by_name", "attachment_url", "created_at", "updated_at", "imaging_request")

    def get_attachment_url(self, obj):
        request = self.context.get("request")
        if not obj.attachment or not request:
            return None
        return request.build_absolute_uri(reverse("imaging_result_download", args=[obj.imaging_request_id]))

    def validate(self, attrs):
        for field in ("radiologist_report", "remarks"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        return attrs


class ImagingRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    requested_by_name = serializers.CharField(source="requested_by.username", read_only=True)
    result = ImagingResultSerializer(read_only=True)

    class Meta:
        model = ImagingRequest
        fields = (
            "id",
            "patient",
            "patient_name",
            "visit",
            "requested_by",
            "requested_by_name",
            "imaging_type",
            "clinical_notes",
            "status",
            "result",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("requested_by", "requested_by_name", "result", "created_at", "updated_at")

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def validate(self, attrs):
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)
        visit = attrs.get("visit") if "visit" in attrs else getattr(self.instance, "visit", None)
        if "clinical_notes" in attrs:
            attrs["clinical_notes"] = normalize_text(attrs["clinical_notes"])
        if patient and visit and visit.patient_id != patient.id:
            raise serializers.ValidationError({"visit": "Selected visit does not belong to the selected patient."})
        return attrs
