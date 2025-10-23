# 📧 DOCUMENTACIÓN: Sistema de Notificaciones a Pacientes

## Fecha: 2025-10-22

---

## 🎯 DESCRIPCIÓN GENERAL

El sistema notifica automáticamente a los pacientes por email en cada cambio de estado de su orden de compra de medicamentos de alto costo.

---

## ✉️ TIPOS DE NOTIFICACIONES

### 1. ✅ Presupuesto Adjudicado
**Cuándo:** Cuando el auditor adjudica el presupuesto a un proveedor

**Contenido:**
- Número de orden
- Proveedor seleccionado
- Monto total
- Fecha estimada de entrega
- Lugar de retiro
- Lista de medicamentos

**Email enviado:**
```
Asunto: ✅ Presupuesto Adjudicado - Orden #123

Su solicitud de medicamentos ha sido adjudicada a un proveedor.
El proveedor comenzará a preparar su pedido.
```

---

### 2. 📋 Orden Confirmada
**Cuándo:** El proveedor confirma que puede entregar los medicamentos

**Contenido:**
- Confirmación del proveedor
- Actualización de fecha estimada (si cambió)
- Recordatorio de lugar de retiro

**Email enviado:**
```
Asunto: 📋 Orden Confirmada por el Proveedor - Orden #123

El proveedor ha confirmado su orden y comenzará la preparación.
Recibirá una notificación cuando esté lista para retiro.
```

---

### 3. ⚙️ Orden en Preparación
**Cuándo:** El proveedor está preparando los medicamentos

**Contenido:**
- Estado de preparación
- Tiempo estimado restante

**Email enviado:**
```
Asunto: ⚙️ Orden en Preparación - Orden #123

Su orden está siendo preparada.
El proveedor está organizando sus medicamentos.
```

---

### 4. 🎉 Orden Lista para Retiro
**Cuándo:** Los medicamentos están listos para ser retirados

**Contenido:**
- **DESTACADO:** Lugar de retiro
- Horario de atención
- Recordatorio de traer DNI
- Lista completa de medicamentos

**Email enviado:**
```
Asunto: 🎉 Orden Lista para Retiro - Orden #123

¡Sus medicamentos ya están listos para retirar!
Por favor acérquese al lugar de retiro con su DNI.

📍 Lugar de Retiro: Sucursal Centro - Av. San Martín 456

Horario de atención:
Lunes a Viernes de 8:00 a 16:00 hs

Importante: Traer DNI y esta orden impresa o en formato digital.
```

---

### 5. ✔️ Orden Entregada
**Cuándo:** El paciente retiró los medicamentos

**Contenido:**
- Confirmación de entrega
- Fecha y hora de retiro
- Agradecimiento

**Email enviado:**
```
Asunto: ✔️ Orden Entregada - Orden #123

Su orden ha sido entregada exitosamente.
Gracias por su confianza.
```

---

### 6. ❌ Orden Cancelada
**Cuándo:** La orden se cancela por algún motivo

**Contenido:**
- Motivo de cancelación
- Instrucciones de contacto

**Email enviado:**
```
Asunto: ❌ Orden Cancelada - Orden #123

Su orden ha sido cancelada.
Motivo: [motivo de cancelación]

Si tiene dudas, por favor contáctenos.
```

---

## 🔌 API: Endpoints Relacionados

### 1. Adjudicar Presupuesto (Notifica automáticamente)
**POST** `/api/presupuestos/solicitudes-email/:id/adjudicar`

**Request:**
```json
{
  "proveedorId": 2,
  "observaciones": "Mejor precio"
}
```

**Proceso:**
1. Crea órdenes de compra
2. **Automáticamente notifica a cada paciente** con estado "adjudicado"
3. Envía email con toda la información de la orden

**Response:**
```json
{
  "mensaje": "Presupuesto adjudicado exitosamente",
  "ordenesCreadas": [
    {
      "ordenId": 123,
      "auditoriaId": 17,
      "paciente": "Pérez, Juan",
      "monto": 5000.50,
      "medicamentos": 2,
      "lugarRetiro": "Sucursal Centro"
    }
  ]
}
```

