"""
URL patterns for mood tracking API.
"""
from django.urls import path
from . import views

app_name = 'moods'

urlpatterns = [
    # Tags
    path('tags/', views.TagListCreateView.as_view(), name='tag-list'),
    path('tags/<int:pk>/', views.TagDetailView.as_view(), name='tag-detail'),
    
    # Mood entries
    path('entries/', views.MoodEntryListCreateView.as_view(), name='entry-list'),
    path('entries/<int:pk>/', views.MoodEntryDetailView.as_view(), name='entry-detail'),
    
    # Graph data
    path('graph/', views.GraphDataView.as_view(), name='graph-data'),
    
    # Daily logs
    path('daily-logs/', views.DailyLogListCreateView.as_view(), name='daily-log-list'),
    path('daily-logs/today/', views.DailyLogTodayView.as_view(), name='daily-log-today'),
    path('daily-logs/<int:pk>/', views.DailyLogDetailView.as_view(), name='daily-log-detail'),
    path('daily-reflections/', views.DailyReflectionListView.as_view(), name='daily-reflection-list'),
    path('daily-reflections/generate/', views.DailyReflectionGenerateView.as_view(), name='daily-reflection-generate'),
]
