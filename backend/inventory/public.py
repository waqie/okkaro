"""Public (no-login) storefront endpoints: shop info + product catalog."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from .models import Product


class ShopInfoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        t = getattr(connection, 'tenant', None)
        return Response({
            'business_name': getattr(t, 'business_name', None) or 'OKKARO Store',
            'phone': getattr(t, 'phone', '') or '',
            'city': getattr(t, 'city', '') or '',
            'currency': getattr(t, 'currency', 'PKR') or 'PKR',
        })


class StoreProductsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        qs = (Product.objects.filter(is_active=True)
              .values('id', 'name', 'sale_price', 'unit', 'current_stock'))
        return Response(list(qs))
