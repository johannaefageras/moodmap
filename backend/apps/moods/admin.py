from django.contrib import admin
from .models import Tag, MoodEntry, DailyAggregate


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'color', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'user__email')


@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'mood_level', 'mood_label', 'timestamp', 'has_note')
    list_filter = ('mood_level', 'timestamp', 'tags')
    search_fields = ('user__email', 'note')
    date_hierarchy = 'timestamp'
    readonly_fields = ('created_at', 'updated_at')
    
    def has_note(self, obj):
        return bool(obj.note)
    has_note.boolean = True
    has_note.short_description = 'Anteckning'


@admin.register(DailyAggregate)
class DailyAggregateAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'average_mood', 'min_mood', 'max_mood', 'entry_count')
    list_filter = ('date',)
    search_fields = ('user__email',)
    date_hierarchy = 'date'
    readonly_fields = ('updated_at',)
