from django.db import models
from django_tenants.models import TenantMixin, DomainMixin

class Tenant(TenantMixin):
    PLAN_CHOICES = [
        ('trial', 'Trial'),
        ('basic', 'Basic'),
        ('standard', 'Standard'),
        ('pro', 'Pro'),
        ('ecommerce', 'E-commerce'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('trial', 'Trial'),
        ('suspended', 'Suspended'),
    ]
    BILLING_CHOICES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=200)
    business_name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='trial')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    logo = models.ImageField(upload_to='tenant_logos/', null=True, blank=True)
    logo_base64 = models.TextField(blank=True, default='')  # business's own logo (data URL) — shown on invoices & in-app
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Pakistan')
    currency = models.CharField(max_length=10, default='PKR')
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CHOICES, default='monthly')
    paid_until = models.DateTimeField(null=True, blank=True)
    # Multi-branch (franchise): a branch points to its head office via `parent`.
    # Head office has parent=None; branches share the head office's subscription & login.
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='branches')
    branch_label = models.CharField(max_length=120, blank=True)  # e.g. "Lahore Branch"
    created_on = models.DateField(auto_now_add=True)
    auto_create_schema = True

    @property
    def is_branch(self):
        return self.parent_id is not None

    def __str__(self):
        return self.business_name

class Domain(DomainMixin):
    pass
