from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from .models import Party, Invoice, InvoiceItem, Payment, Quotation, QuotationItem
from .serializers import (PartySerializer, InvoiceSerializer, PaymentSerializer,
                          QuotationSerializer)

class PartyViewSet(viewsets.ModelViewSet):
    serializer_class = PartySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'email', 'city']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        qs = Party.objects.filter(is_active=True)
        party_type = self.request.query_params.get('type')
        if party_type:
            qs = qs.filter(Q(party_type=party_type) | Q(party_type='both'))
        return qs

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'party__name']
    ordering_fields = ['date', 'grand_total', 'created_at']

    def get_queryset(self):
        qs = Invoice.objects.select_related('party').prefetch_related('items')
        inv_type = self.request.query_params.get('type')
        status = self.request.query_params.get('status')
        if inv_type:
            qs = qs.filter(invoice_type=inv_type)
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        stats = {
            'total_sales_month': Invoice.objects.filter(
                invoice_type='sale', date__gte=month_start
            ).aggregate(total=Sum('grand_total'))['total'] or 0,
            'total_purchases_month': Invoice.objects.filter(
                invoice_type='purchase', date__gte=month_start
            ).aggregate(total=Sum('grand_total'))['total'] or 0,
            'unpaid_invoices': Invoice.objects.filter(
                invoice_type='sale', status__in=['unpaid', 'partial']
            ).aggregate(total=Sum('balance_due'))['total'] or 0,
            'total_invoices_today': Invoice.objects.filter(date=today).count(),
            'recent_invoices': InvoiceSerializer(
                Invoice.objects.filter(invoice_type='sale').order_by('-created_at')[:5],
                many=True
            ).data,
        }
        return Response(stats)

    @action(detail=False, methods=['get'])
    def day_report(self, request):
        """Complete day report: sales, purchases, payments, expenses for a date."""
        from accounting.models import Expense
        d = request.query_params.get('date') or timezone.now().date().isoformat()
        sales = Invoice.objects.filter(invoice_type='sale', date=d)
        purch = Invoice.objects.filter(invoice_type='purchase', date=d)
        pays = Payment.objects.filter(date=d)
        exps = Expense.objects.filter(date=d)
        s = lambda qs, f: float(qs.aggregate(x=Sum(f))['x'] or 0)
        return Response({
            'date': d,
            'sales_total': s(sales, 'grand_total'), 'sales_count': sales.count(),
            'purchase_total': s(purch, 'grand_total'), 'purchase_count': purch.count(),
            'payments_total': s(pays, 'amount'), 'payments_count': pays.count(),
            'expense_total': s(exps, 'amount'), 'expense_count': exps.count(),
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Business insights: monthly sales, top products/customers, payment mix."""
        today = timezone.now().date()
        # last 6 months sales vs purchases
        six_ago = (today.replace(day=1) - timedelta(days=155)).replace(day=1)
        by_month = {}
        rows = (Invoice.objects.filter(date__gte=six_ago)
                .annotate(m=TruncMonth('date'))
                .values('m', 'invoice_type')
                .annotate(total=Sum('grand_total')))
        for r in rows:
            key = r['m'].strftime('%b %Y') if r['m'] else '—'
            d = by_month.setdefault(key, {'month': key, 'sales': 0, 'purchases': 0})
            if r['invoice_type'] == 'sale':
                d['sales'] = float(r['total'] or 0)
            else:
                d['purchases'] = float(r['total'] or 0)
        monthly = list(by_month.values())

        top_products = list(
            InvoiceItem.objects.filter(invoice__invoice_type='sale')
            .values('product_name')
            .annotate(qty=Sum('quantity'), amount=Sum('total'))
            .order_by('-amount')[:5])

        top_customers = list(
            Invoice.objects.filter(invoice_type='sale')
            .values('party__name')
            .annotate(amount=Sum('grand_total'))
            .order_by('-amount')[:5])

        pay_methods = list(
            Payment.objects.values('method').annotate(amount=Sum('amount')).order_by('-amount'))

        return Response({
            'monthly': monthly,
            'top_products': top_products,
            'top_customers': top_customers,
            'payment_methods': pay_methods,
        })

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    
    def get_queryset(self):
        return Payment.objects.select_related('party', 'invoice').order_by('-date')

    def perform_create(self, serializer):
        payment = serializer.save(created_by=self.request.user)
        if payment.invoice:
            invoice = payment.invoice
            invoice.paid_amount += payment.amount
            invoice.calculate_totals()
            invoice.save()


class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['number', 'party__name']

    def get_queryset(self):
        return Quotation.objects.select_related('party').prefetch_related('items')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Convert this quotation into a sale invoice."""
        q = self.get_object()
        if q.converted_invoice:
            return Response({'error': 'already converted', 'invoice_id': q.converted_invoice_id}, status=400)
        last = Invoice.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        invoice = Invoice.objects.create(
            invoice_number=f"SI-{num:05d}", invoice_type='sale', party=q.party,
            date=timezone.now().date(), discount_percent=q.discount_percent,
            tax_percent=q.tax_percent, notes=f"From quotation {q.number}",
            created_by=request.user,
        )
        for it in q.items.all():
            InvoiceItem.objects.create(invoice=invoice, product_name=it.product_name,
                                       quantity=it.quantity, unit=it.unit, unit_price=it.unit_price)
        invoice.calculate_totals()
        invoice.save()
        q.status = 'converted'
        q.converted_invoice = invoice
        q.save()
        return Response(InvoiceSerializer(invoice).data)
