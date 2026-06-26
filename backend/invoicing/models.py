from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Party(models.Model):
    PARTY_TYPE = [('customer', 'Customer'), ('vendor', 'Vendor'), ('both', 'Both')]
    
    name = models.CharField(max_length=200)
    party_type = models.CharField(max_length=20, choices=PARTY_TYPE, default='customer')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_type = models.CharField(max_length=10, choices=[('dr','Debit'),('cr','Credit')], default='dr')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def current_balance(self):
        from django.db.models import Sum
        invoices = self.invoices.filter(status__in=['paid','partial','unpaid']).aggregate(
            total=Sum('grand_total'))['total'] or 0
        payments = self.payments.aggregate(total=Sum('amount'))['total'] or 0
        return invoices - payments

class Invoice(models.Model):
    STATUS = [
        ('draft', 'Draft'),
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    TYPE = [('sale', 'Sale Invoice'), ('purchase', 'Purchase Invoice')]

    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_type = models.CharField(max_length=20, choices=TYPE, default='sale')
    party = models.ForeignKey(Party, on_delete=models.PROTECT, related_name='invoices')
    date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='unpaid')
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.party.name}"

    def calculate_totals(self):
        items = self.items.all()
        self.subtotal = sum(item.total for item in items)
        self.discount_amount = (self.subtotal * self.discount_percent / 100)
        taxable = self.subtotal - self.discount_amount
        self.tax_amount = (taxable * self.tax_percent / 100)
        self.grand_total = taxable + self.tax_amount
        self.balance_due = self.grand_total - self.paid_amount
        if self.balance_due <= 0:
            self.status = 'paid'
        elif self.paid_amount > 0:
            self.status = 'partial'

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('inventory.Product', null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='invoice_items')
    product_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='pcs')
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=15, decimal_places=2)

    def save(self, *args, **kwargs):
        discount = self.unit_price * self.quantity * self.discount_percent / 100
        self.total = (self.unit_price * self.quantity) - discount
        super().save(*args, **kwargs)

class Payment(models.Model):
    METHOD = [
        ('cash', 'Cash'), ('bank', 'Bank Transfer'),
        ('cheque', 'Cheque'), ('jazzcash', 'JazzCash'),
        ('easypaisa', 'Easypaisa'),
    ]
    party = models.ForeignKey(Party, on_delete=models.PROTECT, related_name='payments')
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD, default='cash')
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']


class Quotation(models.Model):
    STATUS = [
        ('open', 'Open'), ('accepted', 'Accepted'),
        ('rejected', 'Rejected'), ('converted', 'Converted'),
    ]
    number = models.CharField(max_length=50, unique=True)
    party = models.ForeignKey(Party, on_delete=models.PROTECT, related_name='quotations')
    date = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='open')
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    converted_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='from_quotation')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def calculate_totals(self):
        items = self.items.all()
        self.subtotal = sum(i.total for i in items)
        self.discount_amount = (self.subtotal * self.discount_percent / 100)
        taxable = self.subtotal - self.discount_amount
        self.tax_amount = (taxable * self.tax_percent / 100)
        self.grand_total = taxable + self.tax_amount


class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('inventory.Product', null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='quotation_items')
    product_name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='pcs')
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    total = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total = self.unit_price * self.quantity
        super().save(*args, **kwargs)
