"""
Django production settings for Humörkarta.
"""
import os
import dj_database_url
from .base import *

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() == 'true'

def _csv_env(name):
    value = os.environ.get(name, '')
    return [item.strip() for item in value.split(',') if item.strip()]

ALLOWED_HOSTS = _csv_env('DJANGO_ALLOWED_HOSTS')
render_hostname = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if render_hostname:
    ALLOWED_HOSTS.append(render_hostname)

# Database - PostgreSQL in production
DATABASES = {
    'default': dj_database_url.config(
        default=None,
        conn_max_age=600,
        ssl_require=not DEBUG,
    )
}
if DATABASES['default'] is None:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }

# CORS settings
CORS_ALLOWED_ORIGINS = _csv_env('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = _csv_env('CSRF_TRUSTED_ORIGINS')

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

MIDDLEWARE = ['whitenoise.middleware.WhiteNoiseMiddleware', *MIDDLEWARE]
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
