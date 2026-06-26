from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_product_sku_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='product_type',
            field=models.CharField(
                choices=[('good', 'Good (tracks stock)'), ('service', 'Service (no stock)')],
                default='good', max_length=10),
        ),
    ]
