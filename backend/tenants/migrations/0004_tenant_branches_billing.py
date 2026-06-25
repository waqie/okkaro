import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0003_tenant_logo_base64'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='billing_cycle',
            field=models.CharField(
                choices=[('monthly', 'Monthly'), ('yearly', 'Yearly')],
                default='monthly', max_length=10),
        ),
        migrations.AddField(
            model_name='tenant',
            name='paid_until',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='branch_label',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='tenant',
            name='parent',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='branches', to='tenants.tenant'),
        ),
    ]
