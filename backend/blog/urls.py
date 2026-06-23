from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PostViewSet, sitemap_urls

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')

urlpatterns = [
    path('sitemap-urls/', sitemap_urls),
] + router.urls
