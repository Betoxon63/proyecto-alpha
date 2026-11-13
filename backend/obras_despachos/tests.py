from datetime import date
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from usuarios_rbac.models import Rol, Usuario
from catalogo_inventario.models import Categoria, UnidadMedida, Articulo
from compras_entidades.models import Cliente
from cardex_auditoria.models import MovimientoArticulo
from .models import TipoServicio, Obra, DetalleObra


class ObrasDespachosTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.rol_bodega, _ = Rol.objects.get_or_create(nombre=Rol.BODEGA)
        self.rol_supervisor, _ = Rol.objects.get_or_create(nombre=Rol.SUPERVISOR)

        self.bodega_user = Usuario.objects.create_user(
            correo_electronico='bodega_obras@fyag.cl',
            nombre='Bodeguero Obras',
            rut='33333333-3',
            password='ClaveSegura2026!',
            id_rol=self.rol_bodega,
        )
        self.supervisor_user = Usuario.objects.create_user(
            correo_electronico='supervisor_obras@fyag.cl',
            nombre='Supervisor Terreno',
            rut='44444444-4',
            password='ClaveSegura2026!',
            id_rol=self.rol_supervisor,
        )

        self.cliente = Cliente.objects.create(
            rut='76890123-4',
            razon_social='Agricola del Sur SA',
            giro_comercial='Fruticola',
            direccion='Camino Viejo 123',
            region='Nuble',
            comuna='Chillan Viejo',
            ciudad='Chillan Viejo',
            nombre_representante='Juan Perez',
            rut_representante='11111111-1',
        )
        self.tipo_servicio = TipoServicio.objects.create(nombre='Camara de Frio')
        self.obra = Obra.objects.create(
            fecha_inicio=date(2026, 11, 1),
            id_cliente=self.cliente,
            tecnico_asociado='Javier Soto',
            id_tipo_servicio=self.tipo_servicio,
            estado='Activa',
        )

        self.categoria = Categoria.objects.create(nombre='Tuberias')
        self.unidad = UnidadMedida.objects.create(nombre='Metros')
        self.articulo = Articulo.objects.create(
            codigo_barra=780123456789,
            nombre='Tubo de cobre 1/2',
            id_categoria=self.categoria,
            id_unidad_medida=self.unidad,
            ubicacion='Pasillo B',
            stock_disponible=10,
            stock_minimo=3,
            stock_comprometido=0,
            precio=8500,
        )

    def test_despacho_obra_descuenta_stock_y_registra_cardex(self):
        """ Despachar a obra descuenta stock, crea DetalleObra y registra salida en Cardex. """
        self.client.force_authenticate(user=self.bodega_user)
        url = f'/api/obras/{self.obra.id_obra}/despachar/'
        res = self.client.post(url, {
            'id_articulo': self.articulo.id_articulo,
            'cantidad': 4,
            'documento_respaldo': 'GD-001540',
            'tecnico_receptor': 'Javier Soto',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.articulo.refresh_from_db()
        self.assertEqual(self.articulo.stock_disponible, 6)
        self.assertTrue(DetalleObra.objects.filter(id_obra=self.obra, cantidad=4).exists())
        self.assertTrue(MovimientoArticulo.objects.filter(id_obra=self.obra, cantidad=-4).exists())

    def test_despacho_sin_stock_retorna_409(self):
        """ Intentar despachar más unidades que el stock disponible retorna HTTP 409. """
        self.client.force_authenticate(user=self.bodega_user)
        url = f'/api/obras/{self.obra.id_obra}/despachar/'
        res = self.client.post(url, {
            'id_articulo': self.articulo.id_articulo,
            'cantidad': 50,
            'motivo': 'Solicitud excesiva',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.articulo.refresh_from_db()
        self.assertEqual(self.articulo.stock_disponible, 10)

    def test_supervisor_solo_lectura_obras(self):
        """ Supervisor puede consultar obras (200) pero no crear ni despachar (403). """
        self.client.force_authenticate(user=self.supervisor_user)
        res_get = self.client.get('/api/obras/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

        res_post = self.client.post(f'/api/obras/{self.obra.id_obra}/despachar/', {
            'id_articulo': self.articulo.id_articulo,
            'cantidad': 1,
        }, format='json')
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)
