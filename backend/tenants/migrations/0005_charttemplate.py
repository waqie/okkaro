from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0004_tenant_branches_billing'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChartTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('accounts', models.JSONField(default=list)),
                ('note', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-id']},
        ),
    ]
