from django.db import models
from catalogo_inventario.models import Articulo
from usuarios_rbac.models import Usuario


# Ficha comercial y tributaria de cada empresa cliente mandante de FYAG.
class Cliente(models.Model):
    id_cliente = models.AutoField(primary_key=True)
    rut = models.TextField(unique=True)
    razon_social = models.TextField()
    giro_comercial = models.TextField()
    direccion = models.TextField()
    region = models.TextField()
    comuna = models.TextField()
    ciudad = models.TextField()
    nombre_representante = models.TextField()
    rut_representante = models.TextField()

    class Meta:
        db_table = 'cliente'

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"


# Ficha comercial y tributaria de las empresas proveedoras de materiales y repuestos.
class Proveedor(models.Model):
    id_proveedor = models.AutoField(primary_key=True)
    rut = models.TextField(unique=True)
    razon_social = models.TextField()
    direccion = models.TextField()
    region = models.TextField()
    comuna = models.TextField()
    ciudad = models.TextField()

    class Meta:
        db_table = 'proveedor'

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"


# Cabecera de cada factura de compra ingresada para respaldar el aumento de inventario.
class Factura(models.Model):
    id_factura = models.AutoField(primary_key=True)
    numero_documento = models.IntegerField()
    fecha_ingreso = models.DateField()
    id_proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, db_column='id_proveedor')
    observaciones = models.TextField(blank=True, null=True)
    total = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'factura'

    def __str__(self):
        return f"FAC-{self.numero_documento} ({self.id_proveedor.razon_social})"


# Desglose de los materiales y precios unitarios incluidos dentro de cada factura.
class DetalleFactura(models.Model):
    id_detalle_factura = models.AutoField(primary_key=True)
    id_articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT, db_column='id_articulo')
    id_factura = models.ForeignKey(Factura, on_delete=models.CASCADE, db_column='id_factura', related_name='detalles')
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.PositiveIntegerField()

    class Meta:
        db_table = 'detalle_factura'

    def __str__(self):
        return f"{self.cantidad}x {self.id_articulo.nombre} (FAC-{self.id_factura.numero_documento})"


# Registra el ciclo de reposición de los materiales.
class SolicitudReposicion(models.Model):
    PENDIENTE = 'Pendiente'
    EN_CAMINO = 'En camino'
    COMPLETADA = 'Completada'
    RECHAZADA = 'Rechazada'

    ESTADOS_SOLICITUD = [
        (PENDIENTE, 'Pendiente de revisión'),
        (EN_CAMINO, 'Comprada - En camino a bodega'),
        (COMPLETADA, 'Recibida en bodega'),
        (RECHAZADA, 'Rechazada'),
    ]

    id_solicitud = models.AutoField(primary_key=True)
    id_articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT, db_column='id_articulo')
    cantidad_solicitada = models.PositiveIntegerField()
    estado = models.TextField(choices=ESTADOS_SOLICITUD, default=PENDIENTE)
    observacion_bodega = models.TextField(blank=True, null=True)
    observacion_finanzas = models.TextField(blank=True, null=True)
    id_proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.PROTECT,
        db_column='id_proveedor',
        null=True,
        blank=True
    )
    id_factura = models.ForeignKey(
        Factura,
        on_delete=models.PROTECT,
        db_column='id_factura',
        null=True,
        blank=True
    )
    solicitado_por = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column='solicitado_por',
        related_name='solicitudes_creadas'
    )
    gestionado_por = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column='gestionado_por',
        null=True,
        blank=True,
        related_name='solicitudes_gestionadas'
    )
    recepcionado_por = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column='recepcionado_por',
        null=True,
        blank=True,
        related_name='solicitudes_recepcionadas'
    )
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'solicitud_reposicion'

    def __str__(self):
        return f"SOL-{self.id_solicitud} | {self.id_articulo.nombre} ({self.estado})"