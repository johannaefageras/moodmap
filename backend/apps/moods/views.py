"""
Views for mood tracking API.
"""
from datetime import timedelta
import os
from django.db import models
from django.db.utils import IntegrityError
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    import anthropic
except ImportError:  # pragma: no cover - handled at runtime
    anthropic = None

from .models import Tag, MoodEntry, DailyAggregate, DailyLog, DailyReflection
from .serializers import (
    TagSerializer,
    MoodEntrySerializer,
    MoodEntryCreateSerializer,
    DailyAggregateSerializer,
    DailyLogSerializer,
    DailyReflectionSerializer,
)


# =============================================================================
# Tag Views
# =============================================================================

class TagListCreateView(generics.ListCreateAPIView):
    """List user's tags or create a new tag."""
    
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)


class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a tag."""
    
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)


# =============================================================================
# Mood Entry Views
# =============================================================================

class MoodEntryListCreateView(generics.ListCreateAPIView):
    """List user's mood entries or create a new entry."""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = MoodEntry.objects.filter(user=self.request.user)
        
        # Optional date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        
        return queryset.select_related('user').prefetch_related('tags')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MoodEntryCreateSerializer
        return MoodEntrySerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        
        # Return full entry data
        output_serializer = MoodEntrySerializer(entry, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class MoodEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a mood entry."""
    
    serializer_class = MoodEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MoodEntry.objects.filter(user=self.request.user)


# =============================================================================
# Graph Data Views
# =============================================================================

class GraphDataView(APIView):
    """
    Get aggregated mood data for graph rendering.
    
    Query params:
    - view: 'day' | 'week' | 'month' | 'year'
    - date: Reference date (defaults to today)
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        view_type = request.query_params.get('view', 'week')
        date_str = request.query_params.get('date')
        
        if date_str:
            try:
                from datetime import datetime
                ref_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Ogiltigt datumformat. Använd YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            ref_date = timezone.now().date()
        
        if view_type == 'day':
            data = self._get_day_data(request.user, ref_date)
        elif view_type == 'week':
            data = self._get_week_data(request.user, ref_date)
        elif view_type == 'month':
            data = self._get_month_data(request.user, ref_date)
        elif view_type == 'year':
            data = self._get_year_data(request.user, ref_date)
        else:
            return Response(
                {'error': 'Ogiltig vy. Välj: day, week, month, year.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(data)
    
    def _get_day_data(self, user, date):
        """Individual entries for a single day, formatted for chart."""
        from django.utils import timezone as tz
        
        entries = MoodEntry.objects.filter(
            user=user,
            timestamp__date=date
        ).order_by('timestamp')
        
        # Format entries for chart display
        # Convert to local time for display
        data = []
        for entry in entries:
            local_time = tz.localtime(entry.timestamp)
            data.append({
                'date': local_time.isoformat(),
                'time': local_time.strftime('%H:%M'),
                'average_mood': float(entry.mood_level),
                'entry_count': 1,
                'note': entry.note,
            })
        
        return {
            'view': 'day',
            'date': date.isoformat(),
            'data': data
        }
    
    def _get_week_data(self, user, ref_date):
        """Daily averages for 7 days."""
        start_date = ref_date - timedelta(days=6)
        
        aggregates = DailyAggregate.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=ref_date
        ).order_by('date')
        
        return {
            'view': 'week',
            'start_date': start_date.isoformat(),
            'end_date': ref_date.isoformat(),
            'data': DailyAggregateSerializer(aggregates, many=True).data
        }
    
    def _get_month_data(self, user, ref_date):
        """Daily averages for entire month."""
        start_date = ref_date.replace(day=1)
        
        # Get last day of month
        if ref_date.month == 12:
            end_date = ref_date.replace(day=31)
        else:
            end_date = ref_date.replace(month=ref_date.month + 1, day=1) - timedelta(days=1)
        
        aggregates = DailyAggregate.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        return {
            'view': 'month',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'data': DailyAggregateSerializer(aggregates, many=True).data
        }
    
    def _get_year_data(self, user, ref_date):
        """Monthly averages for entire year."""
        from django.db.models import Avg
        from django.db.models.functions import TruncMonth
        
        start_date = ref_date.replace(month=1, day=1)
        end_date = ref_date.replace(month=12, day=31)
        
        monthly_data = DailyAggregate.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        ).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            average_mood=Avg('average_mood'),
            total_entries=models.Sum('entry_count')
        ).order_by('month')
        
        return {
            'view': 'year',
            'year': ref_date.year,
            'data': [
                {
                    'month': item['month'].isoformat(),
                    'average_mood': round(float(item['average_mood']), 2) if item['average_mood'] else None,
                    'entry_count': item['total_entries']
                }
                for item in monthly_data
            ]
        }


