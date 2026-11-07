/**
 * @file ComprasView.jsx
 * @description Vista unificada para la administración de entidades comerciales (Clientes Mandantes,
 * Proveedores Agroindustriales) y recepción de Facturas de compra con 3 descuentos comerciales sucesivos (HU-08 / CP-04).
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hooks useState, useEffect para gestión reactiva de formularios y listas.
 * 
 * REGLAS DE NEGOCIO:
 * - HU-08 / CP-04: Cálculo sucesivo comercial de hasta 3 descuentos en compras de reposición.
 * - Restricción de edición según matriz RBAC (solo administración y finanzas).
 */

import React, { useEffect, useState } from "react";
import {
    obtenerClientes,
    crearCliente,
    actualizarCliente,
    eliminarCliente,
    obtenerProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    obtenerArticulos,
} from '../services_api/inventarioService';
import { crearMovimientoCardex } from '../services_api/cardexService';
import FacturasComprasView from '../components/FacturasComprasView';
import { INITIAL_ARTICULOS } from '../mockData';

const clienteInicial = {
    rut: '',
    razon_social: '',
    giro_comercial: '',
    direccion: '',
    region: 'Ñuble',
    comuna: '',
    ciudad: '',
    nombre_representante: '',
    rut_representante: '',
};

const proveedorInicial = {
    rut: '',
    razon_social: '',
    direccion: '',
    region: 'Ñuble',
    comuna: '',
    ciudad: '',
};

