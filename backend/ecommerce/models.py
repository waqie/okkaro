from decimal import Decimal
from django.db import models


def D(v):
    return Decimal(str(v or 0))


class PricedListing(models.Model):
    """A product listing with full cost breakdown → recommended price & profit.
    Replaces the seller's Excel pricing formulas (dropshipping / white-label / private-label)."""
    title = models.CharField(max_length=200)
    sku = models.CharField(max_length=80, blank=True)
    stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # opening quantity

    # buying side (may be a different currency)
    buy_currency = models.CharField(max_length=10, default='USD')
    buy_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=4, default=1)  # buy → sell

    # selling side costs (in sell currency)
    sell_currency = models.CharField(max_length=10, default='PKR')
    shipping = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    ads_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    packaging = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # percentage fees & desired margin (% of selling price)
    marketplace_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    payment_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    margin_pct = models.DecimalField(max_digits=5, decimal_places=2, default=30)

    # computed (stored)
    landing_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    recommended_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    profit = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def compute(self):
        # fixed costs in the selling currency
        base = (D(self.buy_cost) * D(self.exchange_rate)) + D(self.shipping) + D(self.ads_cost) + D(self.packaging)
        self.landing_cost = base
        pct = (D(self.marketplace_fee_pct) + D(self.payment_fee_pct) + D(self.margin_pct)) / Decimal('100')
        denom = Decimal('1') - pct
        if denom > 0:
            price = base / denom
        else:
            price = base  # invalid (fees+margin >= 100%) → fall back to cost
        fees = price * (D(self.marketplace_fee_pct) + D(self.payment_fee_pct)) / Decimal('100')
        self.recommended_price = price.quantize(Decimal('0.01'))
        self.total_cost = (base + fees).quantize(Decimal('0.01'))
        self.profit = (price - base - fees).quantize(Decimal('0.01'))

    def save(self, *args, **kwargs):
        self.compute()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
