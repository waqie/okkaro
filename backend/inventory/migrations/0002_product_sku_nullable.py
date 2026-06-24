from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
    ]

    operations = [
        # allow empty SKU to be stored as NULL (so multiple "no-SKU" products are allowed)
        migrations.AlterField(
            model_name='product',
            name='sku',
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
        # normalise any existing empty-string SKUs to NULL
        migrations.RunSQL(
            "UPDATE inventory_product SET sku = NULL WHERE sku = '';",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
