"""Multi-branch (franchise) support.

A franchise owner has ONE login. Their "head office" is a Tenant with
parent=None. Each branch is another Tenant (its own schema) with
parent=head_office. The SAME user switches the active branch (the JWT `tenant`
claim) — auth/users live in the public schema so one login can operate any of
its branches. Adding branches is a Pro-plan feature (or the OKKARO admin).
"""
import re
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from django.utils import timezone
from django_tenants.utils import schema_context
from .models import Tenant


def _home_tenant(request):
    """The user's head-office tenant (never changes; from user.tenant_schema)."""
    schema = getattr(request.user, 'tenant_schema', '') or ''
    if not schema:
        return None
    return Tenant.objects.filter(schema_name=schema).first()


def _accessible(request):
    """All tenants this user may switch into: head office + its branches.
    Superuser can access every business."""
    if request.user.is_superuser:
        return list(Tenant.objects.exclude(schema_name='public').order_by('parent_id', 'created_on'))
    home = _home_tenant(request)
    if not home:
        return []
    # if the user's home is itself a branch, use its parent as the real head
    head = home.parent or home
    rows = [head] + list(head.branches.all().order_by('created_on'))
    return rows


def _can_add_branches(request):
    if request.user.is_superuser:
        return True
    home = _home_tenant(request)
    head = (home.parent or home) if home else None
    return bool(head and head.plan == 'pro')


def _serialize(t, head_schema, active_schema):
    return {
        'id': t.id,
        'schema': t.schema_name,
        'business_name': t.business_name,
        'branch_label': t.branch_label,
        'is_head': t.schema_name == head_schema,
        'is_active': t.schema_name == active_schema,
        'plan': t.plan,
        'status': t.status,
    }


class BranchesView(APIView):
    """GET: list head office + branches for the switcher.
       POST: create a new branch (Pro only)."""

    def get(self, request):
        rows = _accessible(request)
        active = getattr(connection, 'schema_name', '') or ''
        home = _home_tenant(request)
        head = (home.parent or home) if home else None
        head_schema = head.schema_name if head else active
        return Response({
            'can_add_branches': _can_add_branches(request),
            'is_superuser': request.user.is_superuser,
            'branches': [_serialize(t, head_schema, active) for t in rows],
        })

    def post(self, request):
        if not _can_add_branches(request):
            return Response({'error': 'Branches Pro plan mein available hain. Pehle Pro par upgrade karein.'}, status=403)
        home = _home_tenant(request)
        if home is None and not request.user.is_superuser:
            return Response({'error': 'No head office found'}, status=400)
        head = (home.parent or home) if home else None

        label = (request.data.get('branch_label') or '').strip()
        if not label:
            return Response({'error': 'branch_label required'}, status=400)

        # branch creation must run from the public schema
        connection.set_schema_to_public()

        base = re.sub(r'[^a-z0-9]', '', label.lower())[:30]
        prefix = (head.schema_name if head else 'biz')[:20]
        base = f"{prefix}b{base}" if base else f"{prefix}branch"
        if not base[0].isalpha():
            base = 'b' + base
        schema = base
        i = 1
        while Tenant.objects.filter(schema_name=schema).exists():
            schema = f"{base}{i}"; i += 1

        email = f"{schema}@okkaro.app"
        try:
            from accounting.services import seed_default_accounts
            branch = Tenant(
                schema_name=schema,
                business_name=(f"{head.business_name} — {label}" if head else label),
                name=head.name if head else label,
                email=email,
                phone=request.data.get('phone', '') or (head.phone if head else ''),
                city=request.data.get('city', '') or (head.city if head else ''),
                country=head.country if head else 'Pakistan',
                currency=head.currency if head else 'PKR',
                plan=head.plan if head else 'pro',
                status=head.status if head else 'active',
                billing_cycle=head.billing_cycle if head else 'monthly',
                logo_base64=head.logo_base64 if head else '',
                branch_label=label,
                parent=head,
            )
            branch.save()  # auto_create_schema → creates schema + tenant migrations
            with schema_context(schema):
                seed_default_accounts()
        except Exception as e:
            import traceback; traceback.print_exc()
            return Response({'error': f'{type(e).__name__}: {e}'}, status=400)

        return Response({'id': branch.id, 'schema': schema, 'business_name': branch.business_name}, status=201)


class BranchSwitchView(APIView):
    """Issue a fresh token whose active business (tenant) is the chosen branch."""
    def post(self, request):
        target = (request.data.get('schema') or '').strip()
        allowed = {t.schema_name for t in _accessible(request)}
        if target not in allowed:
            return Response({'error': 'Not allowed'}, status=403)
        from authentication.serializers import CustomTokenObtainPairSerializer
        refresh = CustomTokenObtainPairSerializer.get_token(request.user)
        refresh['tenant'] = target
        access = refresh.access_token
        access['tenant'] = target
        return Response({'access': str(access), 'refresh': str(refresh), 'schema': target})


class BranchSummaryView(APIView):
    """Combined view: per-branch key numbers + a grand total."""
    def get(self, request):
        rows = _accessible(request)
        active = getattr(connection, 'schema_name', '') or ''
        home = _home_tenant(request)
        head = (home.parent or home) if home else None
        head_schema = head.schema_name if head else active

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()

        out, tot_sales, tot_recv = [], 0, 0
        for t in rows:
            month_sales, receivables = 0, 0
            try:
                with schema_context(t.schema_name):
                    from invoicing.models import Invoice
                    from django.db.models import Sum
                    month_sales = float(Invoice.objects.filter(
                        invoice_type='sale', date__gte=month_start
                    ).aggregate(s=Sum('grand_total'))['s'] or 0)
                    receivables = float(Invoice.objects.filter(
                        invoice_type='sale', status__in=['unpaid', 'partial']
                    ).aggregate(s=Sum('balance_due'))['s'] or 0)
            except Exception:
                pass
            tot_sales += month_sales; tot_recv += receivables
            d = _serialize(t, head_schema, active)
            d.update({'month_sales': month_sales, 'receivables': receivables})
            out.append(d)

        # restore active schema (schema_context already restores, but be safe)
        return Response({
            'branches': out,
            'totals': {'month_sales': tot_sales, 'receivables': tot_recv, 'count': len(out)},
            'can_add_branches': _can_add_branches(request),
        })
