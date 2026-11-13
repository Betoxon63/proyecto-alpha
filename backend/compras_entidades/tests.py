from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from usuarios_rbac.models import Rol, Usuario
from catalogo_inventario.models import Categoria, UnidadMedida, Articulo
from cardex_auditoria.models import MovimientoArticulo
from .models import Proveedor, Factura


class FacturasComprasTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.rol_finanzas, _ = Rol.objects.get_or_create(nombre=Rol.FINANZAS)
        self.rol_supervisor, _ = Rol.objects.get_or_create(nombre=Rol.SUPERVISOR)

        self.finanzas_user = Usuario.objects.create_user(
            correo_electronico='finanzas@fyag.cl',
            nombre='Encargado Finanzas',
            rut='55555555-5',
            password='ClaveSegura2026!',
            id_rol=self.rol_finanzas,
        )
        self.supervisor_user = Usuario.objects.create_user(
            correo_electronico='sup_facturas@fyag.cl',
            nombre='Supervisor Facturas',
            rut='66666666-6',
            password='ClaveSegura2026!',
            id_rol=self.rol_supervisor,
        )

        self.proveedor = Proveedor.objects.create(
            rut='76432198-5',
            razon_social='Refrigeracion Industrial Chile Ltda',
            direccion='Av Industrial 500',
            region='Biobio',
            comuna='Concepcion',
            ciudad='Concepcion',
        )
        self.categoria = Categoria.objects.create(nombre='Gases')
        self.unidad = UnidadMedida.objects.create(nombre='Cilindro')
        self.articulo = Articulo.objects.create(
            codigo_barra=780987654321,
            nombre='Gas R-410a',
            id_categoria=self.categoria,
            id_unidad_medida=self.unidad,
            ubicacion='Sector Gases',
            stock_disponible=5,
            stock_minimo=2,
            stock_comprometido=0,
            precio=10000,
        )

    def test_crear_factura_tres_descuentos_sucesivos(self):
        """ Verifica HU-08 / CP-04: 3 descuentos sucesivos, IVA 19%, incremento de stock y Cardex. """
        self.client.force_authenticate(user=self.finanzas_user)
        res = self.client.post('/api/facturas/', {
            'numero_documento': 99412,
            'id_proveedor': self.proveedor.id_proveedor,
            'observaciones': 'Reposicion programada',
            'descuento_1': 10,
            'descuento_2': 5,
            'descuento_3': 0,
            'detalles': [
                {
                    'id_articulo': self.articulo.id_articulo,
                    'cantidad': 10,
                    'precio_unitario': 10000,
                }
            ],
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Bruto = 100.000 -> -10% = 90.000 -> -5% = 85.500 -> +19% IVA (16.245) = 101.745
        factura = Factura.objects.get(numero_documento=99412)
        self.assertEqual(factura.total, 101745)

        self.articulo.refresh_from_db()
        self.assertEqual(self.articulo.stock_disponible, 15)
        self.assertTrue(MovimientoArticulo.objects.filter(id_articulo=self.articulo, cantidad=10).exists())

    def test_supervisor_bloqueado_en_facturas(self):
        """ Supervisor no tiene acceso al módulo de facturas (HTTP 403). """
        self.client.force_authenticate(user=self.supervisor_user)
        res = self.client.get('/api/facturas/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
