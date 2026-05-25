from django_filters import rest_framework as filters

from .models import ImagingRequest


class ImagingRequestFilter(filters.FilterSet):
    created_from = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = ImagingRequest
        fields = {
            "patient": ["exact"],
            "imaging_type": ["exact"],
            "status": ["exact"],
        }
