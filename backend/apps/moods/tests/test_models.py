"""
Tests for mood tracking models.
"""
from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from apps.moods.models import Tag, MoodEntry, DailyAggregate

User = get_user_model()


class TagModelTests(TestCase):
    """Tests for the Tag model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_tag(self):
        """Test creating a tag with valid data."""
        tag = Tag.objects.create(
            user=self.user,
            name='Arbete',
            color='#FF6D2A'
        )
        self.assertEqual(tag.name, 'Arbete')
        self.assertEqual(tag.color, '#FF6D2A')
        self.assertEqual(tag.user, self.user)
    
    def test_tag_default_color(self):
        """Test that tags get a default color."""
        tag = Tag.objects.create(user=self.user, name='Test')
        self.assertEqual(tag.color, '#6B7280')
    
    def test_tag_unique_per_user(self):
        """Test that tag names are unique per user."""
        Tag.objects.create(user=self.user, name='Arbete')
        
        with self.assertRaises(Exception):
            Tag.objects.create(user=self.user, name='Arbete')
    
    def test_same_tag_name_different_users(self):
        """Test that different users can have tags with same name."""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123'
        )
        
        tag1 = Tag.objects.create(user=self.user, name='Arbete')
        tag2 = Tag.objects.create(user=other_user, name='Arbete')
        
        self.assertEqual(tag1.name, tag2.name)
        self.assertNotEqual(tag1.user, tag2.user)
    
    def test_tag_str(self):
        """Test tag string representation."""
        tag = Tag.objects.create(user=self.user, name='Träning')
        self.assertEqual(str(tag), 'Träning')


class MoodEntryModelTests(TestCase):
    """Tests for the MoodEntry model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_mood_entry(self):
        """Test creating a mood entry with valid data."""
        entry = MoodEntry.objects.create(
            user=self.user,
            mood_level=7,
            note='Bra dag på jobbet'
        )
        self.assertEqual(entry.mood_level, 7)
        self.assertEqual(entry.note, 'Bra dag på jobbet')
        self.assertEqual(entry.user, self.user)
    
    def test_mood_level_minimum(self):
        """Test that mood level cannot be below 1."""
        entry = MoodEntry(user=self.user, mood_level=0)
        with self.assertRaises(ValidationError):
            entry.full_clean()
    
    def test_mood_level_maximum(self):
        """Test that mood level cannot exceed 10."""
        entry = MoodEntry(user=self.user, mood_level=11)
        with self.assertRaises(ValidationError):
            entry.full_clean()
    
    def test_mood_level_valid_range(self):
        """Test that mood levels 1-10 are valid."""
        for level in range(1, 11):
            entry = MoodEntry(user=self.user, mood_level=level)
            entry.full_clean()  # Should not raise
    
    def test_mood_label_very_low(self):
        """Test mood label for levels 1-2."""
        entry = MoodEntry(user=self.user, mood_level=1)
        self.assertEqual(entry.mood_label, 'Väldigt låg')
        
        entry.mood_level = 2
        self.assertEqual(entry.mood_label, 'Väldigt låg')
    
    def test_mood_label_low(self):
        """Test mood label for levels 3-4."""
        entry = MoodEntry(user=self.user, mood_level=3)
        self.assertEqual(entry.mood_label, 'Låg')
        
        entry.mood_level = 4
        self.assertEqual(entry.mood_label, 'Låg')
    
    def test_mood_label_neutral(self):
        """Test mood label for levels 5-6."""
        entry = MoodEntry(user=self.user, mood_level=5)
        self.assertEqual(entry.mood_label, 'Neutral')
        
        entry.mood_level = 6
        self.assertEqual(entry.mood_label, 'Neutral')
    
    def test_mood_label_good(self):
        """Test mood label for levels 7-8."""
        entry = MoodEntry(user=self.user, mood_level=7)
        self.assertEqual(entry.mood_label, 'Bra')
        
        entry.mood_level = 8
        self.assertEqual(entry.mood_label, 'Bra')
    
    def test_mood_label_very_good(self):
        """Test mood label for levels 9-10."""
        entry = MoodEntry(user=self.user, mood_level=9)
        self.assertEqual(entry.mood_label, 'Väldigt bra')
        
        entry.mood_level = 10
        self.assertEqual(entry.mood_label, 'Väldigt bra')
    
    def test_entry_with_tags(self):
        """Test adding tags to a mood entry."""
        tag1 = Tag.objects.create(user=self.user, name='Arbete')
        tag2 = Tag.objects.create(user=self.user, name='Stress')
        
        entry = MoodEntry.objects.create(
            user=self.user,
            mood_level=4
        )
        entry.tags.add(tag1, tag2)
        
        self.assertEqual(entry.tags.count(), 2)
        self.assertIn(tag1, entry.tags.all())
        self.assertIn(tag2, entry.tags.all())
    
    def test_entry_default_timestamp(self):
        """Test that entries get current timestamp by default."""
        before = timezone.now()
        entry = MoodEntry.objects.create(user=self.user, mood_level=5)
        after = timezone.now()
        
        self.assertGreaterEqual(entry.timestamp, before)
        self.assertLessEqual(entry.timestamp, after)
    
    def test_entry_custom_timestamp(self):
        """Test creating entry with custom timestamp."""
        custom_time = timezone.now() - timedelta(days=1)
        entry = MoodEntry.objects.create(
            user=self.user,
            mood_level=6,
            timestamp=custom_time
        )
        self.assertEqual(entry.timestamp, custom_time)
    
    def test_entries_ordered_by_timestamp_desc(self):
        """Test that entries are ordered newest first."""
        old_entry = MoodEntry.objects.create(
            user=self.user,
            mood_level=5,
            timestamp=timezone.now() - timedelta(hours=2)
        )
        new_entry = MoodEntry.objects.create(
            user=self.user,
            mood_level=7,
            timestamp=timezone.now()
        )
        
        entries = list(MoodEntry.objects.filter(user=self.user))
        self.assertEqual(entries[0], new_entry)
        self.assertEqual(entries[1], old_entry)