---

### 2. Actualizar Estado de Orden (Notifica automáticamente)
**PUT** `/api/presupuestos/ordenes/:id/estado`

**Request:**
```json
{
  "nuevoEstado": "listo_retiro",
  "observaciones": "Medicamentos preparados y verificados"
}
```

**Proceso:**
1. Actualiza el estado de la orden
2. Si el estado es "entregado", registra fecha real de entrega
3. **Automáticamente notifica al paciente** con el nuevo estado
4. Envia email personalizado según el estado

**Response:**
```json
{
  "mensaje": "Estado de orden actualizado exitosamente",
  "ordenId": 123,
  "estadoAnterior": "en_preparacion",
  "estadoNuevo": "listo_retiro",
  "pacienteNotificado": true
}
```

**Estados Válidos:**
- `adjudicado`
- `confirmado`
- `en_preparacion`
- `listo_retiro` ⭐ (El más importante para el paciente)
- `entregado`
- `cancelado`
- `finalizado`

---

## 📊 FLUJO COMPLETO CON NOTIFICACIONES

```
1. AUDITOR ADJUDICA PRESUPUESTO
   └─> Sistema crea orden de compra
   └─> ✉️ EMAIL A PACIENTE: "Presupuesto Adjudicado"

2. PROVEEDOR CONFIRMA (Admin cambia estado)
   └─> PUT /api/presupuestos/ordenes/:id/estado { nuevoEstado: "confirmado" }
   └─> ✉️ EMAIL A PACIENTE: "Orden Confirmada"

3. PROVEEDOR PREPARA MEDICAMENTOS (Admin cambia estado)
   └─> PUT /api/presupuestos/ordenes/:id/estado { nuevoEstado: "en_preparacion" }
   └─> ✉️ EMAIL A PACIENTE: "Orden en Preparación"

4. MEDICAMENTOS LISTOS (Admin cambia estado)
   └─> PUT /api/presupuestos/ordenes/:id/estado { nuevoEstado: "listo_retiro" }
   └─> ✉️ EMAIL A PACIENTE: "¡Listo para Retiro!" (CON DIRECCIÓN)

5. PACIENTE RETIRA (Admin confirma retiro)
   └─> PUT /api/presupuestos/ordenes/:id/estado { nuevoEstado: "entregado" }
   └─> Sistema registra fecha_entrega_real = NOW()
   └─> ✉️ EMAIL A PACIENTE: "Orden Entregada"

6. ORDEN FINALIZADA (Admin cierra)
   └─> PUT /api/presupuestos/ordenes/:id/estado { nuevoEstado: "finalizado" }
   └─> ✉️ EMAIL A PACIENTE: "Proceso Completado"
```

---

## 🗄️ REQUISITOS DE BASE DE DATOS

### Tabla `rec_paciente` debe tener campo `email`

```sql
-- Verificar si existe el campo email
DESCRIBE rec_paciente;

-- Si no existe, agregarlo:
ALTER TABLE `rec_paciente`
ADD COLUMN `email` varchar(255) DEFAULT NULL COMMENT 'Email del paciente para notificaciones'
AFTER `telefono`;

-- Actualizar emails de pacientes (IMPORTANTE)
UPDATE rec_paciente SET email = 'paciente1@email.com' WHERE id = 1;
UPDATE rec_paciente SET email = 'paciente2@email.com' WHERE id = 2;
```

---

## 🎨 DISEÑO DE LOS EMAILS

### Características de los Emails

✅ **Responsive:** Se adaptan a móviles y desktop
✅ **Colores personalizados:** Cada estado tiene su color distintivo
✅ **Emojis:** Para identificación rápida en la bandeja de entrada
✅ **Información completa:** Todos los datos relevantes en un solo email
✅ **Call-to-action claro:** Especialmente en estado "listo_retiro"
✅ **Profesional:** Con header, footer y branding

