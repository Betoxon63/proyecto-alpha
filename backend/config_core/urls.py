import os
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from usuarios_rbac.views import LoginView, UsuarioViewSet, RolViewSet
from catalogo_inventario.views import CategoriaViewSet, UnidadMedidaViewSet, ArticuloViewSet
from compras_entidades.views import ClienteViewSet, ProveedorViewSet, FacturaViewSet
from cardex_auditoria.views import CardexViewSet
from obras_despachos.views import ObraViewSet, TipoServicioViewSet

# Enrutador central que crea automáticamente las direcciones web para cada uno de los módulos de negocio del sistema.
router = DefaultRouter()

# Módulo de Personal y Cargos.
router.register(r'usuarios', UsuarioViewSet, basename='usuarios')
router.register(r'roles', RolViewSet, basename='roles')

# Módulo de Catálogo e Inventario de Bodega.
router.register(r'categorias', CategoriaViewSet, basename='categorias')
router.register(r'unidades-medida', UnidadMedidaViewSet, basename='unidades-medida')
router.register(r'articulos', ArticuloViewSet, basename='articulos')

# Módulo Comercial y Compras.
router.register(r'clientes', ClienteViewSet, basename='clientes')
router.register(r'proveedores', ProveedorViewSet, basename='proveedores')
router.register(r'facturas', FacturaViewSet, basename='facturas')

# Módulo de Historial General de Movimientos (Cardex).
router.register(r'cardex', CardexViewSet, basename='cardex')

# Módulo de Obras, Proyectos y Tipos de Servicio.
router.register(r'obras', ObraViewSet, basename='obras')
router.register(r'tipos-servicio', TipoServicioViewSet, basename='tipos-servicio')

# Permite ocultar o cambiar la ruta del panel interno de Django en producción mediante .env.
RUTA_ADMIN = os.environ.get('DJANGO_ADMIN_URL', 'admin/')

urlpatterns = [
    # Panel interno de administración de Django.
    path(RUTA_ADMIN, admin.site.urls),

    # Rutas de inicio de sesión, renovación de sesión y cierre seguro.
    path('api/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),

    # Todas las rutas de los módulos del sistema bajo el prefijo /api/.
    path('api/', include(router.urls)),
]