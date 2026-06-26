import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0002_quotation_quotationitem'),
        ('inventory', '0003_product_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoiceitem',
            name='product',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='invoice_items', to='inventory.product'),
        ),
        migrations.AddField(
            model_name='quotationitem',
            name='product',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='quotation_items', to='inventory.product'),
        ),
    ]
