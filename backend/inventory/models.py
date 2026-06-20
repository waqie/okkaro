from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class Product(models.Model):
    UNIT_CHOICES = [
        ('pcs', 'Pieces'), ('kg', 'Kilogram'), ('g', 'Gram'),
        ('ltr', 'Litre'), ('mtr', 'Metre'), ('box', 'Box'),
        ('dz', 'Dozen'), ('set', 'Set'),
    ]
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, unique=True, blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='pcs')
    sale_price = models.DecimalField(max_digits=15, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def stock_value(self):
        return self.current_stock * self.purchase_price

    @property
    def low_stock(self):
        return self.current_stock <= self.reorder_level

class StockMovement(models.Model):
    TYPE = [
        ('in', 'Stock In'), ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'), ('return', 'Return'),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=TYPE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        product = self.product
        if self.movement_type == 'in':
            product.current_stock += self.quantity
        elif self.movement_type == 'out':
            product.current_stock -= self.quantity
        elif self.movement_type == 'adjustment':
            product.current_stock = self.quantity
        product.save()
