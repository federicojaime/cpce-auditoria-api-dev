# Sistema de Solicitud de Presupuestos con Tokens

## Resumen Ejecutivo

Sistema completo para solicitar presupuestos a proveedores externos mediante emails con enlaces únicos y seguros. Los proveedores responden sin necesidad de ingresar al sistema.

### Características Principales
- ✅ Emails automáticos a proveedores con enlaces únicos
- ✅ Tokens seguros con expiración de 72 horas
- ✅ Formulario público sin autenticación
- ✅ Respuestas individuales por medicamento
- ✅ Notificaciones automáticas
- ✅ Comparación de presupuestos

---

## Archivos Creados

\`\`\`
📁 Proyecto
│
├── 📂 controllers/
│   └── presupuestoController.js                    # ✅ Nuevo controlador completo
│
├── 📂 routes/
│   └── presupuestos.js                             # ✅ Actualizado con rutas públicas
│
├── 📂 services/
│   └── emailService.js                             # ✅ Actualizado con nuevas funciones
│
├── 📂 database/migrations/
│   └── create_presupuestos_tables.sql              # ✅ Script SQL con 5 tablas
│
├── 📂 public/
│   └── formulario-proveedor-ejemplo.html           # ✅ Ejemplo de formulario frontend
│
├── 📄 DOCUMENTACION_PRESUPUESTOS.md                # ✅ Documentación completa
├── 📄 GUIA_RAPIDA_IMPLEMENTACION.md               # ✅ Guía paso a paso
├── 📄 EJEMPLOS_API_PRESUPUESTOS.md                # ✅ Ejemplos de API con cURL
└── 📄 README_PRESUPUESTOS.md                      # ✅ Este archivo
\`\`\`

---

## Inicio Rápido (5 minutos)

### Paso 1: Ejecutar migración SQL
\`\`\`bash
mysql -u root -p cpce_auditoria < database/migrations/create_presupuestos_tables.sql
\`\`\`

### Paso 2: Reiniciar servidor
\`\`\`bash
npm run dev
\`\`\`

### Paso 3: Probar endpoint
\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/solicitar-con-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"auditoriaIds":[17,18],"proveedorIds":[1,2,3],"observaciones":"Test"}'
\`\`\`

---

## Endpoints Disponibles

### 🌐 PÚBLICOS (sin autenticación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/presupuestos/solicitud/:token` | Ver solicitud (proveedor) |
| POST | `/api/presupuestos/responder/:token` | Enviar respuesta (proveedor) |

### 🔒 PROTEGIDOS (requieren JWT)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/presupuestos/solicitar-con-email` | Crear solicitud |
| GET | `/api/presupuestos/solicitudes-email` | Listar solicitudes |
| GET | `/api/presupuestos/solicitudes-email/:id` | Ver detalles |
| GET | `/api/presupuestos/comparar/:solicitudId` | Comparar presupuestos |

---

## Flujo de Trabajo

