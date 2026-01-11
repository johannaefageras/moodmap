"""
Models for mood tracking.

Core models:
- MoodEntry: Individual mood measurements (atomic unit)
- DailyAggregate: Pre-calculated daily summaries for efficient graphing
- Tag: Reusable tags for categorizing entries
"""
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Avg, Count, Min, Max
from django.utils import timezone


class Tag(models.Model):
    """
    Reusable tags for categorizing mood entries.

    User-specific tags allow personalized tracking categories.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tags',
        verbose_name='användare'
    )
    name = models.CharField('namn', max_length=30)
    color = models.CharField(
        'färg',
        max_length=7,
        default='#6B7280',
        help_text='Hex-färgkod, t.ex. #FF6D2A'
    )
    created_at = models.DateTimeField('skapad', auto_now_add=True)

    class Meta:
        verbose_name = 'tagg'
        verbose_name_plural = 'taggar'
        unique_together = ['user', 'name']
        ordering = ['name']

    def __str__(self):
        return self.name


class MoodEntry(models.Model):
    """
    Individual mood measurement - the atomic unit of tracking.

    Scale: 1-10 where:
    - 1-2: Väldigt låg (Very low)
    - 3-4: Låg (Low)
    - 5-6: Neutral
    - 7-8: Bra (Good)
    - 9-10: Väldigt bra (Very good)
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mood_entries',
        verbose_name='användare'
    )

    # Core mood data
    mood_level = models.PositiveSmallIntegerField(
        'humörnivå',
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text='1 = Väldigt låg, 10 = Väldigt bra'
    )

    # Optional context
    note = models.TextField('anteckning', blank=True, max_length=500)
    tags = models.ManyToManyField(Tag, blank=True, related_name='entries', verbose_name='taggar')

    # Timestamps
    timestamp = models.DateTimeField('tidpunkt', default=timezone.now)
    created_at = models.DateTimeField('skapad', auto_now_add=True)
    updated_at = models.DateTimeField('uppdaterad', auto_now=True)

    class Meta:
        verbose_name = 'humörnotering'
        verbose_name_plural = 'humörnoteringar'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.mood_level} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Trigger daily aggregate update
        DailyAggregate.update_for_date(self.user, self.timestamp.date())

    def delete(self, *args, **kwargs):
        date = self.timestamp.date()
        user = self.user
        super().delete(*args, **kwargs)
        # Trigger daily aggregate update after deletion
        DailyAggregate.update_for_date(user, date)

    @property
    def mood_label(self):
        """Return Swedish label for mood level."""
        if self.mood_level <= 2:
            return 'Väldigt låg'
        elif self.mood_level <= 4:
            return 'Låg'
        elif self.mood_level <= 6:
            return 'Neutral'
        elif self.mood_level <= 8:
            return 'Bra'
        return 'Väldigt bra'


