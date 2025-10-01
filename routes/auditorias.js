import express from 'express';
import * as auditoriasController from '../controllers/auditoriasController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(auth);

// Historial de paciente
router.get('/historial-paciente', auditoriasController.getHistorialPaciente);

// Auditorías pendientes
router.get('/pendientes', auditoriasController.getPendientes);

// Auditoría histórica (solo lectura)
router.get('/:id/historica', auditoriasController.getAuditoriaHistorica);

// Auditorías históricas
router.get('/historicas', auditoriasController.getHistoricas);

// Auditorías médicas (rol 9)
router.get('/medicas', auditoriasController.getAuditoriasMedicas);

// Listado con filtros
router.post('/listado', auditoriasController.getListado);

// Historial de paciente POST
router.post('/paciente', auditoriasController.getHistorialPacientePOST);

// Generar Excel
router.post('/excel', auditoriasController.generarExcel);
router.post('/excel-historial', auditoriasController.exportarHistorialPaciente);
router.post('/generar-excel-datos', auditoriasController.generarExcelConDatos);

// Obtener auditoría completa
router.get('/:id', auditoriasController.getAuditoriaCompleta);

// Procesar auditoría
router.post('/:id/procesar', auditoriasController.procesarAuditoria);

// Enviar a médico auditor
router.post('/:id/enviar-medico', auditoriasController.enviarMedicoAuditor);

// Revertir y borrar
router.put('/:id/revertir', auditoriasController.revertirAuditoria);
router.put('/:id/borrar', auditoriasController.borrarAuditoria);

// Resumen auditoría
router.get('/:id/resumen-auditoria', auditoriasController.obtenerDetalleAuditoria);

// Históricos y pendientes
router.post('/historicos-pendientes', auditoriasController.getHistoricosPendientes);

// PDF
router.post('/:id/generar-pdf', auditoriasController.generarPDF);
router.post('/:id/descargar-pdf', auditoriasController.descargarPDF);

// Historial
router.get('/historial/:id', auditoriasController.getAuditoriaHistorial);

// Farmalink
router.post('/procesarFarmalink', auditoriasController.procesarFarmalink);
router.get('/estadoFarmalink/:id', auditoriasController.verificarEstadoFarmalink);
router.post('/reprocesarFarmalink/:id', auditoriasController.reprocesarFarmalink);
router.get('/logFarmalink/:id', auditoriasController.getLogFarmalink);

// Reenviar email
router.post('/:id/reenviar-email', auditoriasController.reenviarEmail);

export default router;