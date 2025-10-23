// controllers/comprasReportesController.js - Controlador para Reportes y Análisis de Compras

import { pool } from '../config/database.js';

/**
 * Obtener estadísticas ejecutivas de compras
 * GET /api/compras/reportes/estadisticas
 */
export const obtenerEstadisticasEjecutivas = async (req, res) => {
    try {
        console.log('[REPORTES] Obteniendo estadísticas ejecutivas...');
        console.log('[REPORTES] Query params:', req.query);

        const { fechaDesde, fechaHasta, proveedorId, estado } = req.query;

        // Construir condiciones WHERE dinámicamente
        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }

        if (proveedorId && proveedorId !== 'TODOS') {
            whereConditions.push('c.id_proveedor = ?');
            params.push(proveedorId);
        }

        if (estado && estado !== 'TODOS') {
            whereConditions.push('c.estado_compra = ?');
            params.push(estado);
        }

        const whereClause = whereConditions.join(' AND ');
        console.log('[REPORTES] WHERE clause:', whereClause);
        console.log('[REPORTES] Params:', params);

        // Total de órdenes y monto total
        const [totales] = await pool.query(
            `SELECT
                COUNT(*) as total_ordenes,
                COALESCE(SUM(monto_total), 0) as monto_total,
                COALESCE(AVG(monto_total), 0) as monto_promedio
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}`,
            params
        );

        // Órdenes por estado
        const [porEstado] = await pool.query(
            `SELECT
                estado_compra,
                COUNT(*) as cantidad
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            GROUP BY estado_compra`,
            params
        );

        // Órdenes entregadas (adaptado a estados reales)
        const [entregadas] = await pool.query(
            `SELECT COUNT(*) as total_entregadas
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            AND estado_compra IN ('entregado', 'finalizado')`,
            params
        );

        // Órdenes pendientes (adaptado a estados reales)
        const [pendientes] = await pool.query(
            `SELECT COUNT(*) as total_pendientes
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            AND estado_compra IN ('adjudicado', 'confirmado', 'en_preparacion', 'listo_retiro', 'pendiente_envio', 'enviado_proveedores')`,
            params
        );

        // Órdenes vencidas (pasaron más de 7 días desde fecha estimada)
        const [vencidas] = await pool.query(
            `SELECT COUNT(*) as total_vencidas
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            AND estado_compra IN ('adjudicado', 'confirmado', 'en_preparacion', 'listo_retiro', 'pendiente_envio', 'enviado_proveedores')
            AND fecha_estimada_entrega IS NOT NULL
            AND fecha_estimada_entrega < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            params
        );

        // Proveedores únicos
        const [proveedores] = await pool.query(
            `SELECT COUNT(DISTINCT id_proveedor) as total_proveedores
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}`,
            params
        );

        // Tiempo promedio de entrega (solo órdenes entregadas)
        const [tiempoPromedio] = await pool.query(
            `SELECT
                COALESCE(AVG(DATEDIFF(fecha_entrega_real, fecha_recepcion)), 0) as dias_promedio
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            AND estado_compra = 'entregado'
            AND fecha_entrega_real IS NOT NULL`,
            params
        );

        res.status(200).json({
            resumen: {
                totalOrdenes: parseInt(totales[0].total_ordenes),
                montoTotal: parseFloat(totales[0].monto_total),
                montoPromedio: parseFloat(totales[0].monto_promedio),
                entregadas: parseInt(entregadas[0].total_entregadas),
                pendientes: parseInt(pendientes[0].total_pendientes),
                vencidas: parseInt(vencidas[0].total_vencidas),
                proveedores: parseInt(proveedores[0].total_proveedores),
                tiempoPromedioEntrega: parseFloat(tiempoPromedio[0].dias_promedio).toFixed(1)
            },
            distribucionEstados: porEstado
        });

    } catch (error) {
        console.error('[REPORTES] ❌ Error obteniendo estadísticas:', error);
        console.error('[REPORTES] Stack:', error.stack);
        res.status(500).json({
            error: 'Error al obtener estadísticas',
            detalle: error.message,
            sql: error.sql || 'N/A'
        });
    }
};

/**
 * Obtener distribución por estados
 * GET /api/compras/reportes/distribucion-estados
 */
export const obtenerDistribucionEstados = async (req, res) => {
    try {
        console.log('[REPORTES] Obteniendo distribución de estados...');
        const { fechaDesde, fechaHasta, proveedorId } = req.query;

        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }

        if (proveedorId && proveedorId !== 'TODOS') {
            whereConditions.push('c.id_proveedor = ?');
            params.push(proveedorId);
        }

        const whereClause = whereConditions.join(' AND ');

        // Duplicar parámetros porque whereClause se usa 2 veces en la query
        const allParams = [...params, ...params];

        const [distribucion] = await pool.query(
            `SELECT
                c.estado_compra as estado,
                COUNT(*) as cantidad,
                COALESCE(SUM(c.monto_total), 0) as monto_total,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rec_compras_alto_costo c WHERE ${whereClause}), 2) as porcentaje
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            GROUP BY c.estado_compra
            ORDER BY cantidad DESC`,
            allParams
        );

        res.status(200).json({
            distribucion: distribucion
        });

    } catch (error) {
        console.error('Error obteniendo distribución:', error);
        res.status(500).json({
            error: 'Error al obtener distribución',
            detalle: error.message
        });
    }
};

/**
 * Análisis de cumplimiento (tiempos de entrega)
 * GET /api/compras/reportes/cumplimiento
 */
export const obtenerAnalisisCumplimiento = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta, proveedorId } = req.query;

        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }

        if (proveedorId && proveedorId !== 'TODOS') {
            whereConditions.push('c.id_proveedor = ?');
            params.push(proveedorId);
        }

        const whereClause = whereConditions.join(' AND ');

        // Análisis de cumplimiento de tiempos
        const [cumplimiento] = await pool.query(
            `SELECT
                COUNT(*) as total_ordenes_entregadas,
                SUM(CASE WHEN fecha_entrega_real <= fecha_estimada_entrega THEN 1 ELSE 0 END) as entregadas_a_tiempo,
                SUM(CASE WHEN fecha_entrega_real > fecha_estimada_entrega THEN 1 ELSE 0 END) as entregadas_tarde,
                ROUND(SUM(CASE WHEN fecha_entrega_real <= fecha_estimada_entrega THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as porcentaje_cumplimiento,
                COALESCE(AVG(DATEDIFF(fecha_entrega_real, fecha_recepcion)), 0) as dias_promedio_entrega,
                COALESCE(AVG(DATEDIFF(fecha_entrega_real, fecha_estimada_entrega)), 0) as desviacion_promedio_dias
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            AND estado_compra = 'entregado'
            AND fecha_entrega_real IS NOT NULL
            AND fecha_estimada_entrega IS NOT NULL`,
            params
        );

        // Distribución de tiempos de entrega
        const [distribucionTiempos] = await pool.query(
            `SELECT
                CASE
                    WHEN DATEDIFF(fecha_entrega_real, fecha_recepcion) <= 3 THEN '1-3 días'
                    WHEN DATEDIFF(fecha_entrega_real, fecha_recepcion) <= 7 THEN '4-7 días'
                    WHEN DATEDIFF(fecha_entrega_real, fecha_recepcion) <= 15 THEN '8-15 días'
                    WHEN DATEDIFF(fecha_entrega_real, fecha_recepcion) <= 30 THEN '16-30 días'
                    ELSE 'Más de 30 días'
                END as rango_dias,
                COUNT(*) as cantidad
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            AND estado_compra = 'entregado'
            AND fecha_entrega_real IS NOT NULL
            GROUP BY rango_dias
            ORDER BY
                CASE rango_dias
                    WHEN '1-3 días' THEN 1
                    WHEN '4-7 días' THEN 2
                    WHEN '8-15 días' THEN 3
                    WHEN '16-30 días' THEN 4
                    ELSE 5
                END`,
            params
        );

        res.status(200).json({
            cumplimiento: cumplimiento[0] || {},
            distribucionTiempos: distribucionTiempos
        });

    } catch (error) {
        console.error('Error obteniendo análisis de cumplimiento:', error);
        res.status(500).json({
            error: 'Error al obtener análisis de cumplimiento',
            detalle: error.message
        });
    }
};

/**
 * Ranking de proveedores
 * GET /api/compras/reportes/ranking-proveedores
 */
export const obtenerRankingProveedores = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta, limit = 10 } = req.query;

        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }

        const whereClause = whereConditions.join(' AND ');

        const [ranking] = await pool.query(
            `SELECT
                p.id_proveedor,
                p.razon_social,
                COUNT(*) as total_ordenes,
                COALESCE(SUM(c.monto_total), 0) as monto_total,
                COALESCE(AVG(c.monto_total), 0) as monto_promedio,
                SUM(CASE WHEN c.estado_compra = 'entregado' THEN 1 ELSE 0 END) as ordenes_entregadas,
                SUM(CASE WHEN c.estado_compra IN ('adjudicado', 'confirmado', 'en_preparacion', 'listo_retiro') THEN 1 ELSE 0 END) as ordenes_pendientes,
                SUM(CASE WHEN c.estado_compra = 'cancelado' THEN 1 ELSE 0 END) as ordenes_canceladas,
                COALESCE(AVG(CASE
                    WHEN c.estado_compra = 'entregado' AND c.fecha_entrega_real IS NOT NULL
                    THEN DATEDIFF(c.fecha_entrega_real, c.fecha_recepcion)
                    ELSE NULL
                END), 0) as tiempo_promedio_entrega,
                ROUND(SUM(CASE WHEN c.estado_compra = 'entregado' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as tasa_cumplimiento
            FROM alt_proveedor p
            INNER JOIN rec_compras_alto_costo c ON p.id_proveedor = c.id_proveedor
            WHERE ${whereClause}
            GROUP BY p.id_proveedor, p.razon_social
            ORDER BY monto_total DESC
            LIMIT ?`,
            [...params, parseInt(limit)]
        );

        res.status(200).json({
            ranking: ranking
        });

    } catch (error) {
        console.error('Error obteniendo ranking de proveedores:', error);
        res.status(500).json({
            error: 'Error al obtener ranking de proveedores',
            detalle: error.message
        });
    }
};

/**
 * Listar órdenes de compra con filtros y paginación
 * GET /api/compras/ordenes
 */
export const listarOrdenes = async (req, res) => {
    try {
        const {
            fechaDesde,
            fechaHasta,
            proveedorId,
            estado,
            page = 1,
            limit = 20,
            sortBy = 'fecha_recepcion',
            sortOrder = 'DESC'
        } = req.query;

        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }

        if (proveedorId && proveedorId !== 'TODOS') {
            whereConditions.push('c.id_proveedor = ?');
            params.push(proveedorId);
        }

        if (estado && estado !== 'TODOS') {
            whereConditions.push('c.estado_compra = ?');
            params.push(estado);
        }

        const whereClause = whereConditions.join(' AND ');

        // Contar total de registros
        const [totalRows] = await pool.query(
            `SELECT COUNT(*) as total
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}`,
            params
        );

        const total = totalRows[0].total;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Validar campo de ordenamiento
        const sortFields = ['fecha_recepcion', 'monto_total', 'estado_compra', 'fecha_estimada_entrega'];
        const validSortBy = sortFields.includes(sortBy) ? sortBy : 'fecha_recepcion';
        const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Obtener órdenes
        const [ordenes] = await pool.query(
            `SELECT
                c.id as orden_id,
                c.idreceta as auditoria_id,
                c.id_proveedor,
                p.razon_social as proveedor_nombre,
                c.id_solicitud_presupuesto,
                s.codigo_solicitud as lote_numero,
                c.monto_total,
                c.estado_compra,
                c.fecha_recepcion,
                c.fecha_envio_proveedores,
                c.fecha_estimada_entrega,
                c.fecha_entrega_real,
                c.lugar_retiro,
                c.observaciones,
                CONCAT(pac.apellido, ', ', pac.nombre) as paciente_nombre,
                pac.dni as paciente_dni,
                (SELECT COUNT(*) FROM rec_compras_alto_costo_detalle WHERE id_compra = c.id) as total_medicamentos
            FROM rec_compras_alto_costo c
            INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
            LEFT JOIN alt_solicitud_presupuesto s ON c.id_solicitud_presupuesto = s.id_solicitud
            INNER JOIN rec_receta_alto_costo r ON c.idreceta = r.idreceta
            INNER JOIN rec_paciente pac ON r.idpaciente = pac.id
            WHERE ${whereClause}
            ORDER BY c.${validSortBy} ${validSortOrder}
            LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.status(200).json({
            ordenes: ordenes,
            paginacion: {
                total: total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error listando órdenes:', error);
        res.status(500).json({
            error: 'Error al listar órdenes',
            detalle: error.message
        });
    }
};

/**
 * Obtener detalle completo de una orden
 * GET /api/compras/ordenes/:id
 */
export const obtenerDetalleOrden = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener información de la orden
        const [orden] = await pool.query(
            `SELECT
                c.id as orden_id,
                c.idreceta as auditoria_id,
                c.id_proveedor,
                p.razon_social as proveedor_nombre,
                p.cuit as proveedor_cuit,
                p.email_general as proveedor_email,
                p.telefono as proveedor_telefono,
                c.id_solicitud_presupuesto,
                s.codigo_solicitud as lote_numero,
                c.monto_total,
                c.estado_compra,
                c.fecha_recepcion,
                c.fecha_envio_proveedores,
                c.fecha_estimada_entrega,
                c.fecha_entrega_real,
                c.lugar_retiro,
                c.observaciones,
                c.id_usuario_compras,
                c.usuario_adjudico,
                CONCAT(pac.apellido, ', ', pac.nombre) as paciente_nombre,
                pac.dni as paciente_dni,
                pac.email as paciente_email,
                pac.telefono as paciente_telefono,
                r.nroreceta as receta_numero
            FROM rec_compras_alto_costo c
            INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
            LEFT JOIN alt_solicitud_presupuesto s ON c.id_solicitud_presupuesto = s.id_solicitud
            INNER JOIN rec_receta_alto_costo r ON c.idreceta = r.idreceta
            INNER JOIN rec_paciente pac ON r.idpaciente = pac.id
            WHERE c.id = ?`,
            [id]
        );

        if (orden.length === 0) {
            return res.status(404).json({
                error: 'Orden de compra no encontrada'
            });
        }

        // Obtener medicamentos de la orden
        const [medicamentos] = await pool.query(
            `SELECT
                d.id,
                d.id_medicamento,
                d.codigo_medicamento,
                d.nombre_medicamento,
                d.presentacion,
                d.cantidad,
                d.precio_unitario,
                d.precio_total,
                d.fecha_vencimiento,
                d.lote_medicamento,
                d.observaciones
            FROM rec_compras_alto_costo_detalle d
            WHERE d.id_compra = ?
            ORDER BY d.nombre_medicamento`,
            [id]
        );

        res.status(200).json({
            orden: orden[0],
            medicamentos: medicamentos
        });

    } catch (error) {
        console.error('Error obteniendo detalle de orden:', error);
        res.status(500).json({
            error: 'Error al obtener detalle de orden',
            detalle: error.message
        });
    }
};

/**
 * Generar Dashboard Ejecutivo completo
 * GET /api/reportes/dashboard-ejecutivo
 */
export const generarDashboardEjecutivo = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }

        const whereClause = whereConditions.join(' AND ');

        // 1. KPIs principales
        const [kpis] = await pool.query(
            `SELECT
                COUNT(*) as total_ordenes,
                COALESCE(SUM(monto_total), 0) as monto_total,
                COALESCE(AVG(monto_total), 0) as ticket_promedio,
                COUNT(DISTINCT id_proveedor) as proveedores_activos,
                COUNT(DISTINCT idreceta) as pacientes_atendidos
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}`,
            params
        );

        // 2. Evolución mensual (últimos 6 meses)
        const [evolucionMensual] = await pool.query(
            `SELECT
                DATE_FORMAT(fecha_recepcion, '%Y-%m') as mes,
                DATE_FORMAT(fecha_recepcion, '%b %Y') as mes_nombre,
                COUNT(*) as cantidad_ordenes,
                COALESCE(SUM(monto_total), 0) as monto_total,
                COALESCE(AVG(monto_total), 0) as ticket_promedio
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            GROUP BY DATE_FORMAT(fecha_recepcion, '%Y-%m'), DATE_FORMAT(fecha_recepcion, '%b %Y')
            ORDER BY mes DESC
            LIMIT 6`,
            params
        );

        // 3. Top 5 proveedores
        const [topProveedores] = await pool.query(
            `SELECT
                p.id_proveedor,
                p.razon_social,
                COUNT(c.id) as ordenes,
                COALESCE(SUM(c.monto_total), 0) as monto_total
            FROM rec_compras_alto_costo c
            INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
            WHERE ${whereClause}
            GROUP BY p.id_proveedor, p.razon_social
            ORDER BY monto_total DESC
            LIMIT 5`,
            params
        );

        // 4. Distribución por estado
        const allParams = [...params, ...params];
        const [distribucionEstados] = await pool.query(
            `SELECT
                estado_compra,
                COUNT(*) as cantidad,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rec_compras_alto_costo c WHERE ${whereClause}), 1) as porcentaje
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            GROUP BY estado_compra
            ORDER BY cantidad DESC`,
            allParams
        );

        res.status(200).json({
            kpis: kpis[0],
            evolucionMensual: evolucionMensual.reverse(),
            topProveedores,
            distribucionEstados
        });

    } catch (error) {
        console.error('[DASHBOARD] Error:', error);
        res.status(500).json({
            error: 'Error generando dashboard ejecutivo',
            detalle: error.message
        });
    }
};

