# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Humörkarta (Mood Map) is a personal mood tracking application with a decoupled architecture:

- **Frontend:** SvelteKit with DaisyUI (Tailwind CSS)
- **Backend:** Django 6.0 REST API with Django REST Framework
- **Database:** PostgreSQL (production) / SQLite (development)

The `_reference-project/` folder contains a complete React implementation for reference. **Do not modify files in `_reference-project/`** - it serves as a functional specification.

**Core Philosophy:** Help users reduce uncertainty during difficult periods by visualizing mood patterns and providing historical context ("Du har klarat det förut. Du kommer klara det igen.").

## Development Commands

### Backend (Django)

```bash
cd backend
conda create -n moodmap python=3.12  # if needed
conda activate moodmap
pip install -r requirements.txt

# Database setup
python manage.py makemigrations users moods
python manage.py migrate
python manage.py createsuperuser

# Development server (port 8000)
python manage.py runserver

# Testing
python manage.py test
python manage.py test apps.moods.tests.test_models  # Single module

```

### Frontend (SvelteKit)

```bash
cd frontend
npm install
npm run dev      # Development server (port 5173)
npm run build    # Production build
npm run preview  # Preview production build
```

### Running Both

Two terminal windows required:

```bash
# Terminal 1 - Backend
cd backend && conda activate moodmap && python manage.py runserver

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

## Architecture

### Data Models

1. **MoodEntry** - Atomic mood measurement (1-10 scale, timestamp, optional note/tags)
2. **DailyAggregate** - Pre-calculated daily summaries (auto-updated on entry save/delete)
3. **Tag** - User-specific tags for categorizing entries
4. **User** - Custom model with email as identifier

### API Endpoints

All endpoints under `/api/`:

Auth endpoints are stubbed initially and return `501 Not Implemented` until authentication is wired up.

| Endpoint                 | Methods        | Description                                        |
| ------------------------ | -------------- | -------------------------------------------------- |
| `/api/auth/register/`    | POST           | Create account (stubbed)                           |
| `/api/auth/login/`       | POST           | Get auth token (stubbed)                           |
| `/api/auth/logout/`      | POST           | Invalidate token (stubbed)                         |
| `/api/auth/me/`          | GET/PUT        | User profile (stubbed)                             |
| `/api/entries/`          | GET/POST       | List/create mood entries                           |
| `/api/entries/<id>/`     | GET/PUT/DELETE | Entry detail                                       |
| `/api/tags/`             | GET/POST       | List/create tags                                   |
| `/api/tags/<id>/`        | GET/PUT/DELETE | Tag detail                                         |
| `/api/graph/`            | GET            | Aggregated graph data (?view=week&date=2025-01-15) |

### Graph Views

- **Dag (Day):** Individual entries for single day
- **Vecka (Week):** Daily averages for 7 days
- **Månad (Month):** Daily averages for entire month
- **År (Year):** Monthly averages for entire year

## Language

Primary UI language is **Swedish (sv-SE)**. Key terms:

- Mitt Humör (My Mood / New entry button)
- Dag/Vecka/Månad/År (Day/Week/Month/Year)
- Humörnivå (Mood level)
- Väldigt låg → Neutral → Väldigt bra (Very low → Neutral → Very good)

## Core Principles

1. **Gentleness First** - Supportive, never judgmental; no guilt for missed entries
2. **Privacy as Foundation** - No third-party analytics on mood data
3. **Hope Through Evidence** - Build resilience through historical context
4. **Accessibility** - Usable during low-energy moments; the graph is the hero

## Key Implementation Notes

- Authentication and token handling are planned; auth endpoints are stubbed initially
- CORS configured for frontend origin
- User data deletion cascades to all related records
- DailyAggregate auto-calculation is planned for entry save/delete
- Vite/SvelteKit proxy forwards /api requests to Django
