from rest_framework import viewsets, permissions
from .models import Lead
from .serializers import LeadSerializer


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer

    def get_permissions(self):
        # anyone can submit a lead (public contact form); only the owner can view/manage
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        u = self.request.user
        if not (u and u.is_authenticated and u.is_superuser):
            return Lead.objects.none()
        return Lead.objects.all()
