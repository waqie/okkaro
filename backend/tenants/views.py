from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from .models import Tenant

FIELDS = ['business_name', 'name', 'phone', 'email', 'address', 'city', 'country', 'currency', 'plan', 'status']
# plan & status are read-only here — only the OKKARO admin changes them (via Django admin)
EDITABLE = ['business_name', 'name', 'phone', 'email', 'address', 'city', 'country', 'currency']


class BusinessProfileView(APIView):
    """Read / update the current business (tenant) profile."""

    def _tenant(self):
        return getattr(connection, 'tenant', None)

    def get(self, request):
        t = self._tenant()
        return Response({f: getattr(t, f, '') for f in FIELDS})

    def patch(self, request):
        t = self._tenant()
        if t is None:
            return Response({'error': 'no tenant'}, status=400)
        for f in EDITABLE:
            if f in request.data:
                setattr(t, f, request.data[f])
        t.save()
        return Response({f: getattr(t, f, '') for f in FIELDS})


def _is_owner(request):
    return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class OwnerBusinessesView(APIView):
    """OKKARO super-admin: list all businesses (tenants) and change plan/status."""
    def get(self, request):
        if not _is_owner(request):
            return Response({'error': 'forbidden'}, status=403)
        rows = []
        for t in Tenant.objects.exclude(schema_name='public').order_by('-created_on'):
            rows.append({
                'id': t.id, 'schema': t.schema_name, 'business_name': t.business_name,
                'name': t.name, 'email': t.email, 'phone': t.phone,
                'city': t.city, 'plan': t.plan, 'status': t.status,
                'created_on': t.created_on,
            })
        return Response(rows)

    def post(self, request):
        """Create a new business (tenant) + its owner login."""
        if not _is_owner(request):
            return Response({'error': 'forbidden'}, status=403)
        import re, traceback
        from django.contrib.auth import get_user_model
        from django_tenants.utils import schema_context
        from accounting.services import seed_default_accounts

        d = request.data
        business_name = (d.get('business_name') or '').strip()
        username = (d.get('username') or '').strip()
        password = d.get('password') or ''
        if not business_name or not username or len(password) < 6:
            return Response({'error': 'business_name, username, and password (6+) required'}, status=400)

        # tenant creation must run from the PUBLIC schema (JWT middleware may have
        # set us to another business's schema).
        connection.set_schema_to_public()

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return Response({'error': 'username already taken'}, status=400)

        # build a safe, unique schema name
        base = re.sub(r'[^a-z0-9]', '', business_name.lower())[:40]
        if not base or not base[0].isalpha():
            base = 'biz' + base
        schema = base
        i = 1
        while Tenant.objects.filter(schema_name=schema).exists():
            schema = f"{base}{i}"; i += 1

        email = d.get('email') or f"{schema}@okkaro.app"
        if Tenant.objects.filter(email=email).exists():
            email = f"{schema}@okkaro.app"

        try:
            tenant = Tenant(
                schema_name=schema, business_name=business_name,
                name=d.get('owner_name') or business_name, email=email,
                phone=d.get('phone', ''), city=d.get('city', ''),
                plan=d.get('plan', 'trial'), status='trial',
            )
            tenant.save()  # auto_create_schema → creates schema + runs tenant migrations

            with schema_context(schema):
                seed_default_accounts()

            User.objects.create_user(
                username=username, password=password, role='owner',
                tenant_schema=schema, first_name=d.get('owner_name', ''),
                phone=d.get('phone', ''), email=email,
            )
        except Exception as e:
            traceback.print_exc()
            return Response({'error': f'{type(e).__name__}: {e}'}, status=400)

        return Response({'id': tenant.id, 'schema': schema, 'business_name': business_name,
                         'username': username, 'plan': tenant.plan}, status=201)

    def patch(self, request, pk):
        if not _is_owner(request):
            return Response({'error': 'forbidden'}, status=403)
        t = Tenant.objects.filter(id=pk).first()
        if not t:
            return Response({'error': 'not found'}, status=404)
        for f in ['plan', 'status']:
            if f in request.data:
                setattr(t, f, request.data[f])
        t.save()
        # optional: reset the business owner's login password
        new_pw = request.data.get('password')
        if new_pw and len(new_pw) >= 6:
            from django.contrib.auth import get_user_model
            U = get_user_model()
            for u in U.objects.filter(tenant_schema=t.schema_name):
                u.set_password(new_pw)
                u.save()
        return Response({'id': t.id, 'plan': t.plan, 'status': t.status})

    def delete(self, request, pk):
        if not _is_owner(request):
            return Response({'error': 'forbidden'}, status=403)
        t = Tenant.objects.filter(id=pk).first()
        if not t:
            return Response({'error': 'not found'}, status=404)
        if t.schema_name in ('public', 'demo'):
            return Response({'error': 'cannot delete this business'}, status=400)
        schema = t.schema_name
        from django.contrib.auth import get_user_model
        U = get_user_model()
        U.objects.filter(tenant_schema=schema).delete()
        connection.set_schema_to_public()
        with connection.cursor() as c:
            c.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
        t.delete()
        return Response({'deleted': True})
