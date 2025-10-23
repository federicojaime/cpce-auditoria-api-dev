// routes/presupuestos.js
import express from 'express';
import { body, param, query } from 'express-validator';
import * as presupuestosController from '../controllers/presupuestosController.js';
import * as presupuestoTokenController from '../controllers/presupuestoTokenController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// ========================================
// RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
// Estas rutas deben estar ANTES del middleware de autenticación
// ========================================

/**
 * @route   GET /api/presupuestos/solicitud/:token
 * @desc    Obtener información de solicitud por token (para proveedores externos)
 * @access  Público
 */
router.get('/solicitud/:token', presupuestoTokenController.obtenerSolicitudPorToken);

/**
 * @route   POST /api/presupuestos/responder/:token
 * @desc    Enviar respuesta de presupuesto (para proveedores externos)
 * @access  Público
 */
router.post('/responder/:token', [
    body('respuestas').isArray({ min: 1 }).withMessage('Debe proporcionar al menos una respuesta')
], presupuestoTokenController.responderSolicitud);

// ========================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// Aplicar autenticación a todas las rutas siguientes
// ========================================
router.use(authMiddleware);

// POST /api/presupuestos/solicitar - Solicitar presupuesto
router.post('/solicitar', [
    body('auditorias').isArray({ min: 1 }).withMessage('Debe proporcionar al menos una auditoría'),
    body('proveedores').isArray({ min: 1 }).withMessage('Debe proporcionar al menos un proveedor'),
    body('urgencia').optional().isIn(['ALTA', 'MEDIA', 'BAJA'])
], presupuestosController.solicitarPresupuesto);

// GET /api/presupuestos/solicitudes - Listar solicitudes
router.get('/solicitudes', [
    query('estado').optional().isIn(['TODOS', 'ENVIADO', 'PARCIAL', 'COMPLETO', 'ADJUDICADO', 'CANCELADO']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], presupuestosController.listarSolicitudes);

// POST /api/presupuestos/:solicitudId/adjudicar - Adjudicar presupuesto
router.post('/:solicitudId/adjudicar', [
    param('solicitudId').isInt({ min: 1 }),
    body('proveedorId').isInt({ min: 1 }).withMessage('ID de proveedor inválido'),
    body('motivo').optional().isString()
], presupuestosController.adjudicarPresupuesto);

// GET /api/presupuestos/estadisticas - Estadísticas
router.get('/estadisticas', presupuestosController.obtenerEstadisticas);

// GET /api/presupuestos/auditorias-disponibles - Auditorías aprobadas para solicitar presupuesto
router.get('/auditorias-disponibles', [
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], presupuestosController.obtenerAuditoriasDisponibles);

// ========================================
// NUEVAS RUTAS - Sistema de Solicitud con Tokens
// ========================================

/**
 * @route   POST /api/presupuestos/solicitar-con-email
 * @desc    Crear solicitud de presupuesto y enviar emails con tokens a proveedores
 * @access  Privado
 */
router.post('/solicitar-con-email', [
    body('auditoriaIds').isArray({ min: 1 }).withMessage('Debe proporcionar al menos una auditoría'),
    body('proveedorIds').isArray({ min: 1 }).withMessage('Debe proporcionar al menos un proveedor'),
    body('observaciones').optional().isString()
], presupuestoTokenController.crearSolicitudPresupuesto);

/**
 * @route   GET /api/presupuestos/solicitudes-email
 * @desc    Listar solicitudes de presupuesto con tokens (sistema nuevo)
 * @access  Privado
 */
router.get('/solicitudes-email', [
    query('estado').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], presupuestoTokenController.listarSolicitudes);

/**
 * @route   GET /api/presupuestos/solicitudes-email/:id
 * @desc    Obtener detalles de una solicitud con todas las respuestas
 * @access  Privado
 */
router.get('/solicitudes-email/:id', [
    param('id').isInt({ min: 1 })
], presupuestoTokenController.obtenerDetalleSolicitud);

/**
 * @route   GET /api/presupuestos/comparar/:solicitudId
 * @desc    Comparar presupuestos de diferentes proveedores
 * @access  Privado
 */
router.get('/comparar/:solicitudId', [
    param('solicitudId').isInt({ min: 1 })
], presupuestoTokenController.compararPresupuestos);

/**
 * @route   GET /api/presupuestos/estadisticas-email
 * @desc    Obtener contadores de solicitudes por estado
 * @access  Privado
 */
router.get('/estadisticas-email', presupuestoTokenController.obtenerEstadisticas);

/**
 * @route   PUT /api/presupuestos/solicitudes-email/:id/estado
 * @desc    Actualizar estado de una solicitud
 * @access  Privado
 */
router.put('/solicitudes-email/:id/estado', [
    param('id').isInt({ min: 1 }),
    body('estado').isIn(['ENVIADO', 'PARCIAL', 'COMPLETADO', 'VENCIDO', 'ADJUDICADO', 'CANCELADO'])
], presupuestoTokenController.actualizarEstadoSolicitud);

/**
 * @route   POST /api/presupuestos/solicitudes-email/:id/adjudicar
 * @desc    Adjudicar presupuesto a un proveedor y crear órdenes de compra
 * @access  Privado
 */
router.post('/solicitudes-email/:id/adjudicar', [
    param('id').isInt({ min: 1 }),
    body('proveedorId').isInt({ min: 1 }).withMessage('ID de proveedor inválido'),
    body('observaciones').optional().isString()
], presupuestoTokenController.adjudicarPresupuesto);

/**
 * @route   PUT /api/presupuestos/ordenes/:id/estado
 * @desc    Actualizar estado de una orden de compra y notificar al paciente
 * @access  Privado
 */
router.put('/ordenes/:id/estado', [
    param('id').isInt({ min: 1 }),
    body('nuevoEstado').isIn(['adjudicado', 'confirmado', 'en_preparacion', 'listo_retiro', 'entregado', 'cancelado', 'finalizado'])
        .withMessage('Estado inválido'),
    body('observaciones').optional().isString()
], presupuestoTokenController.actualizarEstadoOrdenCompra);

export default router;
