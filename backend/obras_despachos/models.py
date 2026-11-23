from django.db import models
from compras_entidades.models import Cliente
from catalogo_inventario.models import Articulo
from usuarios_rbac.models import Usuario


# Categorías de trabajo que realiza la empresa.
class TipoServicio(models.Model):
    id_tipo_servicio = models.AutoField(primary_key=True)
    nombre = models.TextField(unique=True)

    class Meta:
        db_table = 'tipo_servicio'

    def __str__(self):
        return self.nombre

# Ficha de cada obra o servicio en terreno con su supervisor encargado y técnico asignado.
class Obra(models.Model):
    EN_PROCESO = 'En proceso'
    FINALIZADA = 'Finalizada'
    SUSPENDIDA = 'Suspendida'
    CANCELADA = 'Cancelada'

    ESTADOS_OBRA = [
        (EN_PROCESO, 'En proceso'),
        (FINALIZADA, 'Finalizada'),
        (SUSPENDIDA, 'Suspendida'),
        (CANCELADA, 'Cancelada'),
    ]

    id_obra = models.AutoField(primary_key=True)
    fecha_inicio = models.DateField()
    id_cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, db_column='id_cliente')
    id_supervisor = models.ForeignKey(Usuario, on_delete=models.PROTECT, db_column='id_supervisor', null=True, blank=True, related_name='obras_supervisadas')
    tecnico_asociado = models.TextField()
    id_tipo_servicio = models.ForeignKey(TipoServicio, on_delete=models.PROTECT, db_column='id_tipo_servicio')
    estado = models.TextField(default=EN_PROCESO)

    class Meta:
        db_table = 'obra'

    def __str__(self):
        return f"Obra #{self.id_obra} - {self.id_cliente.razon_social} ({self.estado})"

class DetalleObra(models.Model):
    id_detalle_obra = models.AutoField(primary_key=True)
    id_articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT, db_column='id_articulo')
    id_obra = models.ForeignKey(Obra, on_delete=models.PROTECT, db_column='id_obra', related_name='detalles')
    cantidad = models.PositiveIntegerField()

    class Meta:
        db_table = 'detalle_obra'
