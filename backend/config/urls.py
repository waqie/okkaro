from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from inventory.public import ShopInfoView, StoreProductsView
from tenants.views import BusinessProfileView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/store/info/', ShopInfoView.as_view()),
    path('api/store/products/', StoreProductsView.as_view()),
    path('api/business/', BusinessProfileView.as_view()),
    path('api/auth/', include('authentication.urls')),
    path('api/invoicing/', include('invoicing.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/accounting/', include('accounting.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
