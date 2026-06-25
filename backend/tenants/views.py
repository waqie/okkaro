from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from django.utils import timezone
from .models import Tenant

TRIAL_DAYS = 7

FIELDS = ['business_name', 'name', 'phone', 'email', 'address', 'city', 'country', 'currency', 'plan', 'status', 'logo_base64', 'billing_cycle']
# plan & status are read-only here — only the OKKARO admin changes them (via Django admin)
EDITABLE = ['business_name', 'name', 'phone', 'email', 'address', 'city', 'country', 'currency', 'logo_base64']


def _trial_info(t):
    """Days left / expired for a trial business."""
    out = {'trial_ends_at': None, 'trial_days_left': None, 'trial_expired': False}
    if not t:
        return out
    ends = getattr(t, 'trial_ends_at', None)
    out['trial_ends_at'] = ends
    if getattr(t, 'status', '') == 'trial' and ends:
        now = timezone.now()
        secs = (ends - now).total_seconds()
        out['trial_days_left'] = max(0, int((secs + 86399) // 86400))  # round up
        out['trial_expired'] = secs <= 0
    return out


class BusinessProfileView(APIView):
    """Read / update the current business (tenant) profile."""

    def _tenant(self):
        return getattr(connection, 'tenant', None)

    def get(self, request):
        t = self._tenant()
        data = {f: getattr(t, f, '') for f in FIELDS}
        data.update(_trial_info(t))
        # branch / franchise info
        is_branch = bool(getattr(t, 'parent_id', None)) if t else False
        head = (t.parent if (t and t.parent_id) else t)
        plan = getattr(head, 'plan', '') if head else ''
        data['is_branch'] = is_branch
        data['branch_label'] = getattr(t, 'branch_label', '') if t else ''
        data['can_add_branches'] = bool(plan == 'pro') or bool(request.user and request.user.is_superuser)
        try:
            data['branch_count'] = head.branches.count() if head else 0
        except Exception:
            data['branch_count'] = 0
        return Response(data)

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
        from django.contrib.auth import get_user_model
        U = get_user_model()
        rows = []
        for t in Tenant.objects.exclude(schema_name='public').order_by('-created_on'):
            owner = U.objects.filter(tenant_schema=t.schema_name).order_by('id').first()
            ti = _trial_info(t)
            rows.append({
                'id': t.id, 'schema': t.schema_name, 'business_name': t.business_name,
                'name': t.name, 'email': t.email, 'phone': t.phone,
                'city': t.city, 'plan': t.plan, 'status': t.status,
                'billing_cycle': getattr(t, 'billing_cycle', 'monthly'),
                'is_branch': bool(getattr(t, 'parent_id', None)),
                'parent_schema': t.parent.schema_name if getattr(t, 'parent_id', None) else None,
                'created_on': t.created_on,
                'trial_ends_at': ti['trial_ends_at'], 'trial_days_left': ti['trial_days_left'],
                'trial_expired': ti['trial_expired'],
                'username': owner.username if owner else '',
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
                trial_ends_at=timezone.now() + timedelta(days=TRIAL_DAYS),
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
        for f in ['plan', 'status', 'billing_cycle']:
            if f in request.data:
                setattr(t, f, request.data[f])
        # changing to a paid plan activates the account (lifts the trial block);
        # back to 'trial' re-enables trial status.
        if 'plan' in request.data and 'status' not in request.data:
            t.status = 'trial' if request.data['plan'] == 'trial' else 'active'
        t.save()
        # keep a head office's branches on the same plan/status/billing
        try:
            if any(k in request.data for k in ('plan', 'status', 'billing_cycle')) and not getattr(t, 'parent_id', None):
                for br in t.branches.all():
                    br.plan, br.status, br.billing_cycle = t.plan, t.status, t.billing_cycle
                    br.save()
        except Exception:
            pass
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
