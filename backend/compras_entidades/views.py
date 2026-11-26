from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from django.db import transaction
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Cliente, Proveedor, Factura, DetalleFactura, SolicitudReposicion
from .serializers import ClienteSerializer, ProveedorSerializer, FacturaSerializer, SolicitudReposicionSerializer
from usuarios_rbac.models import Rol
from usuarios_rbac.permissions import PermisoClientes, PermisoProveedores, PermisoFacturas, PermisoSolicitudes, registrar_denegacion
from usuarios_rbac.validators import validar_texto
from catalogo_inventario.models import Articulo
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento


# Anota en el historial general cada cambio importante hecho en clientes, proveedores, facturas o solicitudes.
def registrar_accion_comercial(usuario_autor, tipo_accion, detalle_motivo, articulo=None, cantidad=1):
    if not usuario_autor or not usuario_autor.is_authenticated:
        return
    tipo_obj, _ = TipoMovimiento.objects.get_or_create(nombre=tipo_accion)
    MovimientoArticulo.objects.create(
        id_articulo=articulo,
        id_usuario=usuario_autor,
        id_tipo_movimiento=tipo_obj,
        id_obra=None,
        cantidad=cantidad,
        motivo=detalle_motivo
    )


# Calcula el monto neto, el IVA (19%) y el total final aplicando hasta 3 descuentos seguidos
def calcular_totales_factura(cantidad, precio_unitario, d1=0, d2=0, d3=0):
    bruto = Decimal(cantidad) * Decimal(precio_unitario)
    factor_1 = Decimal('1') - (Decimal(str(d1)) / Decimal('100'))
    factor_2 = Decimal('1') - (Decimal(str(d2)) / Decimal('100'))
    factor_3 = Decimal('1') - (Decimal(str(d3)) / Decimal('100'))

    neto_decimal = bruto * factor_1 * factor_2 * factor_3
    neto = int(neto_decimal.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    iva = int((Decimal(neto) * Decimal('0.19')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    total = neto + iva
    return neto, iva, total


# Convierte un dato recibido a número entero sin que el servidor falle si llega texto inválido.
def leer_entero_seguro(valor, defecto=None):
    if valor is None or str(valor).strip() == '':
        return defecto
    try:
        return int(valor)
    except (ValueError, TypeError):
        return None


# Revisa que un descuento sea un número válido entre 0% y 99%.
def leer_descuento_seguro(valor):
    if valor is None or str(valor).strip() == '':
        return Decimal('0')
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError, TypeError):
        return None
    if numero < 0 or numero > 99:
        return None
    return numero


# Revisa todos los campos de una factura (proveedor, número, montos, fecha y duplicados) entes de guardarla.
def validar_datos_factura(datos, cantidad_por_defecto=None):
    id_proveedor = leer_entero_seguro(datos.get('id_proveedor'))
    cantidad = leer_entero_seguro(datos.get('cantidad'), defecto=cantidad_por_defecto)
    precio_unitario = leer_entero_seguro(datos.get('precio_unitario'))
    nro_doc_texto = str(datos.get('numero_documento') or '').upper().replace('FAC-', '').strip()
    numero_documento = leer_entero_seguro(nro_doc_texto)

    if not id_proveedor:
        return None, Response(
            {"detail": "Debe seleccionar un proveedor válido."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not numero_documento or numero_documento <= 0 or numero_documento > 2000000000:
        return None, Response(
            {"detail": "Ingrese un número de factura válido (solo números positivos)."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not cantidad or cantidad <= 0 or cantidad > 1000000:
        return None, Response(
            {"detail": "La cantidad debe ser un número mayor a cero y menor a 1.000.000."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not precio_unitario or precio_unitario <= 0 or precio_unitario > 999999999:
        return None, Response(
            {"detail": "El precio unitario debe ser mayor a $0 y menor a $999.999.999."},
            status=status.HTTP_400_BAD_REQUEST
        )

    fecha_raw = datos.get('fecha_ingreso')
    if fecha_raw:
        try:
            fecha_ingreso = date.fromisoformat(str(fecha_raw).strip())
        except ValueError:
            return None, Response(
                {"detail": "El formato de la fecha de ingreso no es válido (use AAAA-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        fecha_ingreso = date.today()

    observaciones = str(datos.get('observaciones') or datos.get('observacion_finanzas') or '').strip()
    if len(observaciones) > 250:
        return None, Response(
            {"detail": "Las observaciones no pueden superar los 250 caracteres."},
            status=status.HTTP_400_BAD_REQUEST
        )
    if observaciones:
        try:
            observaciones = validar_texto(observaciones)
        except serializers.ValidationError as exc:
            return None, Response({"detail": str(exc.detail[0])}, status=status.HTTP_400_BAD_REQUEST)


    vienen_descuentos = any(
        clave in datos for clave in ('descuento_1', 'descuento_2', 'descuento_3', 'd1', 'd2', 'd3')
    )
    d1 = leer_descuento_seguro(datos.get('descuento_1', datos.get('d1', 0)))
    d2 = leer_descuento_seguro(datos.get('descuento_2', datos.get('d2', 0)))
    d3 = leer_descuento_seguro(datos.get('descuento_3', datos.get('d3', 0)))

    if d1 is None or d2 is None or d3 is None:
        return None, Response(
            {"detail": "Cada descuento comercial debe ser un porcentaje válido entre 0 y 99."},
            status=status.HTTP_400_BAD_REQUEST
        )

    neto, iva, total_calculado = calcular_totales_factura(cantidad, precio_unitario, d1, d2, d3)

    if vienen_descuentos:
        total_final = total_calculado
    else:
        total_enviado = leer_entero_seguro(datos.get('total'), defecto=0)
        total_final = total_enviado if (total_enviado and 0 < total_enviado <= total_calculado) else total_calculado

    proveedor = Proveedor.objects.filter(pk=id_proveedor).first()
    if not proveedor:
        return None, Response({"detail": "El proveedor seleccionado no existe."}, status=status.HTTP_400_BAD_REQUEST)

    if Factura.objects.filter(id_proveedor=proveedor, numero_documento=numero_documento).exists():
        return None, Response(
            {
                "detail": (
                    f"Ya existe la factura FAC-{numero_documento} registrada para "
                    f"{proveedor.razon_social}. Revise el número para evitar duplicar compras."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    return {
        'proveedor': proveedor,
        'numero_documento': numero_documento,
        'cantidad': cantidad,
        'precio_unitario': precio_unitario,
        'fecha_ingreso': fecha_ingreso,
        'observaciones': observaciones,
        'neto': neto,
        'iva': iva,
        'total': total_final,
    }, None


# Permite ver, registrar, editar y eliminar clientes mandantes dejando respaldo en el historial.
class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('razon_social')
    serializer_class = ClienteSerializer
    permission_classes = [PermisoClientes]

    # Guarda un cliente nuevo y anota su creación en el historial.
    def perform_create(self, serializer):
        nuevo_cliente = serializer.save()
        detalle = f"Nuevo cliente registrado: {nuevo_cliente.razon_social} (RUT: {nuevo_cliente.rut})"
        registrar_accion_comercial(self.request.user, 'Registro de Cliente', detalle)

    # Guarda los cambios de un cliente y los registra en el historial.
    def perform_update(self, serializer):
        cliente_actualizado = serializer.save()
        detalle = f"Ficha de cliente actualizada: {cliente_actualizado.razon_social} (RUT: {cliente_actualizado.rut})"
        registrar_accion_comercial(self.request.user, 'Modificación de Cliente', detalle)

    # Elimina un cliente solo si no tiene obras asociadas.
    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        razon_borrada = instancia.razon_social
        rut_borrado = instancia.rut
        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar este cliente porque ya tiene obras asociadas en el sistema."},
                status=status.HTTP_400_BAD_REQUEST
            )

        detalle = f"Cliente eliminado: {razon_borrada} (RUT: {rut_borrado})"
        registrar_accion_comercial(request.user, 'Eliminación de Cliente', detalle)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Permite ver, registrar, editar y eliminar proveedores dejando respaldo en el historial.
class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all().order_by('razon_social')
    serializer_class = ProveedorSerializer
    permission_classes = [PermisoProveedores]

    # Guarda un proveedor nuevo y lo registra en el historial.
    def perform_create(self, serializer):
        nuevo_proveedor = serializer.save()
        detalle = f"Nuevo proveedor registrado: {nuevo_proveedor.razon_social} (RUT: {nuevo_proveedor.rut})"
        registrar_accion_comercial(self.request.user, 'Registro de Proveedor', detalle)

    # Guarda los cambios de un proveedor y los anota en el historial.
    def perform_update(self, serializer):
        proveedor_actualizado = serializer.save()
        detalle = f"Ficha de proveedor actualizada: {proveedor_actualizado.razon_social} (RUT: {proveedor_actualizado.rut})"
        registrar_accion_comercial(self.request.user, 'Modificación de Proveedor', detalle)

    # Elimina un proveedor solo si no tiene facturas registradas.
    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        razon_borrada = instancia.razon_social
        rut_borrado = instancia.rut
        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar este proveedor porque ya tiene facturas de compra registradas."},
                status=status.HTTP_400_BAD_REQUEST
            )

        detalle = f"Proveedor eliminado: {razon_borrada} (RUT: {rut_borrado})"
        registrar_accion_comercial(request.user, 'Eliminación de Proveedor', detalle)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Administra la consulta y el registro de facturas de compra (solo Administración y Finanzas).
class FacturaViewSet(viewsets.ModelViewSet):
    queryset = (
        Factura.objects.select_related('id_proveedor')
        .prefetch_related('detalles__id_articulo__id_unidad_medida')
        .all()
        .order_by('-fecha_ingreso', '-id_factura')
    )
    serializer_class = FacturaSerializer
    permission_classes = [PermisoFacturas]
    http_method_names = ['get', 'post', 'head', 'options']

    # Registra una factura de compra. Si compra Finanzas, queda "En camino" para que Bodega confirme la llegada.
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        datos = request.data
        id_articulo = leer_entero_seguro(datos.get('id_articulo'))

        if not id_articulo:
            return Response(
                {"detail": "Debe seleccionar un material válido del catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        validados, error_resp = validar_datos_factura(datos)
        if error_resp:
            return error_resp
        
        articulo = Articulo.objects.select_for_update().filter(pk=id_articulo).first()
        if not articulo:
            return Response(
                {"detail": "El material seleccionado no existe en el catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        factura = Factura.objects.create(
            numero_documento=validados['numero_documento'],
            fecha_ingreso=validados['fecha_ingreso'],
            id_proveedor=validados['proveedor'],
            observaciones=validados['observaciones'],
            total=validados['total']
        )

        DetalleFactura.objects.create(
            id_factura=factura,
            id_articulo=articulo,
            cantidad=validados['cantidad'],
            precio_unitario=validados['precio_unitario']
        )

        rol_usuario = request.user.id_rol.nombre

        # Finanzas no modifica stock físico, deja el pedido en camino para que Bodega valide la entrega.
        if rol_usuario == Rol.FINANZAS:
            solicitud_auto = SolicitudReposicion.objects.create(
                id_articulo=articulo,
                cantidad_solicitada=validados['cantidad'],
                estado=SolicitudReposicion.EN_CAMINO,
                observacion_bodega="Compra directa gestionada por Finanzas (pendiente de recepción física).",
                observacion_finanzas=validados['observaciones'] or f"Factura FAC-{factura.numero_documento}",
                id_proveedor=validados['proveedor'],
                id_factura=factura,
                solicitado_por=request.user,
                gestionado_por=request.user,
            )
            detalle_hist = (
                f"Compra registrada con FAC-{factura.numero_documento} ({validados['proveedor'].razon_social}) "
                f"por {validados['cantidad']} {articulo.id_unidad_medida.nombre} | Pendiente de recepción en bodega "
                f"(SOL-{solicitud_auto.id_solicitud:04d})"
            )
            registrar_accion_comercial(
                request.user,
                'Aprobación de Compra',
                detalle_hist,
                articulo=articulo,
                cantidad=0
            )
            pendiente_recepcion = True
        else:
            # Administración puede ingresar el stock de inmediato y registrar la entrada.
            articulo.stock_disponible += validados['cantidad']
            articulo.precio = validados['precio_unitario']
            articulo.save()

            motivo_historial = (
                validados['observaciones']
                or f"Recepción Factura FAC-{factura.numero_documento} ({validados['proveedor'].razon_social})"
            )
            registrar_accion_comercial(
                request.user,
                'Entrada',
                motivo_historial,
                articulo=articulo,
                cantidad=validados['cantidad']
            )
            pendiente_recepcion = False

        serializer = self.get_serializer(factura)
        respuesta = dict(serializer.data)
        respuesta['neto_calculado'] = validados['neto']
        respuesta['iva_calculado'] = validados['iva']
        respuesta['pendiente_recepcion'] = pendiente_recepcion
        return Response(respuesta, status=status.HTTP_201_CREATED)


# Maneja el ciclo completo de reposición: Bodega pide, Finanzas aprueba/factura o rechaza, y Bodega recibe.
class SolicitudReposicionViewSet(viewsets.ModelViewSet):
    queryset = (
        SolicitudReposicion.objects.select_related(
            'id_articulo',
            'id_articulo__id_unidad_medida',
            'id_proveedor',
            'id_factura',
            'solicitado_por',
            'gestionado_por',
            'recepcionado_por',
        )
        .all()
        .order_by('-fecha_solicitud', '-id_solicitud')
    )
    serializer_class = SolicitudReposicionSerializer
    permission_classes = [PermisoSolicitudes]
    http_method_names = ['get', 'post', 'head', 'options']

    # Se crea la solicitud de compra para un material.
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        rol = request.user.id_rol.nombre
        if rol not in (Rol.ADMIN, Rol.BODEGA):
            registrar_denegacion(request, "Solicitudes de Reposición (Crear Solicitud)")
            return Response(
                {"detail": "Solo el Encargado de Bodega o Administración pueden solicitar reposición de materiales."},
                status=status.HTTP_403_FORBIDDEN
            )

        id_articulo = leer_entero_seguro(request.data.get('id_articulo'))
        cantidad = leer_entero_seguro(request.data.get('cantidad_solicitada'))
        observacion = str(request.data.get('observacion_bodega') or '').strip()

        if not id_articulo:
            return Response(
                {"detail": "Debe seleccionar un material del catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not cantidad or cantidad <= 0 or cantidad > 1000000:
            return Response(
                {"detail": "La cantidad solicitada debe ser mayor a 0 y menor a 1.000.000."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(observacion) > 250:
            return Response(
                {"detail": "La observación no puede superar los 250 caracteres."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if observacion:
            try:
                observacion = validar_texto(observacion)
            except serializers.ValidationError as exc:
                return Response({"detail": str(exc.detail[0])}, status=status.HTTP_400_BAD_REQUEST)

        articulo = Articulo.objects.select_related('id_unidad_medida').filter(pk=id_articulo).first()
        if not articulo:
            return Response(
                {"detail": "El material seleccionado no existe en el catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Impide duplicar pedidos mientras ya exista uno pendiente por revisar para el mismo material.
        if SolicitudReposicion.objects.filter(
            id_articulo=articulo,
            estado=SolicitudReposicion.PENDIENTE
        ).exists():
            return Response(
                {
                    "detail": (
                        f"Ya existe una solicitud pendiente de revisión para {articulo.nombre}. "
                        "Espere a que Finanzas la gestione antes de crear otra."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        solicitud = SolicitudReposicion.objects.create(
            id_articulo=articulo,
            cantidad_solicitada=cantidad,
            estado=SolicitudReposicion.PENDIENTE,
            observacion_bodega=observacion,
            solicitado_por=request.user,
        )

        detalle = (
            f"Solicitud SOL-{solicitud.id_solicitud:04d} enviada a Finanzas: "
            f"{cantidad} {articulo.id_unidad_medida.nombre} de {articulo.nombre}"
        )
        if observacion:
            detalle += f" ({observacion})"

        registrar_accion_comercial(
            request.user,
            'Solicitud de Reposición',
            detalle,
            articulo=articulo,
            cantidad=0
        )

        serializer = self.get_serializer(solicitud)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # Finanzas aprueba la solicitud, guarda la factura y la pasa a "En camino".
    @action(detail=True, methods=['post'], url_path='aprobar-compra')
    @transaction.atomic
    def aprobar_compra(self, request, pk=None):
        rol = request.user.id_rol.nombre
        if rol not in (Rol.ADMIN, Rol.FINANZAS):
            registrar_denegacion(request, "Solicitudes de Reposición (Aprobar Compra)")
            return Response(
                {"detail": "Solo el Encargado de Finanzas o Administración pueden aprobar compras y facturar."},
                status=status.HTTP_403_FORBIDDEN
            )

        solicitud = (
            SolicitudReposicion.objects.select_for_update(of=('self',))
            .select_related('id_articulo', 'id_articulo__id_unidad_medida')
            .filter(pk=pk)
            .first()
        )
        if not solicitud:
            return Response({"detail": "La solicitud indicada no existe."}, status=status.HTTP_404_NOT_FOUND)

        if solicitud.estado != SolicitudReposicion.PENDIENTE:
            return Response(
                {"detail": f"Esta solicitud ya fue procesada (estado actual: {solicitud.estado})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        validados, error_resp = validar_datos_factura(
            request.data,
            cantidad_por_defecto=solicitud.cantidad_solicitada
        )
        if error_resp:
            return error_resp

        factura = Factura.objects.create(
            numero_documento=validados['numero_documento'],
            fecha_ingreso=validados['fecha_ingreso'],
            id_proveedor=validados['proveedor'],
            observaciones=(
                validados['observaciones']
                or f"Compra aprobada para SOL-{solicitud.id_solicitud:04d}"
            ),
            total=validados['total']
        )

        DetalleFactura.objects.create(
            id_factura=factura,
            id_articulo=solicitud.id_articulo,
            cantidad=validados['cantidad'],
            precio_unitario=validados['precio_unitario']
        )

        solicitud.cantidad_solicitada = validados['cantidad']
        solicitud.estado = SolicitudReposicion.EN_CAMINO
        solicitud.id_proveedor = validados['proveedor']
        solicitud.id_factura = factura
        solicitud.gestionado_por = request.user
        solicitud.observacion_finanzas = validados['observaciones']
        solicitud.save()

        detalle_hist = (
            f"SOL-{solicitud.id_solicitud:04d} aprobada y facturada (FAC-{factura.numero_documento} · "
            f"{validados['proveedor'].razon_social}) por {validados['cantidad']} "
            f"{solicitud.id_articulo.id_unidad_medida.nombre} · En camino a bodega"
        )
        registrar_accion_comercial(
            request.user,
            'Aprobación de Compra',
            detalle_hist,
            articulo=solicitud.id_articulo,
            cantidad=0
        )

        serializer = self.get_serializer(solicitud)
        respuesta = dict(serializer.data)
        respuesta['neto_calculado'] = validados['neto']
        respuesta['iva_calculado'] = validados['iva']
        return Response(respuesta, status=status.HTTP_200_OK)

    # Finanzas rechaza una solicitud pendiente dejando el motivo escrito.
    @action(detail=True, methods=['post'], url_path='rechazar')
    @transaction.atomic
    def rechazar(self, request, pk=None):
        rol = request.user.id_rol.nombre
        if rol not in (Rol.ADMIN, Rol.FINANZAS):
            registrar_denegacion(request, "Solicitudes de Reposición (Rechazar)")
            return Response(
                {"detail": "Solo el Encargado de Finanzas o Administración pueden rechazar solicitudes."},
                status=status.HTTP_403_FORBIDDEN
            )

        solicitud = (
            SolicitudReposicion.objects.select_for_update(of=('self',))
            .select_related('id_articulo')
            .filter(pk=pk)
            .first()
        )
        if not solicitud:
            return Response({"detail": "La solicitud indicada no existe."}, status=status.HTTP_404_NOT_FOUND)

        if solicitud.estado != SolicitudReposicion.PENDIENTE:
            return Response(
                {"detail": f"Solo se pueden rechazar solicitudes pendientes (estado actual: {solicitud.estado})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        motivo = str(request.data.get('observacion_finanzas') or '').strip()
        if len(motivo) < 5 or len(motivo) > 250:
            return Response(
                {"detail": "Debe indicar un motivo de rechazo de entre 5 y 250 caracteres."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            motivo = validar_texto(motivo)
        except serializers.ValidationError as exc:
            return Response({"detail": str(exc.detail[0])}, status=status.HTTP_400_BAD_REQUEST)

        solicitud.estado = SolicitudReposicion.RECHAZADA
        solicitud.gestionado_por = request.user
        solicitud.observacion_finanzas = motivo
        solicitud.save()

        detalle_hist = (
            f"SOL-{solicitud.id_solicitud:04d} rechazada ({solicitud.id_articulo.nombre}): {motivo}"
        )
        registrar_accion_comercial(
            request.user,
            'Rechazo de Solicitud',
            detalle_hist,
            articulo=solicitud.id_articulo,
            cantidad=0
        )

        serializer = self.get_serializer(solicitud)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # Bodega confirma la llega física, suma el stock y registra la entrada.
    @action(detail=True, methods=['post'], url_path='confirmar-recepcion')
    @transaction.atomic
    def confirmar_recepcion(self, request, pk=None):
        rol = request.user.id_rol.nombre
        if rol not in (Rol.ADMIN, Rol.BODEGA):
            registrar_denegacion(request, "Solicitudes de Reposición (Confirmar Recepción)")
            return Response(
                {"detail": "Solo el Encargado de Bodega o Administración pueden confirmar el ingreso físico a bodega."},
                status=status.HTTP_403_FORBIDDEN
            )

        solicitud = (
            SolicitudReposicion.objects.select_for_update(of=('self',))
            .select_related('id_articulo', 'id_articulo__id_unidad_medida', 'id_proveedor', 'id_factura')
            .filter(pk=pk)
            .first()
        )
        if not solicitud:
            return Response({"detail": "La solicitud indicada no existe."}, status=status.HTTP_404_NOT_FOUND)

        if solicitud.estado != SolicitudReposicion.EN_CAMINO:
            return Response(
                {"detail": f"Esta solicitud no está pendiente de recepción física (estado actual: {solicitud.estado})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Bloquea la fila del material para sumar las unidades recibidas de forma segura.
        articulo = Articulo.objects.select_for_update().get(pk=solicitud.id_articulo_id)
        articulo.stock_disponible += solicitud.cantidad_solicitada

        # Actualiza el precio del catálogo con el último precio unitario de la factura.
        if solicitud.id_factura:
            detalle_fac = DetalleFactura.objects.filter(
                id_factura=solicitud.id_factura,
                id_articulo=articulo
            ).first()
            if detalle_fac and detalle_fac.precio_unitario > 0:
                articulo.precio = detalle_fac.precio_unitario

        articulo.save()

        solicitud.estado = SolicitudReposicion.COMPLETADA
        solicitud.recepcionado_por = request.user
        solicitud.save()

        nro_fac = f"FAC-{solicitud.id_factura.numero_documento}" if solicitud.id_factura else "Sin factura"
        prov_txt = solicitud.id_proveedor.razon_social if solicitud.id_proveedor else "Proveedor"
        motivo_entrada = (
            f"Recepción física confirmada · SOL-{solicitud.id_solicitud:04d} · {nro_fac} ({prov_txt})"
        )

        registrar_accion_comercial(
            request.user,
            'Entrada',
            motivo_entrada,
            articulo=articulo,
            cantidad=solicitud.cantidad_solicitada
        )

        serializer = self.get_serializer(solicitud)
        return Response(serializer.data, status=status.HTTP_200_OK)