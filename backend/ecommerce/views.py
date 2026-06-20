from rest_framework import viewsets, filters
from .models import PricedListing
from .serializers import PricedListingSerializer


class PricedListingViewSet(viewsets.ModelViewSet):
    serializer_class = PricedListingSerializer
    queryset = PricedListing.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'sku']
