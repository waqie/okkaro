"""Route each request to the correct business (tenant) using the JWT token.

Runs AFTER django_tenants' TenantMainMiddleware (which sets the tenant from the
host). If the request carries a Bearer token with a valid `tenant` claim, we
switch the DB connection to that business's schema. Requests without a token
(login, signup, admin, public store) keep the host-based tenant.
"""
import logging
from django.db import connection
from django_tenants.utils import get_tenant_model

log = logging.getLogger(__name__)


class JWTTenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                schema = AccessToken(auth.split(' ', 1)[1]).get('tenant')
                if schema:
                    TenantModel = get_tenant_model()
                    tenant = TenantModel.objects.filter(schema_name=schema).first()
                    if tenant:
                        connection.set_tenant(tenant)
                        request.tenant = tenant
            except Exception as e:  # invalid/expired token → leave host tenant
                log.debug("JWT tenant resolve skipped: %s", e)
        return self.get_response(request)
