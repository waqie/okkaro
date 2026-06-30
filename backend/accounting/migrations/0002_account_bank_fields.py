from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='account_number',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='account',
            name='bank_name',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
