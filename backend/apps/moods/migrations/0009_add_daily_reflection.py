from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('moods', '0008_dailyaggregate_logged_at'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyReflection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(verbose_name='datum')),
                ('entry', models.TextField(verbose_name='reflektion')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='skapad')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='uppdaterad')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_reflections', to=settings.AUTH_USER_MODEL, verbose_name='användare')),
            ],
            options={
                'verbose_name': 'dagreflektion',
                'verbose_name_plural': 'dagreflektioner',
                'ordering': ['-date'],
            },
        ),
        migrations.AddIndex(
            model_name='dailyreflection',
            index=models.Index(fields=['user', '-date'], name='moods_daily_user_id_7d9321_idx'),
        ),
        migrations.AddIndex(
            model_name='dailyreflection',
            index=models.Index(fields=['user', 'date'], name='moods_daily_user_id_2a0b3d_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='dailyreflection',
            unique_together={('user', 'date')},
        ),
    ]
