from django.db import models
from compras_entidades.models import Cliente
from catalogo_inventario.models import Articulo


class TipoServicio(models.Model):
    id_tipo_servicio = models.AutoField(primary_key=True)
    nombre = models.TextField(unique=True)

    class Meta:
        db_table = 'tipo_servicio'

    def __str__(self):
        return self.nombre

class Obra(models.Model):
    id_obra = models.AutoField(primary_key=True)
    fecha_inicio = models.DateField()
    id_cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, db_column='id_cliente')
    tecnico_asociado = models.TextField()
    id_tipo_servicio = models.ForeignKey(TipoServicio, on_delete=models.PROTECT, db_column='id_tipo_servicio')
    estado = models.TextField(default='Activa')

    class Meta:
        db_table = 'obra'

class DetalleObra(models.Model):
    id_detalle_obra = models.AutoField(primary_key=True)
    id_articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT, db_column='id_articulo')
    id_obra = models.ForeignKey(Obra, on_delete=models.PROTECT, db_column='id_obra', related_name='detalles')
    cantidad = models.PositiveIntegerField()

    class Meta:
        db_table = 'detalle_obra'
