// routes/reportes.js - Rutas de reportes SIN autenticación (temporal)

import express from 'express';
import * as comprasReportesController from '../controllers/comprasReportesController.js';

const router = express.Router();

// Middleware para convertir nombres de parámetros del frontend
const convertirParametrosFrontend = (req, res, next) => {
    console.log('[REPORTES ROUTER] Petición recibida:', req.method, req.path);
    console.log('[REPORTES ROUTER] Query original:', req.query);

    // Convertir fechaInicio -> fechaDesde
    if (req.query.fechaInicio) {
        req.query.fechaDesde = req.query.fechaInicio;
    }
    // Convertir fechaFin -> fechaHasta
    if (req.query.fechaFin) {
        req.query.fechaHasta = req.query.fechaFin;
    }

    console.log('[REPORTES ROUTER] Query convertido:', req.query);
    next();
};

// Aplicar conversión a todas las rutas
router.use(convertirParametrosFrontend);

// ============================================
// RUTAS DE REPORTES (SIN AUTENTICACIÓN)
// ============================================

/**
 * @route   GET /api/reportes/estadisticas
 * @desc    Obtener estadísticas ejecutivas de compras
 * @access  Público (temporal para testing)
 */
router.get('/estadisticas', comprasReportesController.obtenerEstadisticasEjecutivas);

/**
 * @route   GET /api/reportes/distribucion-estados
 * @desc    Obtener distribución de órdenes por estado
 * @access  Público (temporal para testing)
 */
router.get('/distribucion-estados', comprasReportesController.obtenerDistribucionEstados);

/**
 * @route   GET /api/reportes/cumplimiento
 * @desc    Análisis de cumplimiento de tiempos de entrega
 * @access  Público (temporal para testing)
 */
router.get('/cumplimiento', comprasReportesController.obtenerAnalisisCumplimiento);

/**
 * @route   GET /api/reportes/ranking-proveedores
 * @desc    Ranking de proveedores por desempeño
 * @access  Público (temporal para testing)
 */
router.get('/ranking-proveedores', comprasReportesController.obtenerRankingProveedores);

/**
 * @route   GET /api/reportes/ordenes
 * @desc    Listar órdenes de compra con filtros
 * @access  Público (temporal para testing)
 */
router.get('/ordenes', comprasReportesController.listarOrdenes);

/**
 * @route   GET /api/reportes/ordenes/:id
 * @desc    Obtener detalle completo de una orden
 * @access  Público (temporal para testing)
 */
router.get('/ordenes/:id', comprasReportesController.obtenerDetalleOrden);

/**
 * @route   GET /api/reportes/dashboard-ejecutivo
 * @desc    Dashboard ejecutivo completo con KPIs, gráficos y evolución
 * @access  Público (temporal para testing)
 */
router.get('/dashboard-ejecutivo', comprasReportesController.generarDashboardEjecutivo);

/**
 * @route   GET /api/reportes/analisis-logistica
 * @desc    Análisis detallado de logística (tiempos, puntos de retiro, cumplimiento)
 * @access  Público (temporal para testing)
 */
router.get('/analisis-logistica', comprasReportesController.analizarLogistica);

/**
 * @route   GET /api/reportes/proyeccion-costos
 * @desc    Proyección de costos y tendencias futuras
 * @access  Público (temporal para testing)
 */
router.get('/proyeccion-costos', comprasReportesController.proyectarCostos);

export default router;
