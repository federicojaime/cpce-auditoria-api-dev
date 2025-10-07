// routes/notificaciones.js
import express from 'express';
import { body, param } from 'express-validator';
import * as notificacionesController from '../controllers/notificacionesController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticación
router.use(authMiddleware);

// POST /api/notificaciones/paciente - 🔔 Notificar paciente
router.post('/paciente', [
    body('ordenId').isInt({ min: 1 }).withMessage('ID de orden inválido'),
    body('pacientes').isArray({ min: 1 }).withMessage('Debe proporcionar al menos un paciente'),
    body('pacientes.*.nombre').isString(),
    body('pacientes.*.dni').isString(),
    body('pacientes.*.email').optional().isEmail(),
    body('pacientes.*.telefono').optional().isString(),
    body('tipo').optional().isIn(['MEDICAMENTOS_DISPONIBLES', 'REENVIO_NOTIFICACION', 'ORDEN_CANCELADA', 'RECORDATORIO']),
    body('canal').optional().isIn(['EMAIL_SMS', 'EMAIL', 'SMS', 'WHATSAPP']),
    body('urgencia').optional().isIn(['ALTA', 'MEDIA', 'BAJA'])
], notificacionesController.notificarPaciente);

// POST /api/notificaciones/:id/reenviar - Reenviar notificación
router.post('/:id/reenviar', [
    param('id').isInt({ min: 1 }),
    body('canal').optional().isIn(['EMAIL_SMS', 'EMAIL', 'SMS'])
], notificacionesController.reenviarNotificacion);

// GET /api/notificaciones/orden/:ordenId - Historial de notificaciones
router.get('/orden/:ordenId', [
    param('ordenId').isInt({ min: 1 })
], notificacionesController.obtenerHistorialNotificaciones);

// GET /api/notificaciones/estadisticas - Estadísticas
router.get('/estadisticas', notificacionesController.obtenerEstadisticasNotificaciones);

export default router;
