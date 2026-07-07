"""Public (no-login) storefront endpoints: shop info + product catalog.

Each business has its own store. The store link carries ?shop=<schema> so the
right business's catalog is shown (without login). Without a shop param we fall
back to the host tenant.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django_tenants.utils import schema_context, get_tenant_model
from .models import Product


def _resolve(request):
    """Return (tenant, schema) for the requested shop, or the host tenant."""
    shop = request.GET.get('shop')
    if shop:
        T = get_tenant_model()
        t = T.objects.filter(schema_name=shop).first()
        if t:
            return t, shop
    t = getattr(connection, 'tenant', None)
    return t, getattr(t, 'schema_name', None)


class ShopInfoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        t, _ = _resolve(request)
        return Response({
            'business_name': getattr(t, 'business_name', None) or 'OKKARO Store',
            'phone': getattr(t, 'phone', '') or '',
            'city': getattr(t, 'city', '') or '',
            'currency': getattr(t, 'currency', 'PKR') or 'PKR',
            'logo_base64': getattr(t, 'logo_base64', '') or '',
        })


class StoreProductsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def _products(self):
        return list(Product.objects.filter(is_active=True)
                    .values('id', 'name', 'sale_price', 'unit', 'current_stock',
                            'image_base64', 'product_type'))

    def get(self, request):
        _, schema = _resolve(request)
        if schema:
            with schema_context(schema):
                return Response(self._products())
        return Response(self._products())
