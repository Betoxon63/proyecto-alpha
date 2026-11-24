from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


# Define los cargos para los trabajadores de FYAG.
class Rol(models.Model):
    ADMIN = 'administracion'
    SOPORTE_TI = 'soporte_ti'
    FINANZAS = 'encargado_finanza'
    BODEGA = 'encargado_bodega'
    SUPERVISOR = 'supervisor_obra'

    ROLES_CHOICES = [
        (ADMIN, 'Administrador del Sistema'),
        (SOPORTE_TI, 'Soporte Técnico'),
        (FINANZAS, 'Encargado de Finanzas'),
        (BODEGA, 'Encargado de Bodega'),
        (SUPERVISOR, 'Supervisor de Obras'),
    ]

    id_rol = models.AutoField(primary_key=True)
    nombre = models.TextField(choices=ROLES_CHOICES, unique=True)

    class Meta:
        db_table = 'rol'

    def __str__(self):
        return self.nombre


# Función encargadas de crear cuentas de trabajadores en el sistema.
class UsuarioManager(BaseUserManager):
    # Crea una cuenta normal de trabajador.
    def create_user(self, correo_electronico, nombre, rut, password=None, **extra_fields):
        if not correo_electronico:
            raise ValueError('El trabajador debe tener un correo electrónico.')

        # Convierte el correo a minúsculas.
        correo_electronico = self.normalize_email(correo_electronico).strip().lower()
        user = self.model(
            correo_electronico=correo_electronico,
            nombre=nombre,
            rut=rut,
            **extra_fields
        )
        # Encripta la contraseña antes de guardarla.
        user.set_password(password)
        user.save(using=self._db)
        return user

    # Crea una cuenta con permisos totales desde la consola de Django, asignándole el cargo de Administrador.
    def create_superuser(self, correo_electronico, nombre, rut, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        rol_admin, _ = Rol.objects.get_or_create(nombre=Rol.ADMIN)
        extra_fields.setdefault('id_rol', rol_admin)
        return self.create_user(correo_electronico, nombre, rut, password, **extra_fields)


# Tabla principal de trabajadores. Usa el correo electrónico en lugar de un nombre de usuario tradicional.
class Usuario(AbstractBaseUser, PermissionsMixin):
    id_usuario = models.AutoField(primary_key=True)
    nombre = models.TextField()
    rut = models.TextField(unique=True)
    correo_electronico = models.EmailField(unique=True)
    password = models.TextField(db_column='contraseña')
    telefono = models.IntegerField(null=True, blank=True)
    id_rol = models.ForeignKey(Rol, on_delete=models.PROTECT, db_column='id_rol')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    # Define el correo electrónico como el dato principal para iniciar sesión.
    USERNAME_FIELD = 'correo_electronico'
    REQUIRED_FIELDS = ['nombre', 'rut']

    class Meta:
        db_table = 'usuarios'

    def __str__(self):
        return f"{self.nombre} ({self.rut})"
