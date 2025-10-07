// routes/ordenesCompra.js
import express from 'express';
import { body, param, query } from 'express-validator';
import * as ordenesCompraController from '../controllers/ordenesCompraController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticación
router.use(authMiddleware);

// GET /api/ordenes-compra - Listar órdenes
router.get('/', [
    query('estado').optional().isIn(['TODAS', 'BORRADOR', 'ENVIADA', 'CONFIRMADA', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADA']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], ordenesCompraController.listarOrdenes);

// GET /api/ordenes-compra/estadisticas - Estadísticas
router.get('/estadisticas', ordenesCompraController.obtenerEstadisticas);

// GET /api/ordenes-compra/:id - Obtener orden por ID
router.get('/:id', [
    param('id').isInt({ min: 1 })
], ordenesCompraController.obtenerOrdenPorId);

// PUT /api/ordenes-compra/:id/confirmar-entrega - 🔥 Confirmar entrega y notificar
router.put('/:id/confirmar-entrega', [
    param('id').isInt({ min: 1 }),
    body('fechaEntregaReal').optional().isISO8601(),
    body('notificarPaciente').optional().isBoolean(),
    body('observaciones').optional().isString()
], ordenesCompraController.confirmarEntrega);

// PUT /api/ordenes-compra/:id/cambiar-estado - Cambiar estado
router.put('/:id/cambiar-estado', [
    param('id').isInt({ min: 1 }),
    body('nuevoEstado').isIn(['BORRADOR', 'ENVIADA', 'CONFIRMADA', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADA']),
    body('observaciones').optional().isString()
], ordenesCompraController.cambiarEstado);

// PUT /api/ordenes-compra/:id/tracking - Actualizar tracking
router.put('/:id/tracking', [
    param('id').isInt({ min: 1 }),
    body('trackingNumero').optional().isString(),
    body('trackingEmpresa').optional().isString(),
    body('trackingEstado').optional().isString(),
    body('trackingUrl').optional().isURL()
], ordenesCompraController.actualizarTracking);

// DELETE /api/ordenes-compra/:id - Cancelar orden
router.delete('/:id', [
    param('id').isInt({ min: 1 }),
    body('motivo').optional().isString()
], ordenesCompraController.cancelarOrden);

export default router;
