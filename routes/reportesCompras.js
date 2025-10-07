// routes/reportesCompras.js
import express from 'express';
import { query } from 'express-validator';
import * as reportesComprasController from '../controllers/reportesComprasController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticación
router.use(authMiddleware);

// GET /api/reportes-compras - Obtener reporte completo
router.get('/', [
    query('fechaDesde').optional().isISO8601(),
    query('fechaHasta').optional().isISO8601(),
    query('proveedor').optional().isString(),
    query('estado').optional().isString()
], reportesComprasController.obtenerReporteCompleto);

// POST /api/reportes-compras/exportar-excel - Exportar a Excel
router.post('/exportar-excel', reportesComprasController.exportarExcel);

export default router;