\`\`\`
1. Usuario crea solicitud
   ↓
2. Sistema envía emails con tokens a proveedores
   ↓
3. Proveedor recibe email con enlace único
   ↓
4. Proveedor hace clic y accede sin login
   ↓
5. Proveedor completa formulario:
   - Acepta/Rechaza cada medicamento
   - Precio, fecha retiro, fecha vencimiento
   - Comentarios
   ↓
6. Sistema guarda respuesta y notifica a admins
   ↓
7. Usuario interno ve y compara todas las ofertas
\`\`\`

---

## Base de Datos

### Tablas Creadas (5)

1. **presupuesto_solicitudes** - Solicitudes principales
2. **presupuesto_solicitud_proveedores** - Proveedores con tokens
3. **presupuesto_solicitud_auditorias** - Auditorías incluidas
4. **presupuesto_respuestas** - Respuestas por medicamento
5. **presupuesto_notificaciones** - Log de notificaciones

---

## Ejemplo de Uso Completo

### 1. Crear Solicitud (Usuario Interno)

\`\`\`javascript
POST /api/presupuestos/solicitar-con-email

Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "auditoriaIds": [17, 18],
  "proveedorIds": [1, 2, 3],
  "observaciones": "Urgente"
}

Response:
{
  "solicitudId": 1,
  "loteNumero": "LOTE-20251020-0001",
  "auditorias": 2,
  "proveedores": 3,
  "fechaExpiracion": "2025-10-23T10:00:00.000Z",
  "resultadosEnvio": [...]
}
\`\`\`

### 2. Ver Solicitud (Proveedor - Público)

\`\`\`javascript
GET /api/presupuestos/solicitud/TOKEN_DEL_EMAIL

Response:
{
  "solicitud": {
    "loteNumero": "LOTE-20251020-0001",
    "fechaExpiracion": "2025-10-23T10:00:00.000Z",
    "proveedor": {...}
  },
  "auditorias": [
    {
      "id": 17,
      "paciente_nombre": "Jaime, Federico",
      "medicamentos": [...]
    }
  ]
}
\`\`\`

### 3. Responder (Proveedor - Público)

\`\`\`javascript
POST /api/presupuestos/responder/TOKEN_DEL_EMAIL

Body:
{
  "respuestas": [
    {
      "auditoriaId": 17,
      "medicamentoId": 1,
      "acepta": true,
      "precio": 1500.50,
      "fechaRetiro": "2025-10-25",
      "fechaVencimiento": "2026-12-31",
      "comentarios": "Disponible"
    }
  ]
}

Response:
{
  "mensaje": "Respuesta enviada exitosamente"
}
\`\`\`

### 4. Comparar Presupuestos (Usuario Interno)

\`\`\`javascript
GET /api/presupuestos/comparar/1

Headers:
  Authorization: Bearer <jwt_token>

Response:
{
  "comparacion": [
    {
      "medicamento": {...},
      "ofertas": [...],
      "mejorOferta": {
        "proveedor": "Droguería del Sud",
        "precio": "1450.00"
      }
    }
  ]
}
\`\`\`

---

## Configuración de Email

Ya configurado en `services/emailService.js`:

\`\`\`javascript
host: 'smtp.hostinger.com'
port: 587
user: 'envios@codeo.site'
password: 'D^z2ZL70$13b'
\`\`\`

---

## Frontend (Ejemplo HTML)

Se incluye un archivo HTML completo y funcional en:
\`\`\`
public/formulario-proveedor-ejemplo.html
\`\`\`

Ábrelo en el navegador con:
\`\`\`
http://localhost:3000/formulario-proveedor-ejemplo.html?token=TOKEN_AQUI
\`\`\`

O integra el código en tu aplicación React/Vue/Angular siguiendo el ejemplo.

---

## Seguridad

- ✅ Tokens únicos generados con crypto (64 caracteres hex)
- ✅ Expiración automática en 72 horas
- ✅ No reutilizables después de responder
- ✅ Verificación de expiración en cada acceso
- ✅ Validación de campos obligatorios
- ✅ Transacciones SQL para integridad de datos

---

## Testing

### Verificar que todo funciona:

\`\`\`bash
# 1. Health check
curl http://localhost:3000/health

# 2. Ver tablas creadas
mysql -u root -p -e "USE cpce_auditoria; SHOW TABLES LIKE 'presupuesto%';"

# 3. Crear solicitud de prueba
curl -X POST http://localhost:3000/api/presupuestos/solicitar-con-email \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auditoriaIds":[17],"proveedorIds":[1],"observaciones":"Test"}'

# 4. Ver solicitudes
curl -X GET http://localhost:3000/api/presupuestos/solicitudes-email \
  -H "Authorization: Bearer TOKEN"
\`\`\`

---

## Documentación Completa

Para información detallada, consulta:

- 📖 **DOCUMENTACION_PRESUPUESTOS.md** - Documentación técnica completa
- 🚀 **GUIA_RAPIDA_IMPLEMENTACION.md** - Guía de implementación paso a paso
- 💻 **EJEMPLOS_API_PRESUPUESTOS.md** - Ejemplos de uso con cURL y Postman

---

## Soporte

Si tienes preguntas o problemas:

1. Revisa la documentación completa
2. Verifica los logs del servidor
3. Consulta los ejemplos de API
4. Verifica que las tablas se crearon correctamente

---

## Próximas Mejoras Sugeridas

- [ ] Sistema de recordatorios (24h antes de expirar)
- [ ] Permitir modificar respuesta con confirmación
- [ ] Dashboard visual de comparación
- [ ] Exportar comparación a PDF/Excel
- [ ] Historial de presupuestos por proveedor
- [ ] Sistema de puntuación de proveedores
- [ ] Adjuntar documentos (facturas, certificados)

---

## ¡Todo Listo! 🎉

El sistema está completamente implementado y listo para usar. Solo necesitas:

1. ✅ Ejecutar el script SQL
2. ✅ Reiniciar el servidor
3. ✅ Probar los endpoints

**¡A trabajar! 🚀**

---

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Desarrollado para:** CPCE - Sistema de Auditorías