class DailyAggregateModelTests(TestCase):
    """Tests for the DailyAggregate model and auto-calculation."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.today = timezone.now().date()
    
    def test_aggregate_created_on_entry_save(self):
        """Test that DailyAggregate is created when first entry is saved."""
        self.assertEqual(DailyAggregate.objects.count(), 0)
        
        MoodEntry.objects.create(
            user=self.user,
            mood_level=7,
            timestamp=timezone.now()
        )
        
        self.assertEqual(DailyAggregate.objects.count(), 1)
        aggregate = DailyAggregate.objects.first()
        self.assertEqual(aggregate.user, self.user)
        self.assertEqual(aggregate.date, self.today)
    
    def test_aggregate_single_entry(self):
        """Test aggregate values with single entry."""
        MoodEntry.objects.create(
            user=self.user,
            mood_level=7,
            timestamp=timezone.now()
        )
        
        aggregate = DailyAggregate.objects.get(user=self.user, date=self.today)
        self.assertEqual(aggregate.average_mood, Decimal('7.00'))
        self.assertEqual(aggregate.min_mood, 7)
        self.assertEqual(aggregate.max_mood, 7)
        self.assertEqual(aggregate.entry_count, 1)
    
    def test_aggregate_multiple_entries(self):
        """Test aggregate values with multiple entries."""
        MoodEntry.objects.create(user=self.user, mood_level=4)
        MoodEntry.objects.create(user=self.user, mood_level=6)
        MoodEntry.objects.create(user=self.user, mood_level=8)
        
        aggregate = DailyAggregate.objects.get(user=self.user, date=self.today)
        self.assertEqual(aggregate.average_mood, Decimal('6.00'))
        self.assertEqual(aggregate.min_mood, 4)
        self.assertEqual(aggregate.max_mood, 8)
        self.assertEqual(aggregate.entry_count, 3)
    
    def test_aggregate_updated_on_entry_update(self):
        """Test that aggregate is recalculated when entry is updated."""
        entry = MoodEntry.objects.create(user=self.user, mood_level=5)
        
        aggregate = DailyAggregate.objects.get(user=self.user, date=self.today)
        self.assertEqual(aggregate.average_mood, Decimal('5.00'))
        
        entry.mood_level = 9
        entry.save()
        
        aggregate.refresh_from_db()
        self.assertEqual(aggregate.average_mood, Decimal('9.00'))
    
    def test_aggregate_updated_on_entry_delete(self):
        """Test that aggregate is recalculated when entry is deleted."""
        entry1 = MoodEntry.objects.create(user=self.user, mood_level=4)
        entry2 = MoodEntry.objects.create(user=self.user, mood_level=8)
        
        aggregate = DailyAggregate.objects.get(user=self.user, date=self.today)
        self.assertEqual(aggregate.average_mood, Decimal('6.00'))
        self.assertEqual(aggregate.entry_count, 2)
        
        entry1.delete()
        
        aggregate.refresh_from_db()
        self.assertEqual(aggregate.average_mood, Decimal('8.00'))
        self.assertEqual(aggregate.entry_count, 1)
    
    def test_aggregate_deleted_when_no_entries(self):
        """Test that aggregate is deleted when all entries are removed."""
        entry = MoodEntry.objects.create(user=self.user, mood_level=5)
        self.assertEqual(DailyAggregate.objects.count(), 1)
        
        entry.delete()
        self.assertEqual(DailyAggregate.objects.count(), 0)
    
    def test_separate_aggregates_per_day(self):
        """Test that each day gets its own aggregate."""
        yesterday = timezone.now() - timedelta(days=1)
        
        MoodEntry.objects.create(
            user=self.user,
            mood_level=3,
            timestamp=yesterday
        )
        MoodEntry.objects.create(
            user=self.user,
            mood_level=8,
            timestamp=timezone.now()
        )
        
        self.assertEqual(DailyAggregate.objects.count(), 2)
        
        yesterday_agg = DailyAggregate.objects.get(date=yesterday.date())
        today_agg = DailyAggregate.objects.get(date=self.today)
        
        self.assertEqual(yesterday_agg.average_mood, Decimal('3.00'))
        self.assertEqual(today_agg.average_mood, Decimal('8.00'))
    
    def test_separate_aggregates_per_user(self):
        """Test that each user gets their own aggregates."""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123'
        )
        
        MoodEntry.objects.create(user=self.user, mood_level=3)
        MoodEntry.objects.create(user=other_user, mood_level=9)
        
        self.assertEqual(DailyAggregate.objects.count(), 2)
        
        my_agg = DailyAggregate.objects.get(user=self.user, date=self.today)
        other_agg = DailyAggregate.objects.get(user=other_user, date=self.today)
        
        self.assertEqual(my_agg.average_mood, Decimal('3.00'))
        self.assertEqual(other_agg.average_mood, Decimal('9.00'))


class UserCascadeDeleteTests(TestCase):
    """Tests for cascading deletion when user is deleted."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_entries_deleted_with_user(self):
        """Test that mood entries are deleted when user is deleted."""
        MoodEntry.objects.create(user=self.user, mood_level=5)
        MoodEntry.objects.create(user=self.user, mood_level=7)
        
        self.assertEqual(MoodEntry.objects.count(), 2)
        
        self.user.delete()
        
        self.assertEqual(MoodEntry.objects.count(), 0)
    
    def test_tags_deleted_with_user(self):
        """Test that tags are deleted when user is deleted."""
        Tag.objects.create(user=self.user, name='Test1')
        Tag.objects.create(user=self.user, name='Test2')
        
        self.assertEqual(Tag.objects.count(), 2)
        
        self.user.delete()
        
        self.assertEqual(Tag.objects.count(), 0)
    
    def test_aggregates_deleted_with_user(self):
        """Test that aggregates are deleted when user is deleted."""
        MoodEntry.objects.create(user=self.user, mood_level=5)
        
        self.assertEqual(DailyAggregate.objects.count(), 1)
        
        self.user.delete()
        
        self.assertEqual(DailyAggregate.objects.count(), 0)
