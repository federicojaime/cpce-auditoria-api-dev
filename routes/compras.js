import express from 'express';
import * as comprasController from '../controllers/comprasController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ============================================
// RUTAS DE COMPRAS - ALTO COSTO
// ============================================

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
