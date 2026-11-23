import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv

# Carga los datos de configuración guardados en el archivo .env.
load_dotenv()

# Ruta inicial del proyecto.
BASE_DIR = Path(__file__).resolve().parent.parent

# Clave de seguridad y modo de prueba.
SECRET_KEY = os.environ.get('SECRET_KEY', 'clave-secreta-desarrollo-proyecto-alpha-fyag-2026')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# Direcciones permitidas para conectarse al servidor.
ALLOWED_HOSTS = ['*']

# Módulos activos del sistema.
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Herramientas externas.
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    # Módulos del sistema FYAG.
    'usuarios_rbac',
    'catalogo_inventario',
    'compras_entidades',
    'obras_despachos',
    'cardex_auditoria.apps.CardexAuditoriaConfig',
]

# Filtros de seguridad para las peticiones que llegan al servidor.
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config_core.wsgi.application'

# Conexión a la base de datos en Supabase.
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=0,
    )
}

# Memoria temporal para contar intentos fallidos el iniciar sesión.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-alpha-security-cache',
    }
}

# Tabla principal de trabajadores del sistema.
AUTH_USER_MODEL = 'usuarios_rbac.Usuario'

# Sistema de protección de contraseñas.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]

# Exige que el trabajador haya iniciado sesión para usar el sistema.
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    )
}

# Duración de la sesión activa (15 minutos sin uso y 8 horas de jornada).
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=8),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id_usuario',
    'USER_ID_CLAIM': 'user_id',
}

# Permisos de conexión entre la pantalla web y el servidor.
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_CREDENTIALS = True

cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]

# Protección adicional para el navegador.
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Idioma y zona horaria en Chile.
LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Archivo donde se guardan los avisos de seguridad y accesos rechazados.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'auditoria_fmt': {
            'format': '[{asctime}] {levelname} | {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'auditoria_fmt',
        },
        'archivo_auditoria': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'auditoria_seguridad.log',
            'formatter': 'auditoria_fmt',
        },
    },
    'loggers': {
        'auditoria_alpha': {
            'handlers': ['console', 'archivo_auditoria'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
