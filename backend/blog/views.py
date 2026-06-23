from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.http import HttpResponse
from django.utils import timezone
from .models import Post
from .serializers import PostSerializer, PostListSerializer


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Anyone can read; only the OKKARO super-admin can write."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    permission_classes = [IsOwnerOrReadOnly]
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'excerpt', 'tags']

    def get_serializer_class(self):
        return PostListSerializer if self.action == 'list' else PostSerializer

    def get_queryset(self):
        qs = Post.objects.all()
        # public visitors only see published posts; the owner sees everything
        u = self.request.user
        if not (u and u.is_authenticated and u.is_superuser):
            qs = qs.filter(published=True, pub_date__lte=timezone.now())
        return qs


@api_view(['GET'])
def sitemap_urls(request):
    """Returns published post slugs — used to build sitemap.xml."""
    posts = Post.objects.filter(published=True, pub_date__lte=timezone.now()).values('slug', 'updated_at')
    return Response(list(posts))
