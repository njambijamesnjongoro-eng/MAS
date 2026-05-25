from django_filters import rest_framework as filters

from .models import Invoice, Payment


class InvoiceFilter(filters.FilterSet):
    created_from = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Invoice
        fields = {
            "patient": ["exact"],
            "status": ["exact"],
        }


class PaymentFilter(filters.FilterSet):
    payment_date_from = filters.DateFilter(field_name="payment_date", lookup_expr="date__gte")
    payment_date_to = filters.DateFilter(field_name="payment_date", lookup_expr="date__lte")

    class Meta:
        model = Payment
        fields = {
            "invoice": ["exact"],
            "payment_method": ["exact"],
        }