# =============================================================================
# Daily Log Views
# =============================================================================

class DailyLogListCreateView(generics.ListCreateAPIView):
    """List user's daily logs or create a new one."""
    
    serializer_class = DailyLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = DailyLog.objects.filter(user=self.request.user)
        
        # Optional date filtering
        date = self.request.query_params.get('date')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if date:
            queryset = queryset.filter(date=date)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        date_value = None

        if data.get('date'):
            date_value = parse_date(data.get('date'))
        elif data.get('logged_at'):
            logged_at = parse_datetime(data.get('logged_at'))
            if logged_at:
                date_value = logged_at.date()

        existing_log = None
        if date_value:
            existing_log = DailyLog.objects.filter(user=request.user, date=date_value).first()

        serializer = self.get_serializer(existing_log, data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK if existing_log else status.HTTP_201_CREATED
        )


class DailyLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a daily log."""
    
    serializer_class = DailyLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return DailyLog.objects.filter(user=self.request.user)


class DailyLogTodayView(APIView):
    """
    Get or create today's daily log.
    
    GET: Returns today's log if exists, or empty response
    POST/PUT: Creates or updates today's log
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        today = timezone.now().date()
        try:
            log = DailyLog.objects.get(user=request.user, date=today)
            return Response(DailyLogSerializer(log).data)
        except DailyLog.DoesNotExist:
            return Response({'exists': False, 'date': today.isoformat()})
    
    def post(self, request):
        today = timezone.now().date()
        data = request.data.copy()
        data['date'] = today
        data.setdefault('logged_at', timezone.now())
        
        try:
            # Try to get existing log
            log = DailyLog.objects.get(user=request.user, date=today)
            serializer = DailyLogSerializer(log, data=data, context={'request': request})
        except DailyLog.DoesNotExist:
            # Create new log
            serializer = DailyLogSerializer(data=data, context={'request': request})
        
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request):
        return self.post(request)


# =============================================================================
# Daily Reflection Views
# =============================================================================

class DailyReflectionListView(generics.ListAPIView):
    """List user's daily reflections."""

    serializer_class = DailyReflectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = DailyReflection.objects.filter(user=self.request.user)

        date = self.request.query_params.get('date')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if date:
            queryset = queryset.filter(date=date)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset


# =============================================================================
# Daily Reflection Generate View
# =============================================================================

SYSTEM_PROMPT = """Du är en dagboksskribent som hjälper användaren att formulera sin dag i text. Du skriver på svenska.

STRIKTA REGLER:
- Du får ALDRIG hitta på händelser eller detaljer som användaren inte har angett
- Du får tolka och rama in (vila som återhämtning, tristess som lugn) men aldrig ljuga
- Inget terapispråk, inga kliniska termer, ingen "healing journey"
- Ingen toxic positivity eller påtvingad tacksamhet
- Tonen ska vara jordad, ärlig och varm - som användarens egen röst fast lite snällare
- Om dagen var tung: bevittna och validera, försök inte fixa eller peppa
- Avsluta INTE med "imorgon är en ny dag" eller liknande klyschor — det är okej att sluta utan hopp

FORMAT:
- Titel på egen rad som innehåller veckodag, datum och år plus en kort beskrivning, t.ex. "Onsdag 8 januari 2024 — en dag av vardagssysslor" (ren text, inga asterisker eller markdown)
- Blank rad efter titeln
- 3-4 stycken (inte 2)
- Totalt 180-260 ord — detta är viktigt, skriv inte för kort
- Ren text utan formatering (inga **, inga #, inga bullet points)
"""

DEVELOPER_PROMPT = """Baserat på användarens dagssnapshot, skriv en dagboksentry.

Använd den valda stilen:
- "grounded": Jordad, saklig, utan utsmyckning
- "warm": Lite varmare ton, fortfarande ärlig
- "minimal": Kortfattat, nästan telegramstil

Strukturera svaret som:
[Titel]

[Stycke 1]

[Stycke 2]

[Eventuellt stycke 3-4]

Skriv ENDAST entryn, ingen inledning eller avslutande kommentar."""


class DailyReflectionGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if anthropic is None:
            return Response(
                {'error': 'Anthropic SDK saknas på servern.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            return Response(
                {'error': 'ANTHROPIC_API_KEY saknas i servermiljön.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        payload = request.data or {}
        date_value = parse_date(payload.get('date') or '') or timezone.now().date()

        if DailyReflection.objects.filter(user=request.user, date=date_value).exists():
            return Response(
                {'detail': 'Du har redan en dagreflektion för detta datum.'},
                status=status.HTTP_409_CONFLICT
            )

        def format_scale(value, max_value):
            if value is None:
                return '–'
            return f'{value}/{max_value}'

        def join_list(values):
            return ', '.join([str(value) for value in values if value]) or 'inga angivna'

        content = payload.get('content') or {}
        mood = payload.get('mood') or {}
        daily_log = payload.get('dailyLog') or {}
        water = payload.get('water') or {}
        weather = payload.get('weather') or {}
        basics = payload.get('basics') or {}

        mood_entries = mood.get('entries') or []
        mood_entry_notes = [entry.get('note') for entry in mood_entries if entry.get('note')]

        weather_summary = ''
        if weather.get('summary') or weather.get('location') or weather.get('temperature') is not None:
            parts = []
            if weather.get('temperature') is not None:
                parts.append(f"{weather.get('temperature')}°C")
            if weather.get('summary'):
                parts.append(str(weather.get('summary')))
            if weather.get('location'):
                parts.append(f"i {weather.get('location')}")
            weather_summary = ' '.join(parts).strip()

        daily_log_lines = []
        if daily_log:
            daily_log_lines = [
                f"- Ångest: {format_scale(daily_log.get('anxiety'), 5)}",
                f"- Stress: {format_scale(daily_log.get('stress'), 5)}",
                f"- Koncentration: {format_scale(daily_log.get('concentration'), 5)}",
                f"- Energi: {format_scale(daily_log.get('energy'), 5)}",
                f"- Aptit: {format_scale(daily_log.get('appetite'), 5)}",
                f"- Sömn: {daily_log.get('sleep_hours') or '–'} timmar, kvalitet {format_scale(daily_log.get('sleep_quality'), 5)}",
            ]

        basics_list = [
            basics.get('ate') and 'åt ordentligt',
            basics.get('hydrated') and 'drack tillräckligt',
            basics.get('outside') and 'var utomhus',
            basics.get('movement') and 'rörde på sig',
            basics.get('rested') and 'vilade när det behövdes',
            basics.get('tookMedication') and 'tog medicin som planerat',
        ]

        user_message = f"""Här är dagens data:

Datum: {payload.get('date') or 'idag'}
Väder: {weather_summary or 'okänt eller ej angivet'}
Händelser: {join_list(payload.get('events') or [])}
{f"Detaljer: {content.get('details')}" if content.get('details') else ''}

Humör:
- Snitt/vald nivå: {format_scale(mood.get('score'), 10)} {f"({mood.get('label')})" if mood.get('label') else ''}
- Antal humörloggar: {mood.get('entryCount') or 0}
{f"- Noteringar från humörloggar: {join_list(mood_entry_notes)}" if mood_entry_notes else ''}
{f"- Fri text om humör: {mood.get('note')}" if mood.get('note') else ''}

{f"Hård stund: {payload.get('hardMoments')}" if payload.get('hardMoments') else ''}
{f"Hjälpsam stund: {payload.get('helpfulMoments')}" if payload.get('helpfulMoments') else ''}

{f"Daganteckning (skala 1-5):\n" + "\n".join(daily_log_lines) if daily_log_lines else "Daganteckning: inget ifyllt."}

Grunderna: {join_list(basics_list)}
Vatten: {water.get('count') or 0} av {water.get('total') or 0} glas
Andningsövning använd: {'ja' if payload.get('breathingUsed') else 'nej'}

Ton: {payload.get('tone') or 'grounded'}"""

        try:
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model='claude-sonnet-4-20250514',
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        'role': 'user',
                        'content': f"{DEVELOPER_PROMPT}\n\n{user_message}"
                    }
                ]
            )
            text_block = next((block for block in response.content if block.type == 'text'), None)
            generated_text = text_block.text if text_block else ''
            if generated_text:
                try:
                    DailyReflection.objects.create(
                        user=request.user,
                        date=date_value,
                        entry=generated_text
                    )
                except IntegrityError:
                    return Response(
                        {'detail': 'Du har redan en dagreflektion för detta datum.'},
                        status=status.HTTP_409_CONFLICT
                    )
            return Response({'entry': generated_text})
        except Exception as exc:
            return Response(
                {'error': 'Failed to generate entry', 'detail': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
