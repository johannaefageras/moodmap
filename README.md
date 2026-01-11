# Mood Map (SvelteKit + Django)

A personal mood tracking application that helps you log daily moods, spot patterns, and review insights over time. The frontend is built with SvelteKit + DaisyUI (Tailwind) and the backend is Django + DRF.

## Features

- Quick mood logging
- Mood visualizations across day/week/month/year
- Tags and metadata for entries
- User authentication and profiles
- Privacy-first local data storage

## Tech Stack

- Frontend: SvelteKit, Tailwind CSS, DaisyUI
- Backend: Django, Django REST Framework
- Database: SQLite (dev) / PostgreSQL (prod)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend setup

```bash
cd backend
conda create -n moodmap python=3.12
conda activate moodmap
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations users moods
python manage.py migrate
python manage.py createsuperuser
```

### Backend environment variables

`backend/.env` is ignored by Git. Use `backend/.env.example` as a template.

| Variable            | Description                  |
| ------------------- | ---------------------------- |
| ANTHROPIC_API_KEY   | API key for Anthropic access |

### Frontend setup

```bash
cd frontend
npm install
```

### Frontend environment variables

If you add frontend env vars, place them in `frontend/.env` and mirror them in `frontend/.env.example`.

### Running the app

Use two terminals:

```bash
# Terminal 1 - Backend (port 8000)
cd backend
conda activate moodmap
python manage.py runserver

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173

## Project Structure

```
moodmap/
├── backend/           # Django REST API
│   ├── apps/
│   │   ├── users/     # Auth & user management
│   │   └── moods/     # Mood entries, tags, aggregates
│   └── config/        # Django settings
├── frontend/          # SvelteKit app
│   ├── src/
│   ├── static/
│   └── ...
```

## API Endpoints

Auth endpoints are stubbed initially and return `501 Not Implemented` until authentication is wired up.

| Method   | Endpoint                | Description              |
| -------- | ----------------------- | ------------------------ |
| POST     | `/api/auth/register/`   | Create account           |
| POST     | `/api/auth/login/`      | Get auth token           |
| POST     | `/api/auth/logout/`     | Invalidate token         |
| GET/PUT  | `/api/auth/me/`         | User profile             |
| GET/POST | `/api/entries/`         | List/create mood entries |
| GET      | `/api/graph/?view=week` | Graph data               |
| GET/POST | `/api/tags/`            | List/create tags         |

## Tests

```bash
cd backend
python manage.py test
```

## Deployment notes

- Development uses SQLite; configure PostgreSQL for production.
- Keep secrets in `backend/.env` (or deployment-specific environment variables).

## License

MIT

## Contributing

This is a personal project, but feel free to open issues or PRs.