/**
 * Análisis de Logística
 * GET /api/reportes/analisis-logistica
 */
export const analizarLogistica = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta, proveedorId } = req.query;

        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }
        if (proveedorId && proveedorId !== 'TODOS') {
            whereConditions.push('c.id_proveedor = ?');
            params.push(proveedorId);
        }

        const whereClause = whereConditions.join(' AND ');

        // 1. Tiempos de entrega por proveedor
        const [tiemposProveedor] = await pool.query(
            `SELECT
                p.razon_social as proveedor,
                COUNT(*) as total_entregas,
                ROUND(AVG(DATEDIFF(c.fecha_entrega_real, c.fecha_recepcion)), 1) as dias_promedio,
                MIN(DATEDIFF(c.fecha_entrega_real, c.fecha_recepcion)) as dias_minimo,
                MAX(DATEDIFF(c.fecha_entrega_real, c.fecha_recepcion)) as dias_maximo
            FROM rec_compras_alto_costo c
            INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
            WHERE ${whereClause}
            AND c.fecha_entrega_real IS NOT NULL
            GROUP BY p.razon_social
            ORDER BY dias_promedio ASC`,
            params
        );

        // 2. Puntos de retiro más utilizados
        const allParams = [...params, ...params];
        const [puntosRetiro] = await pool.query(
            `SELECT
                COALESCE(lugar_retiro, 'Sin especificar') as punto_retiro,
                COUNT(*) as cantidad,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rec_compras_alto_costo c WHERE ${whereClause}), 1) as porcentaje
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            GROUP BY lugar_retiro
            ORDER BY cantidad DESC
            LIMIT 10`,
            allParams
        );

        // 3. Cumplimiento de fechas estimadas
        const [cumplimientoFechas] = await pool.query(
            `SELECT
                COUNT(*) as total_con_fecha_estimada,
                SUM(CASE WHEN fecha_entrega_real IS NOT NULL AND fecha_entrega_real <= fecha_estimada_entrega THEN 1 ELSE 0 END) as entregadas_a_tiempo,
                SUM(CASE WHEN fecha_entrega_real IS NOT NULL AND fecha_entrega_real > fecha_estimada_entrega THEN 1 ELSE 0 END) as entregadas_tarde,
                SUM(CASE WHEN fecha_entrega_real IS NULL AND fecha_estimada_entrega < NOW() THEN 1 ELSE 0 END) as vencidas_pendientes,
                ROUND(SUM(CASE WHEN fecha_entrega_real IS NOT NULL AND fecha_entrega_real <= fecha_estimada_entrega THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(COUNT(*), 0), 1) as porcentaje_cumplimiento
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            AND fecha_estimada_entrega IS NOT NULL`,
            params
        );

        res.status(200).json({
            tiemposProveedor,
            puntosRetiro,
            cumplimiento: cumplimientoFechas[0] || {}
        });

    } catch (error) {
        console.error('[LOGISTICA] Error:', error);
        res.status(500).json({
            error: 'Error en análisis de logística',
            detalle: error.message
        });
    }
};

