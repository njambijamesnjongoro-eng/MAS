from django.contrib import admin

from .models import Invoice, Payment


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "patient", "total_amount", "amount_paid", "balance_due", "status")
    search_fields = ("invoice_number", "patient__health_id", "patient__first_name", "patient__last_name")
    list_filter = ("status", "created_at")
    inlines = [PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount_paid", "payment_method", "payment_date")
    search_fields = ("invoice__invoice_number", "transaction_reference")
    list_filter = ("payment_method", "payment_date")
