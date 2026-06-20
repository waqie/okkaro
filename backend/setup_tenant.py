# One-time setup: public tenant + demo business on localhost + admin user
from tenants.models import Tenant, Domain
from django.contrib.auth import get_user_model

User = get_user_model()

# 1. Public tenant (django-tenants ke liye zaroori)
Tenant.objects.get_or_create(
    schema_name='public',
    defaults=dict(name='Public', business_name='Public', email='public@example.com'),
)

# 2. Demo business tenant
demo, _ = Tenant.objects.get_or_create(
    schema_name='demo',
    defaults=dict(
        name='Demo', business_name='Demo Business',
        email='demo@example.com', plan='pro', status='active',
    ),
)

# 3. localhost -> demo tenant
Domain.objects.get_or_create(
    domain='localhost',
    defaults=dict(tenant=demo, is_primary=True),
)

# 4. Admin user (login ke liye)
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin', email='admin@example.com',
        password='admin12345', role='owner',
    )
    print('>>> Admin user ban gaya  ->  username: admin   password: admin12345')
else:
    print('>>> Admin user pehle se mojood hai (username: admin)')

print('>>> Setup mukammal!')