### Colores por Estado

| Estado | Color | Emoji |
|--------|-------|-------|
| Adjudicado | Verde (#28a745) | ✅ |
| Confirmado | Azul (#17a2b8) | 📋 |
| En Preparación | Amarillo (#ffc107) | ⚙️ |
| Listo Retiro | Verde claro (#20c997) | 🎉 |
| Entregado | Verde oscuro (#28a745) | ✔️ |
| Cancelado | Rojo (#dc3545) | ❌ |

---

## 🧪 TESTING

### Test 1: Adjudicar y verificar email de adjudicación

```bash
# 1. Configurar email de paciente
UPDATE rec_paciente SET email = 'tuprueba@email.com' WHERE id = 1;

# 2. Adjudicar presupuesto
POST /api/presupuestos/solicitudes-email/18/adjudicar
{
  "proveedorId": 2,
  "observaciones": "Test"
}

# 3. Verificar en logs del servidor:
✅ Email de cambio de estado enviado a Pérez, Juan (tuprueba@email.com)

# 4. Revisar bandeja de entrada del paciente
```

### Test 2: Cambiar estado y verificar notificaciones

```bash
# 1. Cambiar a "confirmado"
PUT /api/presupuestos/ordenes/123/estado
{
  "nuevoEstado": "confirmado",
  "observaciones": "Proveedor confirmó disponibilidad"
}

# Verificar email recibido con asunto: 📋 Orden Confirmada

# 2. Cambiar a "en_preparacion"
PUT /api/presupuestos/ordenes/123/estado
{
  "nuevoEstado": "en_preparacion"
}

# Verificar email recibido con asunto: ⚙️ Orden en Preparación

# 3. Cambiar a "listo_retiro" (MÁS IMPORTANTE)
PUT /api/presupuestos/ordenes/123/estado
{
  "nuevoEstado": "listo_retiro"
}

# Verificar email con:
# - Título: 🎉 Orden Lista para Retiro
# - Dirección destacada del lugar de retiro
# - Horarios de atención
# - Recordatorio de traer DNI

# 4. Cambiar a "entregado"
PUT /api/presupuestos/ordenes/123/estado
{
  "nuevoEstado": "entregado"
}

# Verificar:
# - Email con asunto: ✔️ Orden Entregada
# - En base de datos: fecha_entrega_real registrada
```

### Test 3: Paciente sin email (no debe fallar)

```bash
# 1. Paciente sin email
UPDATE rec_paciente SET email = NULL WHERE id = 2;

# 2. Adjudicar orden para ese paciente
POST /api/presupuestos/solicitudes-email/18/adjudicar
{
  "proveedorId": 2
}

# 3. Verificar en logs:
⚠️ Paciente de orden 124 no tiene email configurado

# 4. La adjudicación debe completarse exitosamente
# El proceso NO debe fallar por falta de email
```

---

## ⚠️ MANEJO DE ERRORES

### Email no configurado
- El sistema registra un warning en el log
- El proceso continúa normalmente
- NO falla la operación principal

### Error enviando email
- Se captura la excepción
- Se registra el error en el log
- El proceso principal continúa
- Se retorna `pacienteNotificado: false` en la respuesta

### Paciente sin email
```javascript
if (!pacienteEmail) {
    console.log('⚠️ No se puede enviar email: paciente sin email configurado');
    // Continúa sin enviar
}
```

---

## 📝 VARIABLES DE ENTORNO

Asegurarse de tener configurado en `.env`:

```env
# Email Service (ya configurado)
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USER=envios@codeo.site
EMAIL_PASS=D^z2ZL70$13b
EMAIL_FROM="Sistema de Auditoría - Demo Alta Luna <envios@codeo.site>"

# Frontend URL (para links en emails - futuro)
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 PASOS PARA ACTIVAR EL SISTEMA

### 1. Aplicar Migraciones

```bash
# Migración de estructura de compras
mysql -u usuario -p base_datos < migrations/fix_compras_alto_costo_estructura_completa_SAFE.sql

# Migración de email de usuario (administradores)
mysql -u usuario -p base_datos < migrations/add_email_user_au.sql
```

### 2. Configurar Emails de Pacientes

```sql
-- Agregar campo email a pacientes si no existe
ALTER TABLE `rec_paciente`
ADD COLUMN IF NOT EXISTS `email` varchar(255) DEFAULT NULL
COMMENT 'Email del paciente para notificaciones'
AFTER `telefono`;

-- Configurar emails de pacientes existentes
UPDATE rec_paciente SET email = 'paciente1@email.com' WHERE id = 1;
UPDATE rec_paciente SET email = 'paciente2@email.com' WHERE id = 2;
-- ...
```

### 3. Reiniciar Servidor

```bash
# Ctrl+C en la terminal del servidor
npm start
```

### 4. Verificar

1. Adjudicar un presupuesto
2. Verificar que el paciente recibe el email
3. Cambiar estados de la orden
4. Verificar que se envía un email en cada cambio

---

## 📊 ESTADÍSTICAS Y MONITORING

### Logs del Sistema

El sistema registra cada email enviado:

```
✅ Email de cambio de estado enviado a Pérez, Juan (paciente@email.com)
⚠️ No hay administradores con email configurado para notificar
❌ Error enviando notificación al paciente: [error details]
```

### Queries Útiles

```sql
-- Ver pacientes sin email configurado
SELECT id, apellido, nombre, dni, telefono, email
FROM rec_paciente
WHERE email IS NULL OR email = '';

-- Ver órdenes con sus pacientes y emails
SELECT
    c.id as orden_id,
    c.estado_compra,
    CONCAT(p.apellido, ', ', p.nombre) as paciente,
    p.email as paciente_email,
    c.monto_total,
    c.fecha_estimada_entrega
FROM rec_compras_alto_costo c
INNER JOIN rec_receta_alto_costo r ON c.idreceta = r.idreceta
INNER JOIN rec_paciente p ON r.idpaciente = p.id
ORDER BY c.id DESC;

-- Ver pacientes que recibirán notificaciones
SELECT COUNT(*) as total_pacientes_con_email
FROM rec_paciente
WHERE email IS NOT NULL AND email != '';
```

---

## 🎯 MEJORAS FUTURAS

- [ ] Portal del paciente para ver estado de su orden en tiempo real
- [ ] SMS como alternativa o complemento al email
- [ ] Notificaciones push (app móvil)
- [ ] Historial de notificaciones enviadas (tabla de log)
- [ ] Reenvío manual de notificaciones
- [ ] Personalización de plantillas de email por institución
- [ ] Adjuntar PDF con detalle de la orden
- [ ] QR code para identificación rápida en el retiro

---

## 📞 SOPORTE

Para dudas o problemas con el sistema de notificaciones, contactar al equipo de desarrollo.

**Archivos relacionados:**
- `/services/emailService.js` - Función `notificarCambioEstadoOrden`
- `/controllers/presupuestoTokenController.js` - Funciones `adjudicarPresupuesto` y `actualizarEstadoOrdenCompra`
- `/routes/presupuestos.js` - Ruta `PUT /api/presupuestos/ordenes/:id/estado`
- `/migrations/fix_compras_alto_costo_estructura_completa_SAFE.sql`

---

## ✅ CHECKLIST FINAL

- [x] Función de email `notificarCambioEstadoOrden` creada
- [x] 6 tipos de notificaciones implementadas
- [x] Notificación automática en adjudicación
- [x] Endpoint para cambiar estado con notificación
- [x] Manejo de errores (no falla si no hay email)
- [x] Logs informativos
- [x] Documentación completa
- [ ] Aplicar migración SQL
- [ ] Configurar emails de pacientes
- [ ] Reiniciar servidor
- [ ] Probar flujo completo

---

**Fecha de implementación:** 2025-10-22
**Versión:** 1.0.0
