from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F
from .models import Category, Product, StockMovement
from .serializers import CategorySerializer, ProductSerializer, StockMovementSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'barcode']
    ordering_fields = ['name', 'current_stock', 'sale_price']

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related('category')
        category = self.request.query_params.get('category')
        low_stock = self.request.query_params.get('low_stock')
        if category:
            qs = qs.filter(category_id=category)
        if low_stock == 'true':
            qs = qs.filter(current_stock__lte=F('reorder_level'))
        return qs

    @action(detail=False, methods=['get'])
    def summary(self, request):
        products = Product.objects.filter(is_active=True)
        return Response({
            'total_products': products.count(),
            'total_stock_value': sum(p.stock_value for p in products),
            'low_stock_items': products.filter(
                current_stock__lte=F('reorder_level')
            ).count(),
            'out_of_stock': products.filter(current_stock=0).count(),
        })

class StockMovementViewSet(viewsets.ModelViewSet):
    serializer_class = StockMovementSerializer

    def get_queryset(self):
        qs = StockMovement.objects.select_related('product', 'created_by')
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
