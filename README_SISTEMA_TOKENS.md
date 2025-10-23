# Sistema de Tokens para Presupuestos - Guía de Implementación

## ¡IMPORTANTE! - Sobre tu Base de Datos

Ya tienes tablas de presupuestos creadas con prefijo `alt_`:
- ✅ `alt_solicitud_presupuesto`
- ✅ `alt_solicitud_presupuesto_auditoria`
- ✅ `alt_solicitud_presupuesto_proveedor`
- ✅ `alt_presupuesto_respuesta`
- ✅ `alt_proveedor`

**Este sistema AGREGA funcionalidad** a lo que ya tienes, **NO BORRA NADA**.

---

## Paso 1: Ejecutar Script SQL

Ejecuta **UNA SOLA VEZ** el siguiente archivo:

\`\`\`bash
mysql -u root -p u565673608_AltaLuna < database/migrations/agregar_sistema_tokens_presupuestos.sql
\`\`\`

O desde tu gestor visual (phpMyAdmin/Workbench):
- Abre: `database/migrations/agregar_sistema_tokens_presupuestos.sql`
- Ejecuta todo el contenido

### ¿Qué hace este script?

1. **Agrega 2 columnas** a `alt_solicitud_presupuesto_proveedor`:
   - `token` (VARCHAR 255) - Token único para proveedores
   - `fecha_expiracion` (DATETIME) - Expira en 72 horas

2. **Crea 1 tabla nueva**: `alt_presupuesto_respuesta_detalle`
   - Guarda respuestas individuales por cada medicamento

3. **Crea 1 tabla opcional**: `alt_presupuesto_notificaciones`
   - Log de notificaciones enviadas

4. **Actualiza enum de estados** en `alt_solicitud_presupuesto_proveedor`
   - Agrega: 'RESPONDIDO', 'EXPIRADO'

5. **Agrega índices** para optimizar consultas

---

## Paso 2: Verificar que se ejecutó correctamente

\`\`\`sql
-- Ver columnas agregadas
SHOW COLUMNS FROM alt_solicitud_presupuesto_proveedor LIKE '%token%';

-- Ver tabla nueva
SHOW TABLES LIKE 'alt_presupuesto_respuesta_detalle';

-- Ver estructura completa
DESCRIBE alt_solicitud_presupuesto_proveedor;
\`\`\`

Deberías ver:
- Columna `token`
- Columna `fecha_expiracion`
- Tabla `alt_presupuesto_respuesta_detalle`

---

## Paso 3: Reiniciar el Servidor

\`\`\`bash
npm run dev
\`\`\`

---

## Paso 4: Probar el Sistema

### A) Crear una solicitud

\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/solicitar-con-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "auditoriaIds": [1, 2],
    "proveedorIds": [1, 2],
    "observaciones": "Prueba de sistema de tokens"
  }'
\`\`\`

**Respuesta esperada:**
\`\`\`json
{
  "mensaje": "Solicitud de presupuesto creada exitosamente",
  "solicitudId": 1,
  "loteNumero": "LOTE-20251020-0001",
  "auditorias": 2,
  "proveedores": 2,
  "fechaExpiracion": "2025-10-23T10:00:00.000Z",
  "resultadosEnvio": [
    {
      "proveedor": "Droguería Alta Luna S.R.L.s",
      "email": "federiconj@gmail.com",
      "enviado": true
    }
  ]
}
\`\`\`

### B) Verificar que se generaron los tokens

\`\`\`sql
SELECT
    p.razon_social,
    sp.token,
    sp.fecha_expiracion,
    sp.estado
FROM alt_solicitud_presupuesto_proveedor sp
JOIN alt_proveedor p ON sp.id_proveedor = p.id_proveedor
WHERE sp.id_solicitud = 1;
\`\`\`

Deberías ver:
- Un token de 64 caracteres para cada proveedor
- Fecha de expiración = ahora + 72 horas
- Estado = 'ENVIADO'

### C) Los proveedores reciben email

Revisa la bandeja de entrada de los proveedores. Deberían ver un email con:
- Asunto: "📋 Solicitud de Presupuesto - Lote LOTE-20251020-0001"
- Un enlace como: `http://localhost:3000/presupuesto/responder/a1b2c3d4e5f6...`

### D) Probar que un proveedor puede ver la solicitud (SIN LOGIN)

