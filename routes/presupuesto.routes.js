import express from 'express';
import {
    crearSolicitudPresupuesto,
    obtenerSolicitudPorToken,
    responderSolicitud,
    listarSolicitudes,
    obtenerDetalleSolicitud,
    compararPresupuestos
} from '../controllers/presupuestoController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================

/**
 * @route   POST /api/presupuestos/solicitar
 * @desc    Crear una nueva solicitud de presupuesto y enviar emails a proveedores
 * @access  Privado (usuarios autenticados)
 * @body    {
 *            auditoriaIds: number[],
 *            proveedorIds: number[],
 *            observaciones?: string
 *          }
 */
router.post('/solicitar', authenticateToken, crearSolicitudPresupuesto);

/**
 * @route   GET /api/presupuestos/solicitudes
 * @desc    Listar todas las solicitudes de presupuesto con paginación
 * @access  Privado (usuarios autenticados)
 * @query   estado?: string, page?: number, limit?: number
 */
router.get('/solicitudes', authenticateToken, listarSolicitudes);

/**
 * @route   GET /api/presupuestos/solicitudes/:id
 * @desc    Obtener detalles completos de una solicitud con respuestas
 * @access  Privado (usuarios autenticados)
 * @param   id - ID de la solicitud
 */
router.get('/solicitudes/:id', authenticateToken, obtenerDetalleSolicitud);

/**
 * @route   GET /api/presupuestos/comparar/:solicitudId
 * @desc    Comparar presupuestos de diferentes proveedores para una solicitud
 * @access  Privado (usuarios autenticados)
 * @param   solicitudId - ID de la solicitud
 */
router.get('/comparar/:solicitudId', authenticateToken, compararPresupuestos);

// ========================================
// RUTAS PÚBLICAS (no requieren autenticación)
// ========================================

/**
 * @route   GET /api/presupuestos/solicitud/:token
 * @desc    Obtener información de una solicitud usando el token (para proveedores)
 * @access  Público
 * @param   token - Token único enviado por email
 */
router.get('/solicitud/:token', obtenerSolicitudPorToken);

/**
 * @route   POST /api/presupuestos/responder/:token
 * @desc    Enviar respuesta de presupuesto (usado por proveedores)
 * @access  Público
 * @param   token - Token único enviado por email
 * @body    {
 *            respuestas: Array<{
 *              auditoriaId: number,
 *              medicamentoId: number,
 *              acepta: boolean,
 *              precio?: number,
 *              fechaRetiro?: string,
 *              fechaVencimiento?: string,
 *              comentarios?: string
 *            }>
 *          }
 */
router.post('/responder/:token', responderSolicitud);

export default router;
