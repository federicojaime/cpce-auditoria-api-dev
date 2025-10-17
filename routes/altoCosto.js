import express from 'express';
import * as altoCostoController from '../controllers/altoCostoController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(auth);

// Auditorías pendientes de alto costo
router.get('/pendientes', altoCostoController.getPendientes);

// Auditorías históricas de alto costo
router.get('/historicas', altoCostoController.getHistoricas);

// Obtener auditoría completa de alto costo
router.get('/:id', altoCostoController.getAuditoriaCompleta);

// Procesar auditoría de alto costo (Aprobar/Rechazar)
router.post('/:id/procesar', altoCostoController.procesarAuditoria);

// Generar PDF de alto costo
router.post('/:id/generar-pdf', altoCostoController.generarPDF);

export default router;