class DailyAggregate(models.Model):
    """
    Pre-calculated daily summary for efficient graph rendering.

    Automatically updated when MoodEntry records change.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_aggregates',
        verbose_name='användare'
    )

    date = models.DateField('datum')
    logged_at = models.DateTimeField('loggad', default=timezone.now)

    # Aggregated values
    average_mood = models.DecimalField(
        'genomsnittligt humör',
        max_digits=4,
        decimal_places=2
    )
    min_mood = models.PositiveSmallIntegerField('lägsta humör')
    max_mood = models.PositiveSmallIntegerField('högsta humör')
    entry_count = models.PositiveSmallIntegerField('antal noteringar')

    # Timestamps
    updated_at = models.DateTimeField('uppdaterad', auto_now=True)

    class Meta:
        verbose_name = 'dagssammanfattning'
        verbose_name_plural = 'dagssammanfattningar'
        unique_together = ['user', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.date} (snitt: {self.average_mood})"

    @classmethod
    def update_for_date(cls, user, date):
        """
        Recalculate aggregate for a specific date.

        Called automatically when MoodEntry is saved or deleted.
        """
        entries = MoodEntry.objects.filter(
            user=user,
            timestamp__date=date
        )

        stats = entries.aggregate(
            avg=Avg('mood_level'),
            min=Min('mood_level'),
            max=Max('mood_level'),
            count=Count('id')
        )

        if stats['count'] > 0:
            cls.objects.update_or_create(
                user=user,
                date=date,
                defaults={
                    'average_mood': round(stats['avg'], 2),
                    'min_mood': stats['min'],
                    'max_mood': stats['max'],
                    'entry_count': stats['count'],
                }
            )
        else:
            # No entries for this date, remove aggregate
            cls.objects.filter(user=user, date=date).delete()


class DailyLog(models.Model):
    """
    Daily reflection log - one per user per day.

    Captures context factors that may influence mood:
    sleep, energy, anxiety, stress, etc.
    """

    # Choice fields
    class ExerciseLevel(models.TextChoices):
        NONE = 'none', 'Ingen'
        LIGHT = 'light', 'Lätt'
        MODERATE = 'moderate', 'Måttlig'
        INTENSE = 'intense', 'Intensiv'

    class SocialLevel(models.TextChoices):
        NONE = 'none', 'Ingen'
        LITTLE = 'little', 'Lite'
        SOME = 'some', 'En del'
        LOTS = 'lots', 'Mycket'

    class SubstanceLevel(models.TextChoices):
        NONE = 'none', 'Inga'
        LIGHT = 'light', 'Lite'
        MODERATE = 'moderate', 'Måttligt'
        HEAVY = 'heavy', 'Mycket'

    class DaylightLevel(models.TextChoices):
        NONE = 'none', 'Inget'
        LITTLE = 'little', 'Lite'
        SOME = 'some', 'En del'
        LOTS = 'lots', 'Mycket'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_logs',
        verbose_name='användare'
    )

    date = models.DateField('datum')
    logged_at = models.DateTimeField('loggad', default=timezone.now)

    # Sleep
    sleep_hours = models.DecimalField(
        'sömntimmar',
        max_digits=3,
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(24)],
        null=True,
        blank=True
    )
    sleep_quality = models.PositiveSmallIntegerField(
        'sömnkvalitet',
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text='1 = Mycket dålig, 5 = Mycket bra'
    )

    # Physical state
    energy = models.PositiveSmallIntegerField(
        'energi',
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text='1 = Mycket låg, 5 = Mycket hög'
    )
    appetite = models.PositiveSmallIntegerField(
        'aptit',
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text='1 = Ingen aptit, 5 = Mycket god aptit'
    )

    # Mental state
    anxiety = models.PositiveSmallIntegerField(
        'ångest',
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text='1 = Ingen ångest, 5 = Mycket stark ångest'
    )
    stress = models.PositiveSmallIntegerField(
        'stress',
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text='1 = Ingen stress, 5 = Mycket hög stress'
    )
    concentration = models.PositiveSmallIntegerField(
        'koncentration',
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text='1 = Mycket dålig, 5 = Mycket bra'
    )

    # Activities
    exercise = models.CharField(
        'fysisk aktivitet',
        max_length=10,
        choices=ExerciseLevel.choices,
        blank=True,
        null=True
    )
    social = models.CharField(
        'socialt',
        max_length=10,
        choices=SocialLevel.choices,
        blank=True,
        null=True
    )
    daylight = models.CharField(
        'dagsljus',
        max_length=10,
        choices=DaylightLevel.choices,
        blank=True,
        null=True
    )

    # Substances
    alcohol = models.CharField(
        'alkohol',
        max_length=10,
        choices=SubstanceLevel.choices,
        blank=True,
        null=True
    )
    nicotine = models.CharField(
        'nikotin',
        max_length=10,
        choices=SubstanceLevel.choices,
        blank=True,
        null=True
    )
    other_substances = models.CharField(
        'droger',
        max_length=10,
        choices=SubstanceLevel.choices,
        blank=True,
        null=True
    )

    # Notes
    notes = models.TextField(
        'anteckningar',
        blank=True,
        max_length=1000
    )

    # Timestamps
    created_at = models.DateTimeField('skapad', auto_now_add=True)
    updated_at = models.DateTimeField('uppdaterad', auto_now=True)

    class Meta:
        verbose_name = 'daganteckning'
        verbose_name_plural = 'daganteckningar'
        unique_together = ['user', 'date']  # One per user per day
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.date}"


class DailyReflection(models.Model):
    """Generated daily reflection entry - one per user per day."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_reflections',
        verbose_name='användare'
    )
    date = models.DateField('datum')
    entry = models.TextField('reflektion')
    created_at = models.DateTimeField('skapad', auto_now_add=True)
    updated_at = models.DateTimeField('uppdaterad', auto_now=True)

    class Meta:
        verbose_name = 'dagreflektion'
        verbose_name_plural = 'dagreflektioner'
        unique_together = ['user', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.date}"
