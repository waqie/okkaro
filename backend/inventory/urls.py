from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet, basename='category')
router.register('products', views.ProductViewSet, basename='product')
router.register('stock-movements', views.StockMovementViewSet, basename='stockmovement')

urlpatterns = router.urls
