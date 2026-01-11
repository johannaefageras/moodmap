"""
Seed data for development.

Run with: python manage.py shell < seed_data.py
Or import and call: from seed_data import create_seed_data; create_seed_data()
"""
import os
import sys
import django

# Setup Django if running as script
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    django.setup()

from datetime import timedelta
from decimal import Decimal
from random import randint, choice
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.moods.models import Tag, MoodEntry

User = get_user_model()


def create_seed_data():
    """Create sample data for development testing."""
    
    print("🌱 Creating seed data...")
    
    # Create test user
    email = 'demo@humorkarta.se'
    if User.objects.filter(email=email).exists():
        user = User.objects.get(email=email)
        print(f"  → Using existing user: {email}")
    else:
        user = User.objects.create_user(
            email=email,
            password='demo1234',
            display_name='Demo'
        )
        print(f"  ✓ Created user: {email} (password: demo1234)")
    
    # Create tags
    tag_data = [
        ('Arbete', '#3B82F6'),      # Blue
        ('Träning', '#10B981'),     # Green
        ('Familj', '#F59E0B'),      # Amber
        ('Stress', '#EF4444'),      # Red
        ('Social', '#8B5CF6'),      # Purple
        ('Sömn', '#6366F1'),        # Indigo
    ]
    
    tags = []
    for name, color in tag_data:
        tag, created = Tag.objects.get_or_create(
            user=user,
            name=name,
            defaults={'color': color}
        )
        tags.append(tag)
        if created:
            print(f"  ✓ Created tag: {name}")
    
    # Create mood entries for the past 30 days
    # Simulate a realistic pattern: generally okay with some low periods
    now = timezone.now()
    entries_created = 0
    
    # Clear existing entries for clean seed
    existing_count = MoodEntry.objects.filter(user=user).count()
    if existing_count > 0:
        MoodEntry.objects.filter(user=user).delete()
        print(f"  → Cleared {existing_count} existing entries")
    
    for days_ago in range(30, -1, -1):
        day = now - timedelta(days=days_ago)
        
        # Simulate 1-3 entries per day
        num_entries = randint(1, 3)
        
        # Create a "mood trend" for this day (some days are harder)
        if days_ago in [25, 24, 23, 10, 9]:  # Simulate two low periods
            day_baseline = randint(2, 4)
        elif days_ago in [15, 14, 5, 4, 3]:  # Good periods
            day_baseline = randint(7, 9)
        else:
            day_baseline = randint(5, 7)
        
        for i in range(num_entries):
            # Vary mood slightly throughout day
            mood = max(1, min(10, day_baseline + randint(-1, 1)))
            
            # Set time throughout the day
            hour = 8 + (i * 5)  # Morning, afternoon, evening
            entry_time = day.replace(hour=hour, minute=randint(0, 59))
            
            entry = MoodEntry.objects.create(
                user=user,
                mood_level=mood,
                timestamp=entry_time,
                note=_get_sample_note(mood) if randint(0, 2) == 0 else ''
            )
            
            # Add 0-2 random tags
            if randint(0, 1):
                num_tags = randint(1, 2)
                entry.tags.add(*[choice(tags) for _ in range(num_tags)])
            
            entries_created += 1
    
    print(f"  ✓ Created {entries_created} mood entries over 31 days")
    print("")
    print("🎉 Seed data complete!")
    print(f"   Login: {email} / demo1234")


def _get_sample_note(mood_level):
    """Return a sample note based on mood level."""
    if mood_level <= 3:
        notes = [
            "Tung dag idag.",
            "Svårt att komma igång.",
            "Känner mig trött och nere.",
        ]
    elif mood_level <= 6:
        notes = [
            "Helt okej dag.",
            "Lugnt och stilla.",
            "Varken upp eller ner.",
        ]
    else:
        notes = [
            "Bra dag!",
            "Känner mig energisk.",
            "Produktiv och glad.",
            "Fin promenad i solen.",
        ]
    return choice(notes)


if __name__ == '__main__':
    create_seed_data()
