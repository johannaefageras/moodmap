"""
Serializers for mood tracking.
"""
from django.utils import timezone
from rest_framework import serializers
from .models import Tag, MoodEntry, DailyAggregate, DailyLog, DailyReflection


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model."""
    
    class Meta:
        model = Tag
        fields = ('id', 'name', 'color', 'created_at')
        read_only_fields = ('id', 'created_at')
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class MoodEntrySerializer(serializers.ModelSerializer):
    """Serializer for MoodEntry model."""
    
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.none(),
        many=True,
        write_only=True,
        required=False,
        source='tags'
    )
    mood_label = serializers.CharField(read_only=True)
    
    class Meta:
        model = MoodEntry
        fields = (
            'id', 'mood_level', 'mood_label', 'note', 
            'tags', 'tag_ids', 'timestamp', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Limit tag choices to user's own tags
        if 'request' in self.context:
            user = self.context['request'].user
            self.fields['tag_ids'].queryset = Tag.objects.filter(user=user)
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        validated_data['user'] = self.context['request'].user
        entry = MoodEntry.objects.create(**validated_data)
        entry.tags.set(tags)
        return entry
    
    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        return instance


class MoodEntryCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for quick mood entry creation."""
    
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.none(),
        many=True,
        write_only=True,
        required=False,
        source='tags'
    )
    
    class Meta:
        model = MoodEntry
        fields = ('mood_level', 'note', 'tag_ids', 'timestamp')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'request' in self.context:
            user = self.context['request'].user
            self.fields['tag_ids'].queryset = Tag.objects.filter(user=user)
    
    def validate_timestamp(self, value):
        """Ensure timestamp is not in the future."""
        if value and value > timezone.now():
            raise serializers.ValidationError(
                'Du kan inte logga humör i framtiden.'
            )
        return value
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        validated_data['user'] = self.context['request'].user
        entry = MoodEntry.objects.create(**validated_data)
        entry.tags.set(tags)
        return entry


class DailyAggregateSerializer(serializers.ModelSerializer):
    """Serializer for DailyAggregate model."""
    
    class Meta:
        model = DailyAggregate
        fields = ('date', 'average_mood', 'min_mood', 'max_mood', 'entry_count')


class DailyLogSerializer(serializers.ModelSerializer):
    """Serializer for DailyLog model."""
    
    class Meta:
        model = DailyLog
        fields = (
            'id', 'date', 'logged_at',
            'sleep_hours', 'sleep_quality',
            'energy', 'appetite',
            'anxiety', 'stress', 'concentration',
            'exercise', 'social', 'daylight',
            'alcohol', 'nicotine', 'other_substances',
            'notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'date': {'required': False},
        }
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate_date(self, value):
        """Check that date is not in the future and user doesn't already have a log."""
        # Check for future date
        if value and value > timezone.now().date():
            raise serializers.ValidationError(
                'Du kan inte skapa en daganteckning för ett framtida datum.'
            )
        
        # Check for existing log
        user = self.context['request'].user
        existing = DailyLog.objects.filter(user=user, date=value)
        
        # If updating, exclude current instance
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        
        if existing.exists():
            raise serializers.ValidationError(
                'Du har redan en daganteckning för detta datum.'
            )
        return value


class DailyReflectionSerializer(serializers.ModelSerializer):
    """Serializer for DailyReflection model."""

    class Meta:
        model = DailyReflection
        fields = ('id', 'date', 'entry', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def validate_logged_at(self, value):
        """Ensure logged_at timestamp is not in the future."""
        if value and value > timezone.now():
            raise serializers.ValidationError(
                'Du kan inte skapa en daganteckning i framtiden.'
            )
        return value

    def validate(self, attrs):
        logged_at = attrs.get('logged_at')
        if not attrs.get('date') and logged_at:
            attrs['date'] = logged_at.date()
        return attrs
