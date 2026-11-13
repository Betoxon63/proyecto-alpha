from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from usuarios_rbac.models import Rol, Usuario
from catalogo_inventario.models import Categoria, UnidadMedida, Articulo
from .models import TipoMovimiento, MovimientoArticulo


class CardexAuditoriaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.rol_bodega, _ = Rol.objects.get_or_create(nombre=Rol.BODEGA)
        self.rol_finanzas, _ = Rol.objects.get_or_create(nombre=Rol.FINANZAS)
        self.rol_supervisor, _ = Rol.objects.get_or_create(nombre=Rol.SUPERVISOR)

        self.bodega_user = Usuario.objects.create_user(
            correo_electronico='bodega_cardex@fyag.cl',
            nombre='Carlos Munoz',
            rut='77777777-7',
            password='ClaveSegura2026!',
            id_rol=self.rol_bodega,
        )
        self.finanzas_user = Usuario.objects.create_user(
            correo_electronico='finanzas_cardex@fyag.cl',
            nombre='Rodrigo Ide',
            rut='88888888-8',
            password='ClaveSegura2026!',
            id_rol=self.rol_finanzas,
        )
        self.supervisor_user = Usuario.objects.create_user(
            correo_electronico='sup_cardex@fyag.cl',
            nombre='Javier Soto',
            rut='99999999-9',
            password='ClaveSegura2026!',
            id_rol=self.rol_supervisor,
        )

        self.categoria = Categoria.objects.create(nombre='Repuestos')
        self.unidad = UnidadMedida.objects.create(nombre='Unidad')
        self.articulo = Articulo.objects.create(
            codigo_barra=780654987321,
            nombre='Filtro Deshidratador',
            id_categoria=self.categoria,
            id_unidad_medida=self.unidad,
            ubicacion='Pasillo C',
            stock_disponible=8,
            stock_minimo=3,
            stock_comprometido=0,
            precio=14500,
        )

    def test_append_only_bloquea_put_patch_delete(self):
        """ Verifica HU-11: PUT, PATCH y DELETE en /api/cardex/ retornan HTTP 405. """
        self.client.force_authenticate(user=self.bodega_user)
        res_post = self.client.post('/api/cardex/', {
            'id_articulo': self.articulo.id_articulo,
            'tipo_movimiento_nombre': 'Merma',
            'cantidad': 2,
            'motivo': '(MR-001) Daño durante descarga en bodega',
        }, format='json')

        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)
        mov_id = res_post.data['id_movimiento_articulo']
        self.assertEqual(res_post.data['cantidad'], -2)

        self.articulo.refresh_from_db()
        self.assertEqual(self.articulo.stock_disponible, 6)

        url_detalle = f'/api/cardex/{mov_id}/'
        self.assertEqual(self.client.put(url_detalle, {}, format='json').status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.patch(url_detalle, {}, format='json').status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(url_detalle).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_rbac_cardex_por_rol(self):
        """ Finanzas solo lectura (GET 200, POST 403) y Supervisor denegado (403). """
        self.client.force_authenticate(user=self.finanzas_user)
        self.assertEqual(self.client.get('/api/cardex/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post('/api/cardex/', {}, format='json').status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.supervisor_user)
        self.assertEqual(self.client.get('/api/cardex/').status_code, status.HTTP_403_FORBIDDEN)