/**
 * Proyección de Costos
 * GET /api/reportes/proyeccion-costos
 */
export const proyectarCostos = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        let whereConditions = ['1=1'];
        let params = [];

        if (fechaDesde) {
            whereConditions.push('c.fecha_recepcion >= ?');
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            whereConditions.push('c.fecha_recepcion <= ?');
            params.push(fechaHasta + ' 23:59:59');
        }

        const whereClause = whereConditions.join(' AND ');

        // 1. Evolución de costos mensuales
        const [evolucionCostos] = await pool.query(
            `SELECT
                DATE_FORMAT(fecha_recepcion, '%Y-%m') as mes,
                DATE_FORMAT(fecha_recepcion, '%b %Y') as mes_nombre,
                COUNT(*) as ordenes,
                COALESCE(SUM(monto_total), 0) as costo_total,
                COALESCE(AVG(monto_total), 0) as costo_promedio,
                MIN(monto_total) as costo_minimo,
                MAX(monto_total) as costo_maximo
            FROM rec_compras_alto_costo c
            WHERE ${whereClause}
            GROUP BY DATE_FORMAT(fecha_recepcion, '%Y-%m'), DATE_FORMAT(fecha_recepcion, '%b %Y')
            ORDER BY mes ASC`,
            params
        );

        // 2. Proyección simple
        let proyeccion = null;
        if (evolucionCostos.length >= 3) {
            const ultimos3Meses = evolucionCostos.slice(-3);
            const promedioOrdenes = ultimos3Meses.reduce((sum, m) => sum + m.ordenes, 0) / 3;
            const promedioCosto = ultimos3Meses.reduce((sum, m) => sum + parseFloat(m.costo_total), 0) / 3;

            proyeccion = {
                ordenes_estimadas: Math.round(promedioOrdenes),
                costo_estimado: promedioCosto,
                tendencia: ultimos3Meses[2].costo_total > ultimos3Meses[0].costo_total ? 'CRECIENTE' : 'DECRECIENTE'
            };
        }

        // 3. Costos por proveedor
        const allParams = [...params, ...params];
        const [costosPorProveedor] = await pool.query(
            `SELECT
                p.razon_social as proveedor,
                COUNT(*) as ordenes,
                COALESCE(SUM(c.monto_total), 0) as costo_total,
                COALESCE(AVG(c.monto_total), 0) as costo_promedio,
                ROUND(COALESCE(SUM(c.monto_total), 0) * 100.0 /
                    NULLIF((SELECT SUM(monto_total) FROM rec_compras_alto_costo c WHERE ${whereClause}), 0), 1) as porcentaje_del_total
            FROM rec_compras_alto_costo c
            INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
            WHERE ${whereClause}
            GROUP BY p.razon_social
            ORDER BY costo_total DESC`,
            allParams
        );

        res.status(200).json({
            evolucionCostos,
            proyeccionProximoMes: proyeccion,
            costosPorProveedor
        });

    } catch (error) {
        console.error('[PROYECCION] Error:', error);
        res.status(500).json({
            error: 'Error en proyección de costos',
            detalle: error.message
        });
    }
};

export default {
    obtenerEstadisticasEjecutivas,
    obtenerDistribucionEstados,
    obtenerAnalisisCumplimiento,
    obtenerRankingProveedores,
    listarOrdenes,
    obtenerDetalleOrden,
    generarDashboardEjecutivo,
    analizarLogistica,
    proyectarCostos
};
