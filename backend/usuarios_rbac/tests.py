from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from usuarios_rbac.models import Rol, Usuario

# Pruebas de seguridad en inicio de sesión y seguridad para la gestión de usuarios.
class PruebasSeguridadUsuarios(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url_login = '/api/token/'
        self.url_refresh = '/api/token/refresh/'
        self.url_logout = '/api/token/logout/'
        self.url_usuarios = '/api/usuarios/'

        self.rol_admin, _ = Rol.objects.get_or_create(nombre=Rol.ADMIN)
        self.rol_soporte, _ = Rol.objects.get_or_create(nombre=Rol.SOPORTE_TI)
        self.rol_bodega, _ = Rol.objects.get_or_create(nombre=Rol.BODEGA)

        self.admin_user = Usuario.objects.create_user(
            correo_electronico='admin_seguridad@fyag.cl',
            nombre='Administrador FYAG',
            rut='11111111-1',
            password='ClaveSegura2026!',
            id_rol=self.rol_admin
        )

        self.soporte_user = Usuario.objects.create_user(
            correo_electronico='soporte@fyag.cl',
            nombre='Soporte Técnico FYAG',
            rut='33333333-3',
            password='ClaveSoporte2026!',
            id_rol=self.rol_soporte
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

    # Comprueba que la contraseña se guarde protegida y no como texto visible.
    def test_proteccion_password(self):
        self.assertNotEqual(self.admin_user.password, 'ClaveSegura2026!')
        self.assertTrue(self.admin_user.password.startswith('pbkdf2_sha256$'))

    # Comprueba que un correo no registrado y una clave equivocada muestren el mismo aviso.
    def test_datos_inexistentes(self):
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

    # Comprueba que textos maliciosos en el inicio de sesión sean reachazados sin dañar la tabla.
    def test_inyeccion_sql(self):
        payload_sqli = "' OR 1=1; DROP TABLE usuarios; --"
        response = self.client.post(self.url_login, {
            'correo_electronico': payload_sqli,
            'password': '123456'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Usuario.objects.filter(correo_electronico='admin_seguridad@fyag.cl').exists())

    # Comprueba que la cuenta se bloquee temporalmente tras 5 intentos fallidos.
    def test_bloqueo_intentos_fallidos(self):
        datos_fallidos = {
            'correo_electronico': 'admin_seguridad@fyag.cl',
            'password': 'PasswordErronea'
        }

        for _ in range(5):
            res = self.client.post(self.url_login, datos_fallidos, format='json')
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # El sexto intento activa el bloqueo por 10 minutos (429).
        res_bloqueo = self.client.post(self.url_login, datos_fallidos, format='json')
        self.assertEqual(res_bloqueo.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # Aunque escriba la contraseña correcta mientras está bloqueado, se mantiene el bloqueo.
        res_clave = self.client.post(self.url_login, {
            'correo_electronico': 'admin_seguridad@fyag.cl',
            'password': 'ClaveSegura2026!'
        }, format='json')
        self.assertEqual(res_clave.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    # Comprueba que Soporte Técnico pueda gestionar trabajadores y Bodega tenga el paso bloqueado.
    def test_control_acceso_por_cargo(self):
        # Sin iniciar sesión se rechaza el acceso (401).
        res_anonimo = self.client.get(self.url_usuarios)
        self.assertEqual(res_anonimo.status_code, status.HTTP_401_UNAUTHORIZED)

        # Cargo Bodega no puede entrar a la sección de trabajadores (403).
        login_bodega = self.client.post(self.url_login, {
            'correo_electronico': 'bodega_seguridad@fyag.cl',
            'password': 'ClaveBodega2026!'
        }, format='json')
        token_bodega = login_bodega.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_bodega}')
        res_prohibido = self.client.get(self.url_usuarios)
        self.assertEqual(res_prohibido.status_code, status.HTTP_403_FORBIDDEN)

        # Cargo Bodega no puede entrar a la sección de trabajadores (403).
        login_soporte = self.client.post(self.url_login, {
            'correo_electronico': 'soporte@fyag.cl',
            'password': 'ClaveSoporte2026!'
        }, format='json')
        token_soporte = login_soporte.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_soporte}')
        res_soporte = self.client.get(self.url_usuarios)
        self.assertEqual(res_soporte.status_code, status.HTTP_200_OK)

    # Comprueba que al cerrar sesión ya no se pueda reutilizar el pase de acceso.
    def test_cierre_sesion(self):
        login_res = self.client.post(self.url_login, {
            'correo_electronico': 'admin_seguridad@fyag.cl',
            'password': 'ClaveSegura2026!'
        }, format='json')
        refresh_token = login_res.data['refresh']

        # Cerrar sesión.
        logout_res = self.client.post(self.url_logout, {'refresh': refresh_token}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Intentar renovar sesión después de haber salido debe ser rechazado (401).
        reuso_res = self.client.post(self.url_refresh, {'refresh': refresh_token}, format='json')
        self.assertEqual(reuso_res.status_code, status.HTTP_401_UNAUTHORIZED)
