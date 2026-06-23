from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0002_alter_tenant_plan'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='logo_base64',
            field=models.TextField(blank=True, default=''),
        ),
    ]
