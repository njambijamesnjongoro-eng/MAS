from django_filters import rest_framework as filters

from .models import Patient


class PatientFilter(filters.FilterSet):
    created_from = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Patient
        fields = {
            "gender": ["exact"],
            "blood_group": ["exact"],
        }
