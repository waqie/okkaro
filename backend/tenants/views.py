from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection

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
