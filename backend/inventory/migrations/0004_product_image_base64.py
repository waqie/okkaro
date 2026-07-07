from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_product_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='image_base64',
            field=models.TextField(blank=True, default=''),
        ),
    ]
