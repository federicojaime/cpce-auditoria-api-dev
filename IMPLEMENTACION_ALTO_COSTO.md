# Implementación de Alto Costo

## Estado Actual

✅ **Tablas identificadas:**
- `rec_receta_alto_costo` - Recetas de alto costo
- `rec_prescrmedicamento_alto_costo` - Medicamentos de alto costo

✅ **Controller creado:** `controllers/altoCostoController.js`
- getPendientes() - Filtra por `altocosto = 1` ✅
- getHistoricas() - Filtra por `altocosto = 1` ✅
- getAuditoriaCompleta() - Usa tablas de alto costo ✅

## Pendiente

⏳ **Falta agregar al controller de Alto Costo:**

1. **procesarAuditoria()** - Procesar y aprobar/rechazar medicamentos de alto costo
2. **generarPDF()** - Generar PDF para auditorías de alto costo
3. **Rutas necesarias:**
   - POST `/api/alto-costo/:id/procesar`
   - POST `/api/alto-costo/:id/generar-pdf`

## Nota Importante

Las funciones de generación de HTML para PDFs (`generarHTMLReceta`, `generarHTMLRecetaDuplicado`, `generarHTMLRecetaRechazada`) son compartidas entre Tratamiento Prolongado y Alto Costo.

Los cambios de formato y logos ya están aplicados en `controllers/auditoriasController.js` y se reutilizarán para Alto Costo.

## Siguiente Paso

Crear las funciones `procesarAuditoria` y `generarPDF` en el controlador de Alto Costo que:
- Usen las tablas `rec_prescrmedicamento_alto_costo` y `rec_receta_alto_costo`
- Reutilicen las funciones de generación de HTML existentes
- Mantengan la misma lógica de negocio que Tratamiento Prolongado
