from django.db import models


class Categoria(models.Model):
    id_categoria = models.AutoField(primary_key=True)
    nombre = models.TextField(unique=True)

    class Meta:
        db_table = 'categoria'

    def __str__(self):
        return self.nombre

class UnidadMedida(models.Model):
    id_unidad_medida = models.AutoField(primary_key=True)
    nombre = models.TextField(unique=True)

    class Meta:
        db_table = 'unidad_medida'

    def __str__(self):
        return self.nombre

class Articulo(models.Model):
    id_articulo = models.AutoField(primary_key=True)
    codigo_barra = models.BigIntegerField(unique=True)
    nombre = models.TextField()
    id_categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, db_column='id_categoria')
    id_unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.PROTECT, db_column='id_unidad_medida')
    ubicacion = models.TextField()
    stock_disponible = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField(default=0)
    stock_comprometido = models.PositiveIntegerField(default=0)
    precio = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'articulo'

    def __str__(self):
        return f"{self.nombre} ({self.codigo_barra})"