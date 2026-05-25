from django_filters import rest_framework as filters

from .models import Admission, Bed, Ward


class WardFilter(filters.FilterSet):
    class Meta:
        model = Ward
        fields = {
            "ward_type": ["exact"],
        }


class BedFilter(filters.FilterSet):
    class Meta:
        model = Bed
        fields = {
            "ward": ["exact"],
            "occupancy_status": ["exact"],
        }


class AdmissionFilter(filters.FilterSet):
    admission_date_from = filters.DateFilter(field_name="admission_date", lookup_expr="date__gte")
    admission_date_to = filters.DateFilter(field_name="admission_date", lookup_expr="date__lte")

    class Meta:
        model = Admission
        fields = {
            "patient": ["exact"],
            "ward": ["exact"],
            "bed": ["exact"],
            "status": ["exact"],
        }
