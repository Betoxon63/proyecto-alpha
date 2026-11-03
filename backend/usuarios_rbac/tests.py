from django.test import TestCase
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError

from usuarios_rbac.models import Rol, Usuario
from usuarios_rbac.validators import validar_rut
from catalogo_inventario.models import Categoria, UnidadMedida, Articulo
from catalogo_inventario.serializers import ArticuloSerializer
from cardex_auditoria.models import TipoMovimiento, MovimientoArticulo


class Tests(TestCase):
    def setUp(self):
        self.rol_admin, _ = Rol.objects.get_or_create(nombre=Rol.ADMIN)
        self.usuario = Usuario.objects.create_user(
            correo_electronico = 'admin_test@fyag.cl',
            nombre = 'Admin Prueba',
            rut = '11111111-1',
            password = 'PasswordSegura123',
            id_rol = self.rol_admin
        )
        self.categoria = Categoria.objects.create(nombre='Refrigeracion')
        self.unidad = UnidadMedida.objects.create(nombre='Unidad')

    def test_rut(self):
        self.assertEqual(validar_rut('11.111.111-1'), '11111111-1')
        with self.assertRaises(ValidationError):
            validar_rut('11.111.111-9')

    def test_stock_precio(self):
        datos_invalidos = {
            'codigo_barra': 780123456,
            'nombre': 'Compresor Danfoss',
            'id_categoria': self.categoria.id_categoria,
            'id_unidad_medida': self.unidad.id_unidad_medida,
            'ubicacion': 'Pasillo A1',
            'stock_disponible': -5,
            'stock_minimo': 2,
            'stock_comprometido': 0,
            'precio': -1000,
        }
        serializer = ArticuloSerializer(data=datos_invalidos)
        self.assertFalse(serializer.is_valid())

    def test_cardex(self):
        articulo = Articulo.objects.create(
            codigo_barra = 780999888,
            nombre = 'Gas R410a',
            id_categoria = self.categoria,
            id_unidad_medida = self.unidad,
            ubicacion ='Bodega Central',
            stock_disponible = 10,
            stock_minimo = 2,
            stock_comprometido = 0,
            precio = 45000
        )
        tipo_mov = TipoMovimiento.objects.create(nombre='Ingreso Inicial')
        movimiento = MovimientoArticulo.objects.create(
            id_articulo = articulo,
            id_usuario = self.usuario,
            id_tipo_movimiento = tipo_mov,
            cantidad = 10,
            motivo = 'Carga inicial'
        )

        movimiento.cantidad = 20
        with self.assertRaises(PermissionDenied):
            movimiento.save()

        with self.assertRaises(PermissionDenied):
            movimiento.delete()

