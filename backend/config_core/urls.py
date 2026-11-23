"""
Configuración global de enrutamiento y endpoints de la API (Django REST Framework).
Define las rutas para autenticación JWT, entidades del sistema y digitalización con IA.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

# Importación de controladores y ViewSets por módulo del sistema
from usuarios_rbac.views import LoginView, UsuarioViewSet, RolViewSet
from catalogo_inventario.views import CategoriaViewSet, UnidadMedidaViewSet, ArticuloViewSet
from compras_entidades.views import ClienteViewSet, ProveedorViewSet, FacturaViewSet
from compras_entidades.views_digitalizacion import DigitalizarDocumentoView
from cardex_auditoria.views import CardexViewSet
from obras_despachos.views import ObraViewSet, TipoServicioViewSet

# Router automático para los recursos CRUD de la API
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuarios')
router.register(r'roles', RolViewSet, basename='roles')
router.register(r'categorias', CategoriaViewSet, basename='categorias')
router.register(r'unidades-medida', UnidadMedidaViewSet, basename='unidades-medida')
router.register(r'articulos', ArticuloViewSet, basename='articulos')
router.register(r'clientes', ClienteViewSet, basename='clientes')
router.register(r'proveedores', ProveedorViewSet, basename='proveedores')
router.register(r'facturas', FacturaViewSet, basename='facturas')
router.register(r'cardex', CardexViewSet, basename='cardex')
router.register(r'obras', ObraViewSet, basename='obras')
router.register(r'tipos-servicio', TipoServicioViewSet, basename='tipos-servicio')

urlpatterns = [
    # Panel de administración de Django
    path('admin/', admin.site.urls),

    # Autenticación y control de sesiones mediante tokens JWT
    path('api/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),

    # Endpoint de Digitalización Inteligente de Guías y Facturas mediante IA local (Ollama)
    # Recibe la imagen en base64 desde la cámara o archivo y retorna los datos estructurados en JSON
    path('api/digitalizacion/analizar/', DigitalizarDocumentoView.as_view(), name='digitalizar_documento'),

    # Endpoints REST generados por el router para todas las entidades
    path('api/', include(router.urls)),
]

# Servidor de archivos multimedia de respaldo físico en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
