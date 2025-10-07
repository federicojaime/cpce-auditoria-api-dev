// controllers/ordenesCompraController.js
import { executeQuery, pool } from '../config/database.js';
import * as notificacionesController from './notificacionesController.js';

/**
 * Listar órdenes de compra con filtros y paginación
 */
export const listarOrdenes = async (req, res) => {
    try {
        const {
            estado = 'TODAS',
            page = 1,
            limit = 10,
            proveedor,
            fechaDesde,
            fechaHasta
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereConditions = ['1=1'];
        let queryParams = [];

        // Filtro por estado
        if (estado && estado !== 'TODAS') {
            whereConditions.push('o.estado = ?');
            queryParams.push(estado);
        }

        // Filtro por proveedor
        if (proveedor && proveedor !== 'TODOS') {
            whereConditions.push('o.id_proveedor = ?');
            queryParams.push(proveedor);
        }

        // Filtro por fecha
        if (fechaDesde) {
            whereConditions.push('o.fecha_creacion >= ?');
            queryParams.push(fechaDesde);
        }
        if (fechaHasta) {
            whereConditions.push('o.fecha_creacion <= ?');
            queryParams.push(fechaHasta);
        }

        const whereClause = whereConditions.join(' AND ');

        // Contar total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM alt_orden_compra o
            WHERE ${whereClause}
        `;
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult[0].total;

        // Obtener órdenes
        const dataQuery = `
            SELECT
                o.id_orden,
                o.numero_orden,
                o.estado,
                o.fecha_creacion,
                o.fecha_envio,
                o.fecha_entrega_estimada,
                o.fecha_entrega_real,
                o.total,
                o.notificacion_enviada,
                o.fecha_notificacion,
                o.tracking_numero,
                o.tracking_empresa,
                o.tracking_estado,
                o.cantidad_pacientes,
                p.razon_social as proveedor_nombre,
                p.telefono_general as proveedor_telefono,
                p.email_general as proveedor_email,
                s.codigo_solicitud
            FROM alt_orden_compra o
            INNER JOIN alt_proveedor p ON o.id_proveedor = p.id_proveedor
            INNER JOIN alt_solicitud_presupuesto s ON o.id_solicitud = s.id_solicitud
            WHERE ${whereClause}
            ORDER BY o.fecha_creacion DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...queryParams, parseInt(limit), offset];
        const ordenes = await executeQuery(dataQuery, dataParams);

        res.json({
            success: true,
            data: ordenes,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            total: total,
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error en listarOrdenes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar órdenes',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Obtener orden por ID con todos los detalles
 */
export const obtenerOrdenPorId = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener orden principal
        const ordenQuery = `
            SELECT
                o.*,
                p.razon_social as proveedor_nombre,
                p.telefono_general as proveedor_telefono,
                p.email_general as proveedor_email,
                s.codigo_solicitud
            FROM alt_orden_compra o
            INNER JOIN alt_proveedor p ON o.id_proveedor = p.id_proveedor
            INNER JOIN alt_solicitud_presupuesto s ON o.id_solicitud = s.id_solicitud
            WHERE o.id_orden = ?
        `;

        const ordenResult = await executeQuery(ordenQuery, [id]);

        if (ordenResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        const orden = ordenResult[0];

        // Obtener detalles (medicamentos por paciente)
        const detallesQuery = `
            SELECT *
            FROM alt_orden_compra_detalle
            WHERE id_orden = ?
            ORDER BY paciente_nombre
        `;
        const detalles = await executeQuery(detallesQuery, [id]);

        // Obtener historial
        const historialQuery = `
            SELECT
                h.*,
                u.nombre as usuario_nombre
            FROM alt_orden_compra_historial h
            LEFT JOIN user_au u ON h.id_usuario = u.id
            WHERE h.id_orden = ?
            ORDER BY h.fecha_evento DESC
        `;
        const historial = await executeQuery(historialQuery, [id]);

        // Obtener notificaciones
        const notificacionesQuery = `
            SELECT *
            FROM alt_notificacion_paciente
            WHERE id_orden = ?
            ORDER BY fecha_creacion DESC
        `;
        const notificaciones = await executeQuery(notificacionesQuery, [id]);

        res.json({
            success: true,
            data: {
                orden: orden,
                detalles: detalles,
                historial: historial,
                notificaciones: notificaciones,
                proveedor: {
                    nombre: orden.proveedor_nombre,
                    telefono: orden.proveedor_telefono,
                    email: orden.proveedor_email
                }
            }
        });

    } catch (error) {
        console.error('Error en obtenerOrdenPorId:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener orden',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * 🔥 FUNCIÓN PRINCIPAL - Confirmar entrega y notificar pacientes
 */
export const confirmarEntrega = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fechaEntregaReal,
            notificarPaciente = true,
            observaciones
        } = req.body;

        const userId = req.user.id;

        // Obtener orden y detalles
        const ordenQuery = `
            SELECT o.*, p.razon_social as proveedor_nombre
            FROM alt_orden_compra o
            INNER JOIN alt_proveedor p ON o.id_proveedor = p.id_proveedor
            WHERE o.id_orden = ?
        `;
        const ordenResult = await executeQuery(ordenQuery, [id]);

        if (ordenResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        const orden = ordenResult[0];

        // Verificar que la orden esté en estado ENVIADO
        if (orden.estado !== 'ENVIADO') {
            return res.status(400).json({
                success: false,
                message: `La orden debe estar en estado ENVIADO. Estado actual: ${orden.estado}`
            });
        }

        // Actualizar orden a ENTREGADO
        await executeQuery(
            `UPDATE alt_orden_compra
             SET estado = 'ENTREGADO',
                 fecha_entrega_real = ?,
                 observaciones = ?
             WHERE id_orden = ?`,
            [fechaEntregaReal || new Date(), observaciones, id]
        );

        // Agregar al historial
        await executeQuery(
            `INSERT INTO alt_orden_compra_historial (id_orden, estado_anterior, estado_nuevo, evento, descripcion, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, 'ENVIADO', 'ENTREGADO', 'Entrega confirmada', observaciones || 'Medicamentos recibidos en CPCE', userId]
        );

        let notificacionesEnviadas = [];

        // Notificar pacientes si se solicitó
        if (notificarPaciente) {
            // Obtener pacientes de esta orden
            const pacientesQuery = `
                SELECT DISTINCT
                    paciente_nombre as nombre,
                    paciente_dni as dni,
                    paciente_telefono as telefono,
                    paciente_email as email
                FROM alt_orden_compra_detalle
                WHERE id_orden = ?
            `;
            const pacientes = await executeQuery(pacientesQuery, [id]);

            // Obtener medicamentos
            const medicamentosQuery = `
                SELECT
                    medicamento_nombre as nombre,
                    SUM(cantidad) as cantidad
                FROM alt_orden_compra_detalle
                WHERE id_orden = ?
                GROUP BY medicamento_nombre
            `;
            const medicamentos = await executeQuery(medicamentosQuery, [id]);

            if (pacientes.length > 0) {
                // Crear el request para notificar
                const notifReq = {
                    body: {
                        ordenId: id,
                        pacientes: pacientes,
                        tipo: 'MEDICAMENTOS_DISPONIBLES',
                        canal: 'EMAIL_SMS',
                        urgencia: 'ALTA',
                        datosOrden: {
                            numero: orden.numero_orden,
                            proveedor: orden.proveedor_nombre,
                            fechaEntrega: fechaEntregaReal || new Date(),
                            tracking: orden.tracking_numero
                        },
                        medicamentos: medicamentos
                    },
                    user: req.user
                };

                const notifRes = {
                    json: (data) => {
                        notificacionesEnviadas = data.notificaciones || [];
                    },
                    status: () => notifRes
                };

                // Llamar al controlador de notificaciones
                await notificacionesController.notificarPaciente(notifReq, notifRes);
            }
        }

        res.json({
            success: true,
            message: 'Entrega confirmada exitosamente' + (notificarPaciente ? ' y pacientes notificados' : ''),
            orden: {
                id: id,
                numeroOrden: orden.numero_orden,
                estado: 'ENTREGADO',
                fechaEntregaReal: fechaEntregaReal || new Date()
            },
            notificacionesEnviadas: notificacionesEnviadas
        });

    } catch (error) {
        console.error('Error en confirmarEntrega:', error);
        res.status(500).json({
            success: false,
            message: 'Error al confirmar entrega',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Cambiar estado de la orden
 */
export const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoEstado, observaciones } = req.body;

        const userId = req.user.id;

        // Validar estado
        const estadosValidos = ['BORRADOR', 'ENVIADA', 'CONFIRMADA', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADA'];
        if (!estadosValidos.includes(nuevoEstado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        // Obtener estado actual
        const ordenQuery = 'SELECT estado FROM alt_orden_compra WHERE id_orden = ?';
        const ordenResult = await executeQuery(ordenQuery, [id]);

        if (ordenResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        const estadoAnterior = ordenResult[0].estado;

        // Actualizar estado
        await executeQuery(
            'UPDATE alt_orden_compra SET estado = ? WHERE id_orden = ?',
            [nuevoEstado, id]
        );

        // Agregar al historial
        await executeQuery(
            `INSERT INTO alt_orden_compra_historial (id_orden, estado_anterior, estado_nuevo, evento, descripcion, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, estadoAnterior, nuevoEstado, `Estado cambiado a ${nuevoEstado}`, observaciones || null, userId]
        );

        res.json({
            success: true,
            message: 'Estado actualizado exitosamente',
            estadoAnterior: estadoAnterior,
            estadoNuevo: nuevoEstado
        });

    } catch (error) {
        console.error('Error en cambiarEstado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Actualizar información de tracking
 */
export const actualizarTracking = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            trackingNumero,
            trackingEmpresa,
            trackingEstado,
            trackingUrl
        } = req.body;

        const userId = req.user.id;

        await executeQuery(
            `UPDATE alt_orden_compra
             SET tracking_numero = ?,
                 tracking_empresa = ?,
                 tracking_estado = ?,
                 tracking_url = ?
             WHERE id_orden = ?`,
            [trackingNumero, trackingEmpresa, trackingEstado, trackingUrl, id]
        );

        // Agregar al historial
        await executeQuery(
            `INSERT INTO alt_orden_compra_historial (id_orden, estado_anterior, estado_nuevo, evento, descripcion, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                null,
                null,
                'Tracking actualizado',
                `Tracking: ${trackingNumero} - ${trackingEmpresa} - ${trackingEstado}`,
                userId
            ]
        );

        res.json({
            success: true,
            message: 'Tracking actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error en actualizarTracking:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar tracking',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Cancelar orden
 */
export const cancelarOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        const userId = req.user.id;

        // Obtener estado actual
        const ordenResult = await executeQuery(
            'SELECT estado FROM alt_orden_compra WHERE id_orden = ?',
            [id]
        );

        if (ordenResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        const estadoAnterior = ordenResult[0].estado;

        // No permitir cancelar si ya está entregada
        if (estadoAnterior === 'ENTREGADO') {
            return res.status(400).json({
                success: false,
                message: 'No se puede cancelar una orden ya entregada'
            });
        }

        // Actualizar a cancelada
        await executeQuery(
            `UPDATE alt_orden_compra
             SET estado = 'CANCELADA', motivo_cancelacion = ?
             WHERE id_orden = ?`,
            [motivo, id]
        );

        // Agregar al historial
        await executeQuery(
            `INSERT INTO alt_orden_compra_historial (id_orden, estado_anterior, estado_nuevo, evento, descripcion, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, estadoAnterior, 'CANCELADA', 'Orden cancelada', motivo || 'Sin motivo especificado', userId]
        );

        res.json({
            success: true,
            message: 'Orden cancelada exitosamente'
        });

    } catch (error) {
        console.error('Error en cancelarOrden:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar orden',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Obtener estadísticas de órdenes
 */
export const obtenerEstadisticas = async (req, res) => {
    try {
        const query = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'BORRADOR' THEN 1 ELSE 0 END) as borradores,
                SUM(CASE WHEN estado = 'ENVIADA' THEN 1 ELSE 0 END) as enviadas,
                SUM(CASE WHEN estado = 'CONFIRMADA' THEN 1 ELSE 0 END) as confirmadas,
                SUM(CASE WHEN estado = 'EN_PREPARACION' THEN 1 ELSE 0 END) as en_preparacion,
                SUM(CASE WHEN estado = 'ENVIADO' THEN 1 ELSE 0 END) as enviados,
                SUM(CASE WHEN estado = 'ENTREGADO' THEN 1 ELSE 0 END) as entregados,
                SUM(CASE WHEN estado = 'CANCELADA' THEN 1 ELSE 0 END) as canceladas,
                SUM(CASE WHEN notificacion_enviada = 1 THEN 1 ELSE 0 END) as pacientes_notificados,
                SUM(total) as monto_total
            FROM alt_orden_compra
        `;

        const result = await executeQuery(query);
        const stats = result[0];

        res.json({
            success: true,
            data: {
                total: stats.total,
                borradores: stats.borradores,
                enviadas: stats.enviadas,
                confirmadas: stats.confirmadas,
                enPreparacion: stats.en_preparacion,
                enviados: stats.enviados,
                entregados: stats.entregados,
                canceladas: stats.canceladas,
                pacientesNotificados: stats.pacientes_notificados,
                montoTotal: stats.monto_total
            }
        });

    } catch (error) {
        console.error('Error en obtenerEstadisticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};
