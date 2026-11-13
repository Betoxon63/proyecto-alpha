from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from usuarios_rbac.views import LoginView, UsuarioViewSet, RolViewSet
from catalogo_inventario.views import CategoriaViewSet, UnidadMedidaViewSet, ArticuloViewSet
from compras_entidades.views import ClienteViewSet, ProveedorViewSet, FacturaViewSet
from obras_despachos.views import TipoServicioViewSet, ObraViewSet, DetalleObraViewSet
from cardex_auditoria.views import CardexViewSet, TipoMovimientoViewSet

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuarios')
router.register(r'roles', RolViewSet, basename='roles')
router.register(r'categorias', CategoriaViewSet, basename='categorias')
router.register(r'unidades-medida', UnidadMedidaViewSet, basename='unidades-medida')
router.register(r'articulos', ArticuloViewSet, basename='articulos')
router.register(r'clientes', ClienteViewSet, basename='clientes')
router.register(r'proveedores', ProveedorViewSet, basename='proveedores')
router.register(r'facturas', FacturaViewSet, basename='facturas')
router.register(r'tipos-servicio', TipoServicioViewSet, basename='tipos-servicio')
router.register(r'obras', ObraViewSet, basename='obras')
router.register(r'detalles-obra', DetalleObraViewSet, basename='detalles-obra')
router.register(r'tipos-movimiento', TipoMovimientoViewSet, basename='tipos-movimiento')
router.register(r'cardex', CardexViewSet, basename='cardex')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/', include(router.urls)),
]
