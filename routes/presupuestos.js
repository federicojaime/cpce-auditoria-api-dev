// routes/presupuestos.js
import express from 'express';
import { body, param, query } from 'express-validator';
import * as presupuestosController from '../controllers/presupuestosController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
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

export default router;
