from django.db import models
<<<<<<< HEAD

# Create your models here.
=======
from catalogo_inventario.models import Articulo


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

class Factura(models.Model):
    id_factura = models.AutoField(primary_key=True)
    numero_documento = models.IntegerField()
    fecha_ingreso = models.DateField()
    id_proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, db_column='id_proveedor')
    observaciones = models.TextField(blank=True, null=True)
    total = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'factura'

class DetalleFactura(models.Model):
    id_detalle_factura = models.AutoField(primary_key=True)
    id_articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT, db_column='id_articulo')
    id_factura = models.ForeignKey(Factura, on_delete=models.CASCADE, db_column='id_factura', related_name='detalles')
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.PositiveIntegerField()

    class Meta:
        db_table = 'detalle_factura'
>>>>>>> c655e6916b0cda5c9573a4e770885e7deb67bb33