\`\`\`bash
# Copia el token de la base de datos o del email
curl http://localhost:3000/api/presupuestos/solicitud/TOKEN_AQUI
\`\`\`

**Respuesta esperada:**
\`\`\`json
{
  "solicitud": {
    "loteNumero": "LOTE-20251020-0001",
    "fechaEnvio": "...",
    "fechaExpiracion": "...",
    "proveedor": {
      "nombre": "Droguería Alta Luna S.R.L.s",
      "email": "federiconj@gmail.com"
    }
  },
  "auditorias": [
    {
      "id": 1,
      "paciente_nombre": "Jaime, Federico",
      "medicamentos": [...]
    }
  ]
}
\`\`\`

### E) Proveedor envía respuesta

\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/responder/TOKEN_AQUI \
  -H "Content-Type: application/json" \
  -d '{
    "respuestas": [
      {
        "auditoriaId": 1,
        "medicamentoId": 1,
        "acepta": true,
        "precio": 1500.50,
        "fechaRetiro": "2025-10-25",
        "fechaVencimiento": "2026-12-31",
        "comentarios": "Disponible"
      }
    ]
  }'
\`\`\`

**Respuesta esperada:**
\`\`\`json
{
  "mensaje": "Respuesta enviada exitosamente",
  "loteNumero": "LOTE-20251020-0001",
  "proveedor": "Droguería Alta Luna S.R.L.s",
  "respuestasEnviadas": 1
}
\`\`\`

### F) Ver respuestas (Usuario Interno)

\`\`\`bash
curl http://localhost:3000/api/presupuestos/solicitudes-email/1 \
  -H "Authorization: Bearer TU_TOKEN_JWT"
\`\`\`

---

## Archivos Creados

\`\`\`
proyecto/
│
├── 📂 database/migrations/
│   └── agregar_sistema_tokens_presupuestos.sql    ✅ Script SQL limpio
│
├── 📂 controllers/
│   ├── presupuestoTokenController.js              ✅ Nuevo controlador
│   └── presupuestoController.js                   ⚠️ Antiguo (puedes eliminarlo)
│
├── 📂 routes/
│   └── presupuestos.js                            ✅ Actualizado
│
├── 📂 services/
│   └── emailService.js                            ✅ Ya actualizado
│
└── 📄 README_SISTEMA_TOKENS.md                    📖 Esta guía
\`\`\`

---

## Diferencias con lo que Ya Tenías

### Antes (Sistema existente):
- Proveedores debían ingresar al sistema con usuario/password
- Respuestas genéricas por solicitud completa
- Sin expiración de solicitudes

### Ahora (Con tokens):
- ✅ Proveedores acceden con enlace único (sin login)
- ✅ Respuestas detalladas por cada medicamento
- ✅ Tokens expiran en 72 horas automáticamente
- ✅ Emails automáticos profesionales
- ✅ Notificaciones cuando se reciben respuestas

---

## Endpoints Nuevos

### Públicos (sin autenticación):
- `GET /api/presupuestos/solicitud/:token` - Ver solicitud
- `POST /api/presupuestos/responder/:token` - Enviar respuesta

### Protegidos (con JWT):
- `POST /api/presupuestos/solicitar-con-email` - Crear solicitud
- `GET /api/presupuestos/solicitudes-email` - Listar todas
- `GET /api/presupuestos/solicitudes-email/:id` - Ver detalles
- `GET /api/presupuestos/comparar/:solicitudId` - Comparar presupuestos

---

## Estructura de Respuesta de Proveedor

El proveedor debe enviar un array de respuestas, una por cada medicamento:

\`\`\`json
{
  "respuestas": [
    {
      "auditoriaId": 1,
      "medicamentoId": 1,
      "acepta": true,              // true o false
      "precio": 1500.50,           // OBLIGATORIO si acepta
      "fechaRetiro": "2025-10-25", // OBLIGATORIO si acepta
      "fechaVencimiento": "2026-12-31", // OBLIGATORIO si acepta
      "comentarios": "Disponible inmediatamente" // OPCIONAL
    },
    {
      "auditoriaId": 1,
      "medicamentoId": 2,
      "acepta": false,
      "comentarios": "No disponible en stock" // OPCIONAL
    }
  ]
}
\`\`\`

---

## Tabla de Compatibilidad

| Tabla Existente | Nueva Columna/Tabla | Propósito |
|----------------|---------------------|-----------|
| `alt_solicitud_presupuesto_proveedor` | `+ token` | Token único para acceso |
| `alt_solicitud_presupuesto_proveedor` | `+ fecha_expiracion` | Expira en 72h |
| ➕ NUEVA | `alt_presupuesto_respuesta_detalle` | Respuestas por medicamento |
| ➕ NUEVA | `alt_presupuesto_notificaciones` | Log de notificaciones |

---

## Solución de Problemas

### Error: "Foreign key constraint is incorrectly formed"

Si ves este error al ejecutar el SQL, verifica:

1. Que las tablas referenciadas existan:
\`\`\`sql
SHOW TABLES LIKE 'alt_%';
\`\`\`

2. Que las columnas de ID coincidan en tipo:
\`\`\`sql
DESCRIBE alt_solicitud_presupuesto;
DESCRIBE alt_solicitud_presupuesto_proveedor;
DESCRIBE alt_proveedor;
\`\`\`

### Error: "Column 'token' already exists"

Si ya ejecutaste el script antes:
1. Comenta las líneas `ALTER TABLE` en el SQL
2. Ejecuta solo la parte de `CREATE TABLE`

### Email no se envía

Verifica en `services/emailService.js`:
- Host: smtp.hostinger.com
- Port: 587
- User: envios@codeo.site
- Password: D^z2ZL70$13b

---

## Próximos Pasos

1. ✅ Ejecutar SQL
2. ✅ Reiniciar servidor
3. ✅ Probar creación de solicitud
4. ✅ Verificar email recibido
5. ✅ Probar formulario de respuesta
6. ✅ Implementar frontend (usando `formulario-proveedor-ejemplo.html` como base)

---

## Documentación Completa

Para más detalles, ver:
- `DOCUMENTACION_PRESUPUESTOS.md` - Doc técnica completa
- `EJEMPLOS_API_PRESUPUESTOS.md` - Ejemplos con cURL
- `formulario-proveedor-ejemplo.html` - Ejemplo de frontend

---

**¿Problemas?** Revisa los logs del servidor y verifica que el SQL se ejecutó correctamente.

**¡Listo! 🚀** Tu sistema ya puede enviar solicitudes de presupuesto con tokens seguros.
