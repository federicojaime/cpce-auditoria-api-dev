import express from 'express';
import { query, param } from 'express-validator';
import * as comprasController from '../controllers/comprasController.js';
import * as comprasReportesController from '../controllers/comprasReportesController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware para convertir nombres de parámetros del frontend
const convertirParametrosFrontend = (req, res, next) => {
    // Convertir fechaInicio -> fechaDesde
    if (req.query.fechaInicio) {
        req.query.fechaDesde = req.query.fechaInicio;
    }
    // Convertir fechaFin -> fechaHasta
    if (req.query.fechaFin) {
        req.query.fechaHasta = req.query.fechaFin;
    }
    next();
};

// Aplicar conversión de parámetros a rutas de reportes (ANTES de autenticación)
router.use('/reportes', convertirParametrosFrontend);

// ============================================
// RUTAS DE REPORTES Y ANÁLISIS DE COMPRAS (SIN AUTENTICACIÓN - TEMPORAL)
// ============================================

/**
 * @route   GET /api/compras/reportes/estadisticas
 * @desc    Obtener estadísticas ejecutivas de compras
 * @access  Público (temporal)
 */
router.get('/reportes/estadisticas',
    comprasReportesController.obtenerEstadisticasEjecutivas
);

/**
 * @route   GET /api/compras/reportes/distribucion-estados
 * @desc    Obtener distribución de órdenes por estado
 * @access  Privado
 */
router.get('/reportes/distribucion-estados',
    comprasReportesController.obtenerDistribucionEstados
);

/**
 * @route   GET /api/compras/reportes/cumplimiento
 * @desc    Análisis de cumplimiento de tiempos de entrega
 * @access  Público (temporal)
 */
router.get('/reportes/cumplimiento',
    comprasReportesController.obtenerAnalisisCumplimiento
);

/**
 * @route   GET /api/compras/reportes/ranking-proveedores
 * @desc    Ranking de proveedores por desempeño
 * @access  Público (temporal)
 */
router.get('/reportes/ranking-proveedores',
    comprasReportesController.obtenerRankingProveedores
);

/**
 * @route   GET /api/compras/ordenes
 * @desc    Listar órdenes de compra con filtros
 * @access  Público (temporal)
 */
router.get('/ordenes',
    comprasReportesController.listarOrdenes
);

/**
 * @route   GET /api/compras/ordenes/:id
 * @desc    Obtener detalle completo de una orden
 * @access  Público (temporal)
 */
router.get('/ordenes/:id',
    comprasReportesController.obtenerDetalleOrden
);

// ============================================
// RUTAS LEGACY DE COMPRAS - ALTO COSTO (REQUIEREN AUTENTICACIÓN)
// ============================================

// Todas las rutas siguientes requieren autenticación
router.use(authenticateToken);

// Obtener auditorías aprobadas pendientes de enviar a proveedores
router.get('/pendientes', comprasController.getPendientes);

// Obtener recetas enviadas a proveedores (esperando presupuestos)
router.get('/enviadas', comprasController.getEnviadas);

// Obtener detalle de una receta para compras
router.get('/:id', comprasController.getDetalle);

// Obtener lista de proveedores activos
router.get('/proveedores/lista', comprasController.getProveedores);

// Enviar solicitud a proveedores seleccionados
router.post('/:id/enviar-proveedores', comprasController.enviarProveedores);

// Obtener presupuestos recibidos para una receta
router.get('/:id/presupuestos', comprasController.getPresupuestos);

// Seleccionar presupuestos y generar PDF
router.post('/:id/seleccionar-presupuestos', comprasController.seleccionarPresupuestos);

export default router;
