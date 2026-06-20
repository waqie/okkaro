from rest_framework import viewsets, filters
from .models import PricedListing
from .serializers import PricedListingSerializer


class PricedListingViewSet(viewsets.ModelViewSet):
    serializer_class = PricedListingSerializer
    queryset = PricedListing.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'sku']

    def _sync_product(self, listing):
        """Auto-create/update an inventory product from the listing so it flows
        into the rest of the system (POS, invoicing → ledger)."""
        try:
            from inventory.models import Product
            prod = None
            if listing.sku:
                prod = Product.objects.filter(sku=listing.sku).first()
            if not prod:
                prod = Product.objects.filter(name=listing.title).first()
            if prod:
                prod.sale_price = listing.recommended_price
                prod.purchase_price = listing.landing_cost
                prod.save()
            else:
                Product.objects.create(
                    name=listing.title, sku=listing.sku or '',
                    sale_price=listing.recommended_price,
                    purchase_price=listing.landing_cost, current_stock=0,
                )
        except Exception:
            pass

    def perform_create(self, serializer):
        listing = serializer.save()
        self._sync_product(listing)

    def perform_update(self, serializer):
        listing = serializer.save()
        self._sync_product(listing)
