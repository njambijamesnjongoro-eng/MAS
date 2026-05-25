from django_filters import rest_framework as filters

from .models import Diagnosis, LabRequest, Prescription, Visit, VitalSigns


class VisitFilter(filters.FilterSet):
    visit_date_from = filters.DateFilter(field_name="visit_date", lookup_expr="date__gte")
    visit_date_to = filters.DateFilter(field_name="visit_date", lookup_expr="date__lte")
    follow_up_from = filters.DateFilter(field_name="follow_up_date", lookup_expr="gte")
    follow_up_to = filters.DateFilter(field_name="follow_up_date", lookup_expr="lte")

    class Meta:
        model = Visit
        fields = {
            "patient": ["exact"],
            "doctor": ["exact"],
            "status": ["exact"],
        }


class VitalSignsFilter(filters.FilterSet):
    updated_from = filters.DateFilter(field_name="updated_at", lookup_expr="date__gte")
    updated_to = filters.DateFilter(field_name="updated_at", lookup_expr="date__lte")

    class Meta:
        model = VitalSigns
        fields = {
            "patient": ["exact"],
            "visit": ["exact"],
        }


class DiagnosisFilter(filters.FilterSet):
    created_from = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Diagnosis
        fields = {
            "patient": ["exact"],
            "visit": ["exact"],
            "severity": ["exact"],
            "icd_code": ["exact", "icontains"],
        }


class PrescriptionFilter(filters.FilterSet):
    created_from = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Prescription
        fields = {
            "patient": ["exact"],
            "visit": ["exact"],
            "status": ["exact"],
            "route": ["exact", "icontains"],
        }


class LabRequestFilter(filters.FilterSet):
    created_from = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = LabRequest
        fields = {
            "patient": ["exact"],
            "visit": ["exact"],
            "priority": ["exact"],
            "status": ["exact"],
        }
