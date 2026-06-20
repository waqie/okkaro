from rest_framework import serializers
from .models import PricedListing


class PricedListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricedListing
        fields = '__all__'
        read_only_fields = ['landing_cost', 'total_cost', 'recommended_price', 'profit']
