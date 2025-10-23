# Guía Rápida de Implementación - Sistema de Presupuestos

## Pasos para Implementar

### 1. Ejecutar Migración de Base de Datos

\`\`\`bash
mysql -u root -p cpce_auditoria < database/migrations/create_presupuestos_tables.sql
\`\`\`

O ejecuta el SQL manualmente en tu gestor de base de datos.

---

### 2. Verificar Configuración de Email

El sistema ya está configurado para usar las credenciales de Hostinger en `services/emailService.js`:

\`\`\`javascript
host: 'smtp.hostinger.com'
port: 587
user: 'envios@codeo.site'
password: 'D^z2ZL70$13b'
\`\`\`

Si necesitas cambiar la configuración, edita el archivo o agrega variables de entorno.

---

### 3. Reiniciar el Servidor

\`\`\`bash
npm run dev
\`\`\`

o

\`\`\`bash
node server.js
\`\`\`

---

### 4. Probar los Endpoints

#### a) Crear solicitud (Usuario Interno)

**Endpoint:** `POST /api/presupuestos/solicitar-con-email`

**Headers:**
\`\`\`
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
\`\`\`

**Body:**
\`\`\`json
{
  "auditoriaIds": [17, 18],
  "proveedorIds": [1, 2, 3],
  "observaciones": "Solicitud de prueba"
}
\`\`\`

**Respuesta esperada:**
- Status: 201
- Emails enviados a los proveedores
- Retorna información del lote y resultados de envío

---

#### b) Ver solicitud (Proveedor - PÚBLICO)

**Endpoint:** `GET /api/presupuestos/solicitud/:token`

El token lo obtienes del email enviado. Ejemplo:
\`\`\`
GET /api/presupuestos/solicitud/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
\`\`\`

**Respuesta esperada:**
- Status: 200
- Información de la solicitud
- Lista de auditorías y medicamentos

---

#### c) Enviar respuesta (Proveedor - PÚBLICO)

**Endpoint:** `POST /api/presupuestos/responder/:token`

**Body:**
\`\`\`json
{
  "respuestas": [
    {
      "auditoriaId": 17,
      "medicamentoId": 1,
      "acepta": true,
      "precio": 1500.50,
      "fechaRetiro": "2025-10-25",
      "fechaVencimiento": "2026-12-31",
      "comentarios": "Stock disponible"
    },
    {
      "auditoriaId": 17,
      "medicamentoId": 2,
      "acepta": false,
      "comentarios": "No disponible"
    }
  ]
}
\`\`\`

**Respuesta esperada:**
- Status: 200
- Confirmación de respuesta guardada
- Notificación enviada a administradores

---

#### d) Listar solicitudes (Usuario Interno)

**Endpoint:** `GET /api/presupuestos/solicitudes-email`

**Headers:**
\`\`\`
Authorization: Bearer <tu_token_jwt>
\`\`\`

**Query params opcionales:**
- `estado`: pendiente, en_proceso, finalizada, cancelada
- `page`: número de página (default: 1)
- `limit`: resultados por página (default: 10)

---

#### e) Ver detalles de solicitud (Usuario Interno)

**Endpoint:** `GET /api/presupuestos/solicitudes-email/:id`

**Headers:**
\`\`\`
Authorization: Bearer <tu_token_jwt>
\`\`\`

**Respuesta esperada:**
- Información completa de la solicitud
- Lista de proveedores con sus respuestas

---

#### f) Comparar presupuestos (Usuario Interno)

**Endpoint:** `GET /api/presupuestos/comparar/:solicitudId`

**Headers:**
\`\`\`
Authorization: Bearer <tu_token_jwt>
\`\`\`

**Respuesta esperada:**
- Comparación por medicamento
- Mejor oferta identificada automáticamente
- Todas las ofertas de todos los proveedores

---

## Estructura de Archivos Creados

\`\`\`
proyecto/
├── controllers/
│   └── presupuestoController.js           # Nuevo controlador
├── routes/
│   └── presupuestos.js                     # Actualizado con nuevas rutas
├── services/
│   └── emailService.js                     # Actualizado con nuevas funciones
├── database/
│   └── migrations/
│       └── create_presupuestos_tables.sql  # Nuevas tablas
├── DOCUMENTACION_PRESUPUESTOS.md           # Documentación completa
└── GUIA_RAPIDA_IMPLEMENTACION.md          # Esta guía
\`\`\`

---

## Flujo Visual

\`\`\`
┌──────────────────┐
│  Usuario Interno │
│  crea solicitud  │
└────────┬─────────┘
         │
         ▼
┌────────────────────────┐
│  Sistema genera tokens │
│  y envía emails        │
└────────┬───────────────┘
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Prov. 1 │ │Prov. 2 │ │Prov. 3 │ │Prov. N │
    │recibe  │ │recibe  │ │recibe  │ │recibe  │
    │email   │ │email   │ │email   │ │email   │
    └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
    ┌──────────────────────────────────────┐
    │  Proveedores hacen clic en enlace    │
    │  Acceden sin login                   │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  Completan formulario:               │
    │  - Acepta/Rechaza                    │
    │  - Precio                            │
    │  - Fecha retiro                      │
    │  - Fecha vencimiento                 │
    │  - Comentarios                       │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  Sistema guarda respuestas           │
    │  y notifica a administradores        │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  Usuario Interno:                    │
    │  - Ve respuestas                     │
    │  - Compara presupuestos              │
    │  - Selecciona mejor oferta           │
    └──────────────────────────────────────┘
\`\`\`

---

## Checklist de Implementación

- [x] Tablas de base de datos creadas
- [x] Servicio de email configurado
- [x] Controlador implementado
- [x] Rutas agregadas
- [x] Documentación completa
- [ ] Ejecutar migración SQL
- [ ] Probar creación de solicitud
- [ ] Verificar emails recibidos
- [ ] Probar formulario de respuesta
- [ ] Verificar notificaciones
- [ ] Probar comparación de presupuestos
- [ ] Implementar frontend (opcional)

---

## Comandos Útiles

### Verificar estado del servidor
\`\`\`bash
curl http://localhost:3000/health
\`\`\`

### Ver todas las rutas disponibles
\`\`\`bash
curl http://localhost:3000/
\`\`\`

### Verificar tablas creadas (MySQL)
\`\`\`sql
SHOW TABLES LIKE 'presupuesto%';
\`\`\`

### Ver tokens activos
\`\`\`sql
SELECT
    p.nombre as proveedor,
    sp.token,
    sp.fecha_expiracion,
    sp.estado
FROM presupuesto_solicitud_proveedores sp
JOIN proveedores p ON sp.proveedor_id = p.id
WHERE sp.estado = 'pendiente'
AND sp.fecha_expiracion > NOW();
\`\`\`

---

## Solución de Problemas

### Email no se envía
1. Verificar configuración SMTP en `emailService.js`
2. Verificar logs del servidor
3. Comprobar credenciales de email
4. Verificar firewall/antivirus

### Token inválido o expirado
1. Verificar que el token existe en la base de datos
2. Verificar fecha de expiración
3. Verificar que no haya sido usado ya

### Error al guardar respuestas
1. Verificar que los IDs de auditorías y medicamentos existen
2. Verificar campos obligatorios (precio, fechas si acepta=true)
3. Verificar logs de errores SQL

---

## Contacto

Si tienes problemas o dudas, revisa la documentación completa en `DOCUMENTACION_PRESUPUESTOS.md` o contacta al equipo de desarrollo.

---

**¡Listo para usar! 🚀**
