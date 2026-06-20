# One-time PRODUCTION setup: public tenant + business + admin + chart of accounts.
# Reads env: APP_DOMAIN (your backend domain, e.g. okkaro-api.up.railway.app),
#            ADMIN_PASSWORD (login password for 'admin').
import os
from django_tenants.utils import schema_context
from tenants.models import Tenant, Domain
from django.contrib.auth import get_user_model
from accounting.services import seed_default_accounts

User = get_user_model()

Tenant.objects.get_or_create(schema_name='public', defaults=dict(
    name='Public', business_name='Public', email='public@okkaro.app'))

biz, _ = Tenant.objects.get_or_create(schema_name='demo', defaults=dict(
    name='My Business', business_name='My Business', email='owner@okkaro.app',
    plan='pro', status='active'))

host = os.environ.get('APP_DOMAIN', '').strip()
if host:
    Domain.objects.get_or_create(domain=host, defaults=dict(tenant=biz, is_primary=True))
    print('>>> Domain mapped:', host)
else:
    print('>>> WARNING: APP_DOMAIN not set — set it and re-run, else API returns 404')

admin = User.objects.filter(username='admin').first()
if not admin:
    admin = User.objects.create_superuser('admin', 'admin@okkaro.app',
                                          os.environ.get('ADMIN_PASSWORD', 'admin12345'), role='owner')
    print('>>> Admin created: admin /', os.environ.get('ADMIN_PASSWORD', 'admin12345'))
# tie the admin to the demo business
admin.tenant_schema = 'demo'
admin.save()

with schema_context('demo'):
    seed_default_accounts()
print('>>> Production setup done.')
