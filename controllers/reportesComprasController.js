// controllers/reportesComprasController.js
import { executeQuery } from '../config/database.js';

/**
 * Obtener reporte completo de compras
 */
export const obtenerReporteCompleto = async (req, res) => {
    try {
        const {
            fechaDesde,
            fechaHasta,
            proveedor = 'TODOS',
            estado = 'TODOS'
        } = req.query;

        let whereConditions = ['1=1'];
        let queryParams = [];

        if (fechaDesde) {
            whereConditions.push('o.fecha_creacion >= ?');
            queryParams.push(fechaDesde);
        }
        if (fechaHasta) {
            whereConditions.push('o.fecha_creacion <= ?');
            queryParams.push(fechaHasta);
        }
        if (proveedor !== 'TODOS') {
            whereConditions.push('o.id_proveedor = ?');
            queryParams.push(proveedor);
        }
        if (estado !== 'TODOS') {
            whereConditions.push('o.estado = ?');
            queryParams.push(estado);
        }

        const whereClause = whereConditions.join(' AND ');

        // Resumen general
        const resumenQuery = `
            SELECT
                COUNT(*) as total_ordenes,
                SUM(total) as monto_total,
                SUM(CASE WHEN estado = 'ENTREGADO' THEN 1 ELSE 0 END) as ordenes_entregadas,
                SUM(CASE WHEN estado IN ('BORRADOR', 'ENVIADA', 'CONFIRMADA', 'EN_PREPARACION', 'ENVIADO') THEN 1 ELSE 0 END) as ordenes_pendientes,
                SUM(CASE WHEN estado = 'ENTREGADO' AND DATEDIFF(fecha_entrega_real, fecha_entrega_estimada) > 0 THEN 1 ELSE 0 END) as ordenes_vencidas,
                COUNT(DISTINCT id_proveedor) as proveedores_activos,
                AVG(DATEDIFF(fecha_entrega_real, fecha_creacion)) as tiempo_promedio_entrega
            FROM alt_orden_compra o
            WHERE ${whereClause}
        `;

        const resumen = await executeQuery(resumenQuery, queryParams);

        // Top proveedores
        const proveedoresQuery = `
            SELECT
                p.id_proveedor as id,
                p.razon_social as nombre,
                COUNT(o.id_orden) as cantidad_ordenes,
                SUM(o.total) as monto_total,
                AVG(DATEDIFF(o.fecha_entrega_real, o.fecha_creacion)) as tiempo_promedio_entrega,
                (SUM(CASE WHEN o.estado = 'ENTREGADO' THEN 1 ELSE 0 END) * 100.0 / COUNT(o.id_orden)) as cumplimiento
            FROM alt_proveedor p
            INNER JOIN alt_orden_compra o ON p.id_proveedor = o.id_proveedor
            WHERE ${whereClause}
            GROUP BY p.id_proveedor
            ORDER BY monto_total DESC
            LIMIT 10
        `;

        const topProveedores = await executeQuery(proveedoresQuery, queryParams);

        // Top medicamentos
        const medicamentosQuery = `
            SELECT
                d.medicamento_nombre as nombre,
                d.medicamento_categoria as categoria,
                COUNT(DISTINCT d.id_orden) as cantidad_ordenes,
                SUM(d.cantidad) as unidades_totales,
                SUM(d.subtotal) as monto_total
            FROM alt_orden_compra_detalle d
            INNER JOIN alt_orden_compra o ON d.id_orden = o.id_orden
            WHERE ${whereClause}
            GROUP BY d.medicamento_nombre, d.medicamento_categoria
            ORDER BY monto_total DESC
            LIMIT 10
        `;

        const topMedicamentos = await executeQuery(medicamentosQuery, queryParams);

        // Distribución por estados
        const estadosQuery = `
            SELECT
                estado,
                COUNT(*) as cantidad,
                SUM(total) as monto_total
            FROM alt_orden_compra o
            WHERE ${whereClause}
            GROUP BY estado
        `;

        const distribucionEstados = await executeQuery(estadosQuery, queryParams);

        // Evolución mensual
        const evolucionQuery = `
            SELECT
                DATE_FORMAT(fecha_creacion, '%Y-%m') as mes,
                COUNT(*) as cantidad_ordenes,
                SUM(total) as monto_total,
                AVG(DATEDIFF(fecha_entrega_real, fecha_creacion)) as tiempo_promedio_entrega
            FROM alt_orden_compra o
            WHERE ${whereClause}
            GROUP BY DATE_FORMAT(fecha_creacion, '%Y-%m')
            ORDER BY mes DESC
            LIMIT 12
        `;

        const evolucionMensual = await executeQuery(evolucionQuery, queryParams);

        res.json({
            success: true,
            resumenGeneral: {
                totalOrdenes: resumen[0].total_ordenes,
                montoTotal: resumen[0].monto_total,
                ordenesEntregadas: resumen[0].ordenes_entregadas,
                ordenesPendientes: resumen[0].ordenes_pendientes,
                ordenesVencidas: resumen[0].ordenes_vencidas,
                proveedoresActivos: resumen[0].proveedores_activos,
                tiempoPromedioEntrega: resumen[0].tiempo_promedio_entrega
            },
            distribucionEstados: distribucionEstados,
            topProveedores: topProveedores,
            topMedicamentos: topMedicamentos,
            evolucionMensual: evolucionMensual
        });

    } catch (error) {
        console.error('Error en obtenerReporteCompleto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener reporte',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Exportar reporte a Excel (placeholder)
 */
export const exportarExcel = async (req, res) => {
    try {
        // TODO: Implementar exportación a Excel usando una librería como exceljs

        res.json({
            success: true,
            message: 'Funcionalidad de exportación a Excel próximamente',
            nota: 'Instalar librería exceljs: npm install exceljs'
        });

    } catch (error) {
        console.error('Error en exportarExcel:', error);
        res.status(500).json({
            success: false,
            message: 'Error al exportar reporte',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};
