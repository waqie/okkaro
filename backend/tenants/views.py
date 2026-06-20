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
        return Response({'id': t.id, 'plan': t.plan, 'status': t.status})
