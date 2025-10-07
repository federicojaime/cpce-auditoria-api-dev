// controllers/presupuestosController.js
import { executeQuery, pool } from '../config/database.js';

/**
 * Solicitar presupuesto a múltiples proveedores
 */
export const solicitarPresupuesto = async (req, res) => {
    let connection;
    try {
        const {
            auditorias = [],
            proveedores = [],
            fechaLimite,
            urgencia = 'MEDIA',
            observaciones
        } = req.body;

        const userId = req.user.id;

        // Validaciones
        if (auditorias.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debe seleccionar al menos una auditoría'
            });
        }

        if (proveedores.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debe seleccionar al menos un proveedor'
            });
        }

        // Generar código único
        const year = new Date().getFullYear();
        const countResult = await executeQuery(
            'SELECT COUNT(*) as count FROM alt_solicitud_presupuesto WHERE YEAR(fecha_envio) = ?',
            [year]
        );
        const numero = (countResult[0].count + 1).toString().padStart(3, '0');
        const codigoSolicitud = `SOL-${year}-${numero}`;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Crear solicitud
        const [solicitudResult] = await connection.query(
            `INSERT INTO alt_solicitud_presupuesto (
                codigo_solicitud, fecha_envio, fecha_limite, estado, urgencia,
                cantidad_auditorias, cantidad_proveedores, id_usuario_creador, observaciones
            ) VALUES (?, NOW(), ?, 'ENVIADO', ?, ?, ?, ?, ?)`,
            [codigoSolicitud, fechaLimite, urgencia, auditorias.length, proveedores.length, userId, observaciones]
        );

        const solicitudId = solicitudResult.insertId;

        // Insertar auditorías
        for (const auditoriaId of auditorias) {
            await connection.query(
                'INSERT INTO alt_solicitud_presupuesto_auditoria (id_solicitud, id_auditoria) VALUES (?, ?)',
                [solicitudId, auditoriaId]
            );
        }

        // Insertar proveedores
        for (const proveedorId of proveedores) {
            await connection.query(
                'INSERT INTO alt_solicitud_presupuesto_proveedor (id_solicitud, id_proveedor, estado) VALUES (?, ?, "ENVIADO")',
                [solicitudId, proveedorId]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Solicitud de presupuesto creada exitosamente',
            solicitudId: solicitudId,
            codigo: codigoSolicitud,
            cantidadAuditorias: auditorias.length,
            cantidadProveedores: proveedores.length
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en solicitarPresupuesto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear solicitud',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Listar solicitudes con filtros
 */
export const listarSolicitudes = async (req, res) => {
    try {
        const { estado = 'TODOS', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = '1=1';
        let queryParams = [];

        if (estado && estado !== 'TODOS') {
            whereClause += ' AND s.estado = ?';
            queryParams.push(estado);
        }

        const countQuery = `SELECT COUNT(*) as total FROM alt_solicitud_presupuesto s WHERE ${whereClause}`;
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult[0].total;

        const dataQuery = `
            SELECT
                s.*,
                (SELECT COUNT(*) FROM alt_solicitud_presupuesto_proveedor WHERE id_solicitud = s.id_solicitud AND estado = 'RECIBIDO') as respuestas_recibidas,
                p.razon_social as proveedor_adjudicado
            FROM alt_solicitud_presupuesto s
            LEFT JOIN alt_proveedor p ON s.id_proveedor_adjudicado = p.id_proveedor
            WHERE ${whereClause}
            ORDER BY s.fecha_envio DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...queryParams, parseInt(limit), offset];
        const solicitudes = await executeQuery(dataQuery, dataParams);

        res.json({
            success: true,
            data: solicitudes,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            total: total
        });

    } catch (error) {
        console.error('Error en listarSolicitudes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar solicitudes',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Adjudicar presupuesto y crear orden de compra
 */
export const adjudicarPresupuesto = async (req, res) => {
    let connection;
    try {
        const { solicitudId } = req.params;
        const { proveedorId, idRespuesta, motivo } = req.body;

        const userId = req.user.id;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Actualizar solicitud
        await connection.query(
            `UPDATE alt_solicitud_presupuesto
             SET estado = 'ADJUDICADO',
                 id_proveedor_adjudicado = ?,
                 fecha_adjudicacion = NOW(),
                 motivo_adjudicacion = ?
             WHERE id_solicitud = ?`,
            [proveedorId, motivo, solicitudId]
        );

        // Actualizar respuesta como adjudicada
        if (idRespuesta) {
            await connection.query(
                'UPDATE alt_presupuesto_respuesta SET adjudicado = 1 WHERE id_respuesta = ?',
                [idRespuesta]
            );
        }

        // Generar código de orden
        const year = new Date().getFullYear();
        const [countResult] = await connection.query(
            'SELECT COUNT(*) as count FROM alt_orden_compra WHERE YEAR(fecha_creacion) = ?',
            [year]
        );
        const numero = (countResult[0].count + 1).toString().padStart(3, '0');
        const numeroOrden = `OC-${year}-${numero}`;

        // Crear orden de compra
        const [ordenResult] = await connection.query(
            `INSERT INTO alt_orden_compra (
                numero_orden, id_solicitud, id_proveedor, id_respuesta_presupuesto,
                estado, total, id_usuario_creador
            ) VALUES (?, ?, ?, ?, 'BORRADOR', 0, ?)`,
            [numeroOrden, solicitudId, proveedorId, idRespuesta, userId]
        );

        const ordenId = ordenResult.insertId;

        // Actualizar solicitud con la orden creada
        await connection.query(
            'UPDATE alt_solicitud_presupuesto SET id_orden_compra = ? WHERE id_solicitud = ?',
            [ordenId, solicitudId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Presupuesto adjudicado exitosamente',
            ordenCompraId: numeroOrden,
            ordenId: ordenId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en adjudicarPresupuesto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al adjudicar presupuesto',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Obtener estadísticas de solicitudes
 */
export const obtenerEstadisticas = async (req, res) => {
    try {
        const query = `
            SELECT
                COUNT(*) as total_solicitudes,
                SUM(CASE WHEN estado = 'ENVIADO' THEN 1 ELSE 0 END) as enviadas,
                SUM(CASE WHEN estado = 'PARCIAL' THEN 1 ELSE 0 END) as parciales,
                SUM(CASE WHEN estado = 'COMPLETO' THEN 1 ELSE 0 END) as completas,
                SUM(CASE WHEN estado = 'ADJUDICADO' THEN 1 ELSE 0 END) as adjudicadas,
                SUM(monto_total_estimado) as monto_total_gestion
            FROM alt_solicitud_presupuesto
        `;

        const result = await executeQuery(query);
        const stats = result[0];

        res.json({
            success: true,
            data: {
                totalSolicitudes: stats.total_solicitudes,
                enviadas: stats.enviadas,
                parciales: stats.parciales,
                completas: stats.completas,
                adjudicadas: stats.adjudicadas,
                montoTotalGestion: stats.monto_total_gestion
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
