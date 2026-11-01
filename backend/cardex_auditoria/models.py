from django.db import models
from django.core.exceptions import PermissionDenied
from catalogo_inventario.models import Articulo
from usuarios_rbac.models import Usuario
from obras_despachos.models import Obra


class TipoMovimiento(models.Model):
    id_tipo_movimiento = models.AutoField(primary_key=True)
    nombre = models.TextField(unique=True)

    class Meta:
        db_table = 'tipo_movimiento'

    def __str__(self):
        return self.nombre

class MovimientoArticulo(models.Model):
    id_movimiento_articulo = models.AutoField(primary_key=True)
    fecha = models.DateTimeField(auto_now_add=True)
    id_articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT, db_column='id_articulo')
    id_usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT, db_column='id_usuario')
    id_tipo_movimiento = models.ForeignKey(TipoMovimiento, on_delete=models.PROTECT, db_column='id_tipo_movimiento')
    id_obra = models.ForeignKey(Obra, on_delete=models.PROTECT, db_column='id_obra', null=True, blank=True)
    cantidad = models.IntegerField()
    motivo = models.TextField()

    class Meta:
        db_table = 'movimiento_articulo'

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise PermissionDenied("No se puede modificar un registro de movimiento de artículo.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied("No se puede eliminar un registro de movimiento de artículo.")

