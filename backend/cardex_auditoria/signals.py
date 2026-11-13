from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import MovimientoArticulo, TipoMovimiento
from catalogo_inventario.models import Articulo, Categoria, UnidadMedida

Usuario = get_user_model()


def _obtener_usuario_sistema():
    """Obtiene un usuario válido existente en la BD usando la clave primaria correcta."""
    return Usuario.objects.order_by('id_usuario').first()


def _registrar_auditoria(nombre_tipo, motivo, articulo=None, cantidad=1):
    """Crea el registro inmutable en MovimientoArticulo."""
    usuario = _obtener_usuario_sistema()
    if not usuario:
        return

    tipo, _ = TipoMovimiento.objects.get_or_create(nombre=nombre_tipo)

    MovimientoArticulo.objects.create(
        id_articulo=articulo,
        id_usuario=usuario,
        id_tipo_movimiento=tipo,
        cantidad=cantidad,
        motivo=motivo
    )


# 1. Confirmación en consola cuando se guarda cualquier movimiento en el Kardex
@receiver(post_save, sender=MovimientoArticulo)
def registrar_en_kardex(sender, instance, created, **kwargs):
    if created:
        print(f"Kardex: Movimiento #{instance.pk} registrado -> {instance.motivo}")


# 2. Auditoría automática para Artículos (Creación y Modificación)
@receiver(post_save, sender=Articulo)
def auditar_articulo_guardado(sender, instance, created, **kwargs):
    if created:
        _registrar_auditoria(
            nombre_tipo="Registro de Artículo",
            motivo=f"Nuevo artículo registrado: {instance.nombre} (Código: {instance.codigo_barra}) | Stock inicial: {instance.stock_disponible}",
            articulo=instance,
            cantidad=max(1, int(instance.stock_disponible or 1))
        )
    else:
        # Se omite precio_unitario para evitar errores de atributos si el modelo usa otro nombre
        _registrar_auditoria(
            nombre_tipo="Modificación de Artículo",
            motivo=f"Artículo modificado: {instance.nombre} (Código: {instance.codigo_barra}) | Stock disponible: {instance.stock_disponible}",
            articulo=instance,
            cantidad=1
        )


# 3. Auditoría automática para Eliminación de Artículos
@receiver(post_delete, sender=Articulo)
def auditar_articulo_eliminado(sender, instance, **kwargs):
    _registrar_auditoria(
        nombre_tipo="Eliminación de Artículo",
        motivo=f"Artículo eliminado del catálogo: {instance.nombre} (Código: {instance.codigo_barra})",
        articulo=None,
        cantidad=1
    )


# 4. Auditoría automática para Categorías y Unidades de Medida
@receiver(post_save, sender=Categoria)
def auditar_categoria(sender, instance, created, **kwargs):
    accion = "Nueva categoría creada" if created else "Categoría modificada"
    _registrar_auditoria(
        nombre_tipo="Gestión de Catálogo",
        motivo=f"{accion}: {instance.nombre}"
    )


@receiver(post_save, sender=UnidadMedida)
def auditar_unidad_medida(sender, instance, created, **kwargs):
    accion = "Nueva unidad de medida creada" if created else "Unidad de medida modificada"
    _registrar_auditoria(
        nombre_tipo="Gestión de Catálogo",
        motivo=f"{accion}: {instance.nombre}"
    )