const express = require('express');
const router = express.Router();
const auditoriasController = require('../controllers/auditoriasController');
const auth = require('../middleware/auth');

// Todas las rutas de auditorías requieren autenticación
router.use(auth); // CAMBIAR authMiddleware por auth

// Ruta para historial de paciente (GET) - 
router.get('/historial-paciente', auditoriasController.getHistorialPaciente);

// GET /api/auditorias/pendientes - Obtener auditorías pendientes
router.get('/pendientes', auditoriasController.getPendientes);

// GET /api/auditorias/historica - Obtener auditorías históricas solo para ver
router.get('/:id/historica', auditoriasController.getAuditoriaHistorica);

// GET /api/auditorias/historicas - Obtener auditorías históricas
router.get('/historicas', auditoriasController.getHistoricas);

// GET /api/auditorias/medicas - Obtener auditorías médicas (solo rol 9)
router.get('/medicas', auditoriasController.getAuditoriasMedicas);

// POST /api/auditorias/listado - Obtener listado con filtros
router.post('/listado', auditoriasController.getListado);

// POST /api/auditorias/paciente - Obtener historial de un paciente
router.post('/paciente', auditoriasController.getHistorialPacientePOST);

// POST /api/auditorias/excel - Generar reporte Excel por mes
router.post('/excel', auditoriasController.generarExcel);

// POST /api/auditorias/excel-historial - Exportar historial de paciente
router.post('/excel-historial', auditoriasController.exportarHistorialPaciente);

// GET /api/auditorias/:id - Obtener datos completos para auditar
router.get('/:id', auditoriasController.getAuditoriaCompleta);

// POST /api/auditorias/:id/procesar - Procesar auditoría (aprobar/denegar medicamentos)
router.post('/:id/procesar', auditoriasController.procesarAuditoria);

// POST /api/auditorias/:id/enviar-medico - Enviar a médico auditor
router.post('/:id/enviar-medico', auditoriasController.enviarMedicoAuditor);

// POST /api/auditorias/:id/revertir-borrar - Revertir o borrar auditoría
router.put('/:id/revertir', auditoriasController.revertirAuditoria);
router.put('/:id/borrar', auditoriasController.borrarAuditoria); 

// GET /api/auditorias/:id/resumen-auditoria - ver detalles para  Revertir o borrar auditoría
router.get('/:id/resumen-auditoria', auditoriasController.obtenerDetalleAuditoria); 

// GET /api/auditorias/historicos-pendientes - verlistado autorias pendientes e historicos
router.post('/historicos-pendientes', auditoriasController.getHistoricosPendientes);

router.post('/:id/generar-pdf', auth, auditoriasController.generarPDF);
router.post('/:id/descargar-pdf', auth, auditoriasController.descargarPDF);

// POST /api/auditorias/generar-excel-datos - Generar Excel con datos específicos
router.post('/generar-excel-datos', auditoriasController.generarExcelConDatos);

// GET ver auditoria historial 
router.get('/historial/:id', auditoriasController.getAuditoriaHistorial);


// rutas farmalink
router.post('/procesarFarmalink', auditoriasController.procesarFarmalink);
router.get('/estadoFarmalink/:id', auditoriasController.verificarEstadoFarmalink);
router.post('/reprocesarFarmalink/:id', auditoriasController.reprocesarFarmalink);
router.get('/logFarmalink/:id', auditoriasController.getLogFarmalink);

router.post('/:id/reenviar-email', auditoriasController. reenviarEmail);

module.exports = router;