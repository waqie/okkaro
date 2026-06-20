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
        into the rest of the system (POS, invoicing → ledger). Isolated so it can
        never break the listing save."""
        from django.db import transaction
        try:
            with transaction.atomic():
                from inventory.models import Product
                sku = listing.sku or f'ECO-{listing.id}'  # unique per listing (SKU is unique)
                prod = Product.objects.filter(sku=sku).first()
                if not prod and listing.sku:
                    prod = Product.objects.filter(name=listing.title).first()
                if prod:
                    prod.sale_price = listing.recommended_price
                    prod.purchase_price = listing.landing_cost
                    prod.save()
                else:
                    Product.objects.create(
                        name=listing.title, sku=sku,
                        sale_price=listing.recommended_price,
                        purchase_price=listing.landing_cost,
                        current_stock=listing.stock or 0,
                    )
        except Exception:
            pass

    def perform_create(self, serializer):
        listing = serializer.save()
        self._sync_product(listing)

    def perform_update(self, serializer):
        listing = serializer.save()
        self._sync_product(listing)
