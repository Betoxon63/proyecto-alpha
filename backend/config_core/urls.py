<<<<<<< HEAD
"""
URL configuration for config_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
]
=======
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from usuarios_rbac.views import LoginView, UsuarioViewSet, RolViewSet
from catalogo_inventario.views import CategoriaViewSet, UnidadMedidaViewSet, ArticuloViewSet
from compras_entidades.views import ClienteViewSet, ProveedorViewSet
from cardex_auditoria.views import CardexViewSet

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuarios')
router.register(r'roles', RolViewSet, basename='roles')
router.register(r'categorias', CategoriaViewSet, basename='categorias')
router.register(r'unidades-medida', UnidadMedidaViewSet, basename='unidades-medida')
router.register(r'articulos', ArticuloViewSet, basename='articulos')
router.register(r'clientes', ClienteViewSet, basename='clientes')
router.register(r'proveedores', ProveedorViewSet, basename='proveedores')
router.register(r'cardex', CardexViewSet, basename='cardex')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/', include(router.urls)),
]
>>>>>>> c655e6916b0cda5c9573a4e770885e7deb67bb33
