from django.db import transaction
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Obra, TipoServicio, DetalleObra
from .serializers import ObraSerializer, TipoServicioSerializer, DetalleObraSerializer, DespachoObraInputSerializer

from catalogo_inventario.models import Articulo
from usuarios_rbac.models import Rol, Usuario
from usuarios_rbac.permissions import PermisoObras, PermisoTiposServicio, registrar_denegacion
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento


# Guarda en el historial general cada vez que se crea o modifica una obra.
def registrar_accion_obra(usuario_autor, tipo_accion, detalle_motivo):
    if not usuario_autor or not usuario_autor.is_authenticated:
        return
    tipo_obj, _ = TipoMovimiento.objects.get_or_create(nombre=tipo_accion)
    MovimientoArticulo.objects.create(
        id_articulo=None,
        id_usuario=usuario_autor,
        id_tipo_movimiento=tipo_obj,
        id_obra=None,
        cantidad=1,
        motivo=detalle_motivo
    )


# Administra los tipos de servicio.
class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoServicio.objects.all().order_by('id_tipo_servicio')
    serializer_class = TipoServicioSerializer
    permission_classes = [PermisoTiposServicio]

    # Guarda un tipo de servicio nuevo.
    def perform_create(self, serializer):
        nuevo = serializer.save()
        registrar_accion_obra(
            self.request.user,
            'Registro de Servicio',
            f"Nuevo tipo de servicio registrado: {nuevo.nombre}"
        )

    # Guarda los cambios de un tipo de servicio.
    def perform_update(self, serializer):
        nombre_previo = self.get_object().nombre
        actualizado = serializer.save()
        if nombre_previo != actualizado.nombre:
            registrar_accion_obra(
                self.request.user,
                'Modificación de Servicio',
                f"Tipo de servicio actualizado: {nombre_previo} -> {actualizado.nombre}"
            )

    # Maneja la eliminación de tipos de servicio.
    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        nombre_borrado = instancia.nombre
        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar este tipo de servicio porque ya está asignado a una o más obras."},
                status=status.HTTP_400_BAD_REQUEST
            )

        registrar_accion_obra(
            request.user,
            'Eliminación de Servicio',
            f"Tipo de servicio eliminado: {nombre_borrado}"
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# Permite consultar la lista de materiales entregados por obra.
class DetalleObraViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DetalleObraSerializer
    permission_classes = [PermisoObras]

    def get_queryset(self):
        queryset = DetalleObra.objects.select_related(
            'id_articulo', 'id_articulo__id_unidad_medida', 'id_obra'
        ).all().order_by('-id_detalle_obra')

        usuario = self.request.user
        if usuario and usuario.is_authenticated and getattr(usuario.id_rol, 'nombre', None) == Rol.SUPERVISOR:
            queryset = queryset.filter(id_obra__id_supervisor=usuario)

        obra_id = self.request.query_params.get('obra')
        if obra_id and str(obra_id).isdigit():
            queryset = queryset.filter(id_obra_id=int(obra_id))
        return queryset


# Permite crear, consultar, actualizar obras y despacharles materiales desde bodega.
class ObraViewSet(viewsets.ModelViewSet):
    serializer_class = ObraSerializer
    permission_classes = [PermisoObras]

    # Filtra las obras para que cada supervisor vea solo las que tiene a su cargo.
    def get_queryset(self):
        queryset = Obra.objects.select_related(
            'id_cliente', 'id_tipo_servicio', 'id_supervisor'
        ).prefetch_related(
            'detalles__id_articulo__id_unidad_medida'
        ).all().order_by('-id_obra')

        usuario = self.request.user
        if usuario and usuario.is_authenticated and getattr(usuario.id_rol, 'nombre', None) == Rol.SUPERVISOR:
            queryset = queryset.filter(id_supervisor=usuario)
        return queryset

    # Autoriza a Administración y Bodega para despachar materiales a una obra.
    def check_permissions(self, request):
        if getattr(self, 'action', None) == 'despachar':
            if not (request.user and request.user.is_authenticated):
                self.permission_denied(request)
            if request.user.id_rol.nombre in (Rol.ADMIN, Rol.BODEGA):
                return
            registrar_denegacion(request, "Despacho de Materiales a Obra")
            self.permission_denied(request)
        super().check_permissions(request)

    # Entrega la lista de supervisores activos para asignarlos al crear o editar una obra.
    @action(detail=False, methods=['get'], url_path='supervisores')
    def supervisores(self, request):
        lista = Usuario.objects.filter(
            id_rol__nombre=Rol.SUPERVISOR,
            is_active=True
        ).order_by('nombre')
        datos = [
            {
                'id_usuario': u.id_usuario,
                'nombre': u.nombre,
                'rut': u.rut,
                'correo_electronico': u.correo_electronico,
            }
            for u in lista
        ]
        return Response(datos, status=status.HTTP_200_OK)

    # Crea una obra nueva.
    def perform_create(self, serializer):
        if self.request.user.id_rol.nombre == Rol.SUPERVISOR:
            nueva_obra = serializer.save(id_supervisor=self.request.user)
        else:
            nueva_obra = serializer.save()

        supervisor_txt = nueva_obra.id_supervisor.nombre if nueva_obra.id_supervisor else "Sin asignar"
        detalle = (
            f"Nueva obra #{nueva_obra.id_obra} registrada para {nueva_obra.id_cliente.razon_social} "
            f"({nueva_obra.id_tipo_servicio.nombre}) | Supervisor: {supervisor_txt} | Técnico: {nueva_obra.tecnico_asociado}"
        )
        registrar_accion_obra(self.request.user, 'Registro de Obra', detalle)

    # Actualiza y guarda los datos modificados en el historial.
    def perform_update(self, serializer):
        obra_previa = self.get_object()
        estado_previo = obra_previa.estado
        tecnico_previo = obra_previa.tecnico_asociado
        supervisor_previo = obra_previa.id_supervisor_id

        if self.request.user.id_rol.nombre == Rol.SUPERVISOR:
            obra_actualizada = serializer.save(id_supervisor=self.request.user)
        else:
            obra_actualizada = serializer.save()

        cambios = []
        if estado_previo != obra_actualizada.estado:
            cambios.append(f"estado ({estado_previo} -> {obra_actualizada.estado})")
        if tecnico_previo != obra_actualizada.tecnico_asociado:
            cambios.append(f"técnico ({tecnico_previo} -> {obra_actualizada.tecnico_asociado})")
        if supervisor_previo != obra_actualizada.id_supervisor_id:
            nuevo_sup = obra_actualizada.id_supervisor.nombre if obra_actualizada.id_supervisor else "Sin asignar"
            cambios.append(f"supervisor a {nuevo_sup}")

        resumen = ", ".join(cambios) if cambios else "actualización de datos de la obra"
        detalle = f"Obra #{obra_actualizada.id_obra} ({obra_actualizada.id_cliente.razon_social}) : {resumen}"
        registrar_accion_obra(self.request.user, 'Modificación de Obra', detalle)

    # Gestiona la eliminación de una obra.
    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        id_borrado = instancia.id_obra
        cliente_borrado = instancia.id_cliente.razon_social
        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar esta obra porque ya tiene materiales despachados o movimientos registrados. Puede cambiar su estado a Finalizada o Cancelada."},
                status=status.HTTP_400_BAD_REQUEST
            )

        registrar_accion_obra(
            request.user,
            'Eliminación de Obra',
            f"Obra #{id_borrado} eliminada ({cliente_borrado})"
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Despacha materiales a la obra descontando stock, guardando en detalle_obra y en el historial.
    @action(detail=True, methods=['post'], url_path='despachar')
    def despachar(self, request, pk=None):
        obra_ref = self.get_object()

        serializer = DespachoObraInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        articulo_ref = serializer.validated_data['id_articulo']
        cantidad = serializer.validated_data['cantidad']
        motivo_input = serializer.validated_data.get('motivo', '').strip()
        tecnico_receptor = serializer.validated_data.get('tecnico_receptor', '').strip()
        documento_respaldo = serializer.validated_data.get('documento_respaldo', '').strip()

        # Bloquea la obra y el material mientras se descuenta el stock.
        with transaction.atomic():
            obra = Obra.objects.select_for_update().get(pk=obra_ref.pk)
            if obra.estado not in (Obra.EN_PROCESO, 'Activa'):
                return Response(
                    {"detail": f"No se pueden despachar materiales porque la obra se encuentra en estado '{obra.estado}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            articulo = Articulo.objects.select_for_update().get(pk=articulo_ref.pk)
            if articulo.stock_disponible < cantidad:
                return Response(
                    {
                        "detail": f"Stock insuficiente: solo quedan {articulo.stock_disponible} unidades disponibles en bodega.",
                        "codigo_error": "stock_insuficiente"
                    },
                    status=status.HTTP_409_CONFLICT
                )

            articulo.stock_disponible -= cantidad
            articulo.save(update_fields=['stock_disponible'])

            detalle = DetalleObra.objects.create(
                id_articulo=articulo,
                id_obra=obra,
                cantidad=cantidad,
            )

            tipo_salida, _ = TipoMovimiento.objects.get_or_create(nombre='Salida')
            partes_motivo = []
            if documento_respaldo:
                partes_motivo.append(f"Guía {documento_respaldo}")
            if motivo_input:
                partes_motivo.append(motivo_input)
            elif tecnico_receptor:
                partes_motivo.append(f"Entrega a {tecnico_receptor}")
            else:
                partes_motivo.append(f"Despacho a Obra #{obra.id_obra}")

            movimiento = MovimientoArticulo.objects.create(
                id_articulo=articulo,
                id_usuario=request.user,
                id_tipo_movimiento=tipo_salida,
                id_obra=obra,
                cantidad=-cantidad,
                motivo=" | ".join(partes_motivo),
            )

        return Response(
            {
                "detail": "Despacho registrado con éxito en la obra y en el historial.",
                "id_detalle_obra": detalle.id_detalle_obra,
                "id_movimiento_articulo": movimiento.id_movimiento_articulo,
                "stock_disponible_actual": articulo.stock_disponible,
                "alerta_stock_minimo": articulo.stock_disponible <= articulo.stock_minimo,
            },
            status=status.HTTP_201_CREATED
        )
