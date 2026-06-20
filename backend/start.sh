#!/bin/sh
# Production start script (used by Railway). Local dev uses docker-compose command instead.
set -e
python manage.py collectstatic --noinput
python manage.py migrate_schemas --shared
python manage.py migrate_schemas || true
python manage.py shell < setup_prod.py || true
python manage.py shell < setup_demo.py || true
gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120
