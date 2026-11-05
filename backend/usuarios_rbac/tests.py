from django.test import TestCase
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status

from usuarios_rbac.models import Rol, Usuario
from usuarios_rbac.validators import validar_rut
from catalogo_inventario.models import Categoria, UnidadMedida, Articulo
from catalogo_inventario.serializers import ArticuloSerializer
from cardex_auditoria.models import TipoMovimiento, MovimientoArticulo


class LoginSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url_login = '/api/token/'
        self.url_refresh = '/api/token/refresh/'
        self.url_logout = '/api/token/logout/'
        self.url_usuarios = '/api/usuarios/'

        self.rol_admin, _ = Rol.objects.get_or_create(nombre=Rol.ADMIN)
        self.rol_bodega, _ = Rol.objects.get_or_create(nombre=Rol.BODEGA)

        self.admin_user = Usuario.objects.create_user(
            correo_electronico='admin_seguridad@fyag.cl',
            nombre='Administrador FYAG',
            rut='11111111-1',
            password='ClaveSegura2026!',
            id_rol=self.rol_admin
        )

        self.bodega_user = Usuario.objects.create_user(
            correo_electronico='bodega_seguridad@fyag.cl',
            nombre='Bodeguero FYAG',
            rut='22222222-2',
            password='ClaveBodega2026!',
            id_rol=self.rol_bodega
        )

    def tearDown(self):
        cache.clear()

    def test_encriptacion_password(self):
        """ Verifica que la contraseña esté encriptada con PBKDF2 y no en texto plano. """
        self.assertNotEqual(self.admin_user.password, 'ClaveSegura2026!')
        self.assertTrue(self.admin_user.password.startswith('pbkdf2_sha256$'))

    def test_datos_inexistentes(self):
        """ Verifica que correo inexistente y clave errónea entreguen el mismo mensaje 401. """
        res_inexistente = self.client.post(self.url_login, {
            'correo_electronico': 'noexiste@fyag.cl',
            'password': 'ClaveCualquiera123'
        }, format='json')

        res_clave_erronea = self.client.post(self.url_login, {
            'correo_electronico': 'admin_seguridad@fyag.cl',
            'password': 'ClaveIncorrecta666'
        }, format='json')

        self.assertEqual(res_inexistente.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_clave_erronea.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_inexistente.data['detail'], res_clave_erronea.data['detail'])

    def test_inyeccion_sql(self):
        """ Verifica que intentos de inyección SQL en el login sean rechazados. """
        payload_sqli = "' OR 1=1; DROP TABLE usuarios; --"
        response = self.client.post(self.url_login, {
            'correo_electronico': payload_sqli,
            'password': '123456'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Usuario.objects.filter(correo_electronico='admin_seguridad@fyag.cl').exists())

    def test_bloqueo(self):
        """ Bloqueo tras 5 intentos fallidos. """
        datos_fallidos = {
            'correo_electronico': 'admin_seguridad@fyag.cl',
            'password': 'PasswordErronea'
        }

        for _ in range(5):
            res = self.client.post(self.url_login, datos_fallidos, format='json')
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # El sexto intento debe activar el bloqueo por 10 minutos (HTTP 429).
        res_bloqueo = self.client.post(self.url_login, datos_fallidos, format='json')
        self.assertEqual(res_bloqueo.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # Si ingresa la contraseña correcta estando bloqueado se mantiene el bloqueo.
        res_clave =self.client.post(self.url_login, {
            'correo_electronico': 'admin_seguridad@fyag.cl',
            'password': 'ClaveSegura2026!'
        }, format='json')
        self.assertEqual(res_clave.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_control_acceso(self):
        """ Bloquea anónimos con 401 y rol Bodega en módulo de usuarios con 403. """
        # Usuario no autenticado (401).
        res_anonimo = self.client.get(self.url_usuarios)
        self.assertEqual(res_anonimo.status_code, status.HTTP_401_UNAUTHORIZED)

        # Usuario con rol Bodega en gestión de usuarios (403).
        login_bodega = self.client.post(self.url_login, {
            'correo_electronico': 'bodega_seguridad@fyag.cl',
            'password': 'ClaveBodega2026!'
        }, format='json')
        token_bodega = login_bodega.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_bodega}')
        res_prohibido = self.client.get(self.url_usuarios)
        self.assertEqual(res_prohibido.status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_blacklist(self):
        """ Verifica que al cerrar sesión el Refresh Token pase a la Blacklist. """
        login_res = self.client.post(self.url_login, {
            'correo_electronico': 'admin_seguridad@fyag.cl',
            'password': 'ClaveSegura2026!'
        }, format='json')
        refresh_token = login_res.data['refresh']

        # Enviar token a la lista negra (Logout).
        logout_res = self.client.post(self.url_logout, {'refresh': refresh_token}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Intentar usar el mismo Refresh Token después del logout.
        reuso_res = self.client.post(self.url_refresh, {'refresh': refresh_token}, format='json')
        self.assertEqual(reuso_res.status_code, status.HTTP_401_UNAUTHORIZED)