const ComprasView = ({ usuario }) => {
    const [pestana, setPestana] = useState('clientes');
    const [clientes, setClientes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [articulos, setArticulos] = useState(INITIAL_ARTICULOS);
    const [formCliente, setFormCliente] = useState(clienteInicial);
    const [formProveedor, setFormProveedor] = useState(proveedorInicial);
    const [editClienteId, setEditClienteId] = useState(null);
    const [editProveedorId, setEditProveedorId] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const puedeEditar = ['administracion', 'encargado_finanza'].includes(usuario?.rol);

    const cargarEntidades = async () => {
        try {
            const [resCli, resProv, resArt] = await Promise.all([
                obtenerClientes(),
                obtenerProveedores(),
                obtenerArticulos().catch(() => ({ data: INITIAL_ARTICULOS }))
            ]);
            setClientes(resCli.data || []);
            setProveedores(resProv.data || []);
            if (resArt?.data && resArt.data.length > 0) {
                setArticulos(resArt.data);
            }
        } catch {
            setError('Error al consultar las entidades comerciales.');
        }
    };

    useEffect(() => {
        cargarEntidades();
    }, []);

    const guardarClienteForm = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        try {
            if (editClienteId) {
                await actualizarCliente(editClienteId, formCliente);
                setMensaje('Ficha de cliente actualizada.');
            } else {
                await crearCliente(formCliente);
                setMensaje('Cliente registrado.');
            }
            setFormCliente(clienteInicial);
            setEditClienteId(null);
            cargarEntidades();
        } catch (err) {
            setError(JSON.stringify(err.response?.data || 'Error de validación en Cliente.'));
        }
    };

    const guardarProveedorForm = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        try {
            if (editProveedorId) {
                await actualizarProveedor(editProveedorId, formProveedor);
                setMensaje('Ficha de proveedor actualizada.');
            } else {
                await crearProveedor(formProveedor);
                setMensaje('Proveedor registrado.');
            }
            setFormProveedor(proveedorInicial);
            setEditProveedorId(null);
            cargarEntidades();
        } catch (err) {
            setError(JSON.stringify(err.response?.data || 'Error de validación en Proveedor.'));
        }
    };

    return (
        <div className="contenedor-vista">
            <div className="cabecera-seccion">
                <h2>Mantenedores Comerciales:</h2>
                <div className="selector-pestanas">
                    <button className={pestana === 'clientes' ? 'btn-primario' : 'btn-secundario'} onClick={() => setPestana('clientes')}>Clientes Mandantes ({clientes.length})</button>
                    <button className={pestana === 'proveedores' ? 'btn-primario' : 'btn-secundario'} onClick={() => setPestana('proveedores')}>Proveedores Agroindustriales ({proveedores.length})</button>
                    <button className={pestana === 'facturas' ? 'btn-primario' : 'btn-secundario'} onClick={() => setPestana('facturas')}>Recepción Facturas (3 Descuentos)</button>
                </div>
            </div>

            {mensaje && <div className="alerta-exito">{mensaje}</div>}
            {error && <div className="alerta-error">{error}</div>}

            {pestana === 'clientes' && (
                <>
                    {puedeEditar && (
                        <form onSubmit={guardarClienteForm} className="card-formulario">
                            <h3>{editClienteId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <div className="grid-inputs">
                                <input
                                    type="text"
                                    placeholder="RUT Empresa (Ej: 76123456-7)"
                                    value={formCliente.rut}
                                    onChange={(e) => setFormCliente({ ...formCliente, rut: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Razón Social"
                                    value={formCliente.razon_social}
                                    onChange={(e) => setFormCliente({ ...formCliente, razon_social: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Dirección"
                                    value={formCliente.direccion}
                                    onChange={(e) => setFormCliente({ ...formCliente, direccion: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Región"
                                    value={formCliente.region}
                                    onChange={(e) => setFormCliente({ ...formCliente, region: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Comuna"
                                    value={formCliente.comuna}
                                    onChange={(e) => setFormCliente({ ...formCliente, comuna: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Ciudad"
                                    value={formCliente.ciudad}
                                    onChange={(e) => setFormCliente({ ...formCliente, ciudad: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Giro Comercial"
                                    value={formCliente.giro_comercial}
                                    onChange={(e) => setFormCliente({ ...formCliente, giro_comercial: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Nombre Representante Legal"
                                    value={formCliente.nombre_representante}
                                    onChange={(e) => setFormCliente({ ...formCliente, nombre_representante: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="RUT Representante"
                                    value={formCliente.rut_representante}
                                    onChange={(e) => setFormCliente({ ...formCliente, rut_representante: e.target.value })}
                                    required 
                                />
                            </div>
                            <button type="submit" className="btn-primario">{editClienteId ? 'Actualizar Ficha' : 'Guardar Cliente'}</button>
                        </form>
                    )}

                    <table className="tabla-fyag">
                        <thead>
                            <tr>
                                <th>RUT</th>
                                <th>Razón Social</th>
                                <th>Dirección</th>
                                <th>Ciudad / Comuna</th>
                                <th>Representante Legal</th>
                                {puedeEditar && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.map((c) => (
                                <tr key={c.id_cliente}>
                                    <td>{c.rut}</td>
                                    <td><strong>{c.razon_social}</strong></td>
                                    <td>{c.direccion}</td>
                                    <td>{c.ciudad} ({c.comuna})</td>
                                    <td>{c.nombre_representante} ({c.rut_representante})</td>
                                    {puedeEditar && (
                                        <td>
                                            <button className="btn-tabla" onClick={() => {setEditClienteId(c.id_cliente); setFormCliente(c);}}>Editar</button>
                                            <button className="btn-peligro" onClick={async () => {await eliminarCliente(c.id_cliente); cargarEntidades();}}>Eliminar</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {pestana === 'proveedores' && (
                <>
                    {puedeEditar && (
                        <form onSubmit={guardarProveedorForm} className="card-formulario">
                            <h3>{editProveedorId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                            <div className="grid-inputs">
                                <input
                                    type="text"
                                    placeholder="RUT Empresa"
                                    value={formProveedor.rut}
                                    onChange={(e) => setFormProveedor({ ...formProveedor, rut: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Razón Social"
                                    value={formProveedor.razon_social}
                                    onChange={(e) => setFormProveedor({ ...formProveedor, razon_social: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Dirección"
                                    value={formProveedor.direccion}
                                    onChange={(e) => setFormProveedor({ ...formProveedor, direccion: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Región"
                                    value={formProveedor.region}
                                    onChange={(e) => setFormProveedor({ ...formProveedor, region: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Comuna"
                                    value={formProveedor.comuna}
                                    onChange={(e) => setFormProveedor({ ...formProveedor, comuna: e.target.value })}
                                    required 
                                />
                                <input
                                    type="text"
                                    placeholder="Ciudad"
                                    value={formProveedor.ciudad}
                                    onChange={(e) => setFormProveedor({ ...formProveedor, ciudad: e.target.value })}
                                    required 
                                />
                            </div>
                            <button type="submit" className="btn-primario">{editProveedorId ? 'Actualizar Proveedor' : 'Registrar Proveedor'}</button>
                        </form>
                    )}

                    <table className="tabla-fyag">
                        <thead>
                            <tr>
                                <th>RUT</th>
                                <th>Razón Social</th>
                                <th>Dirección</th>
                                <th>Ciudad / Comuna</th>
                                {puedeEditar && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {proveedores.map((p) => {
                                const idProv = p.id_proveedor || p.id;
                                return (
                                    <tr key={idProv}>
                                        <td>{p.rut}</td>
                                        <td><strong>{p.razon_social}</strong></td>
                                        <td>{p.direccion}</td>
                                        <td>{p.ciudad} ({p.comuna})</td>
                                        {puedeEditar && (
                                            <td>
                                                <button className="btn-tabla" onClick={() => {setEditProveedorId(idProv); setFormProveedor(p);}}>Editar</button>
                                                <button className="btn-peligro" onClick={async () => {await eliminarProveedor(idProv); cargarEntidades();}}>Eliminar</button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </>
            )}

            {pestana === 'facturas' && (
                <FacturasComprasView
                    proveedores={proveedores}
                    articulos={articulos}
                    onRegistrarFactura={async (facturaData) => {
                        await crearMovimientoCardex({
                            usuario_responsable: usuario?.nombre || 'Encargado Compras',
                            cargo: 'Adquisiciones',
                            articulo_nombre: facturaData.articulo_nombre,
                            articulo_codigo: `ART-${facturaData.articulo_id}`,
                            articulo_detalle: 'Recepción Factura Proveedor',
                            cantidad: facturaData.cantidad,
                            unidad_medida: 'un',
                            tipo_movimiento: 'Entrada',
                            obra_destino: 'Bodega Central',
                            documento_respaldo: facturaData.documento,
                            motivo: facturaData.motivo
                        });
                        setMensaje(`Factura ${facturaData.documento} registrada con éxito. Se ingresaron ${facturaData.cantidad} unidades.`);
                        cargarEntidades();
                    }}
                />
            )}
        </div>
    );
};

export default ComprasView;
