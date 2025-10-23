

# 📦 DOCUMENTACIÓN COMPLETA: Sistema de Compras de Alto Costo

## Fecha: 2025-10-22

---

## 🎯 ARQUITECTURA COMPLETA DEL SISTEMA

### Flujo de Negocio (De principio a fin)

```
1. AUDITORÍA
   ├─ Auditor revisa recetas de alto costo
   ├─ Aprueba medicamentos (estado 1 → "Autorizado")
   └─ Selecciona auditorías para solicitar presupuesto

2. SOLICITUD DE PRESUPUESTO
   ├─ Se crea lote con múltiples auditorías
   ├─ Se envían emails a proveedores seleccionados
   ├─ Cada proveedor recibe un token único
   └─ Medicamentos cambian estado 1 → 4 ("En presupuesto")

3. RESPUESTA DE PROVEEDORES
   ├─ Proveedores responden por email (link con token)
   ├─ Por cada medicamento: acepta/rechaza + precio + fechas + lugar retiro
   ├─ Se notifica a administradores por email
   └─ Estado de solicitud: ENVIADO → PARCIAL → COMPLETADO

4. COMPARACIÓN Y ADJUDICACIÓN
   ├─ Auditor compara presupuestos de todos los proveedores
   ├─ Sistema identifica mejor precio automáticamente
   ├─ Auditor elige ganador y adjudica
   └─ Se crea ORDEN DE COMPRA

5. ORDEN DE COMPRA Y ENTREGA
   ├─ Se crea registro en rec_compras_alto_costo (cabecera)
   ├─ Se crea detalle en rec_compras_alto_costo_detalle (medicamentos)
   ├─ Medicamentos cambian estado 4 → 5 ("En compra")
   ├─ Proveedor ganador marcado como ADJUDICADO
   ├─ Seguimiento de entrega con estados
   └─ Notificación al paciente (futuro)
```

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tabla Principal: `rec_compras_alto_costo`

**Propósito:** Representa UNA orden de compra para UNA auditoría específica

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int(11) PK | ID único de la orden |
| `idreceta` | int(11) FK | Auditoría asociada (rec_receta_alto_costo.idreceta) |
| **`id_proveedor`** | **int(11) FK** | **Proveedor adjudicado (alt_proveedor.id_proveedor)** |
| **`id_solicitud_presupuesto`** | **int(11) FK** | **Solicitud de presupuesto original** |
| **`monto_total`** | **decimal(15,2)** | **Monto total de la orden** |
| `estado_compra` | enum | Estado actual (adjudicado, confirmado, en_preparacion, listo_retiro, entregado, finalizado, cancelado) |
| `fecha_recepcion` | datetime | Fecha de creación de la orden |
| `fecha_envio_proveedores` | datetime | (legacy - no usado en nuevo flujo) |
| **`fecha_estimada_entrega`** | **datetime** | **Fecha estimada de entrega del proveedor** |
| **`fecha_entrega_real`** | **datetime** | **Fecha real en que se entregó** |
| **`lugar_retiro`** | **varchar(255)** | **Dirección donde se retira** |
| `id_usuario_compras` | int(11) | Usuario de compras (opcional) |
| **`usuario_adjudico`** | **int(11)** | **Usuario que adjudicó el presupuesto** |
| `observaciones` | text | Observaciones de la orden |

**Índices:**
- `idx_proveedor`: Buscar por proveedor
- `idx_solicitud`: Buscar por solicitud de presupuesto
- `idx_estado`: Filtrar por estado
- `idx_fecha_entrega`: Ordenar por fecha de entrega

**Foreign Keys:**
- `fk_compra_proveedor`: id_proveedor → alt_proveedor.id_proveedor
- `fk_compra_solicitud`: id_solicitud_presupuesto → alt_solicitud_presupuesto.id_solicitud
- `fk_compra_receta`: idreceta → rec_receta_alto_costo.idreceta

---

### Tabla de Detalle: `rec_compras_alto_costo_detalle`

**Propósito:** Detalle de medicamentos por orden de compra (uno a muchos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int(11) PK | ID único del detalle |
| `id_compra` | int(11) FK | Orden de compra (rec_compras_alto_costo.id) |
| `id_medicamento` | int(11) | ID del medicamento |
| `codigo_medicamento` | varchar(50) | Código del vademécum |
| `nombre_medicamento` | varchar(255) | Nombre comercial (snapshot) |
| `presentacion` | varchar(255) | Presentación (snapshot) |
| `cantidad` | int(11) | Cantidad solicitada |
| `precio_unitario` | decimal(10,2) | Precio unitario adjudicado |
| `precio_total` | decimal(10,2) | Precio total (cantidad × precio_unitario) |
| `fecha_vencimiento` | date | Fecha de vencimiento del medicamento |
| `lote_medicamento` | varchar(100) | Número de lote entregado |
| `observaciones` | text | Observaciones del medicamento |
| `fecha_creacion` | datetime | Fecha de creación del registro |

**Índices:**
- `idx_compra`: Buscar detalles por orden
- `idx_medicamento`: Buscar por medicamento

**Foreign Keys:**
- `fk_detalle_compra`: id_compra → rec_compras_alto_costo.id (ON DELETE CASCADE)

---

## 🔄 ESTADOS DE LA ORDEN DE COMPRA

| Estado | Descripción | Quién lo cambia |
|--------|-------------|-----------------|
| `adjudicado` | Presupuesto adjudicado, esperando confirmación del proveedor | Sistema (automático al adjudicar) |
| `confirmado` | Proveedor confirmó que puede entregar | Proveedor o Admin |
| `en_preparacion` | Proveedor está preparando el pedido | Proveedor o Admin |
| `listo_retiro` | Pedido listo para retirar | Proveedor o Admin |
| `entregado` | Medicamentos fueron entregados/retirados | Admin (al confirmar retiro) |
| `finalizado` | Proceso completado, todo documentado | Admin |
| `cancelado` | Orden cancelada | Admin |

---

## 🔌 API: Endpoint de Adjudicación

### POST `/api/presupuestos/solicitudes-email/:id/adjudicar`

**Propósito:** Adjudicar un presupuesto al proveedor ganador y crear órdenes de compra

#### Request

```json
{
  "proveedorId": 2,
  "observaciones": "Mejor precio y tiempo de entrega"
}
```

#### Proceso (paso a paso)

1. **Validar solicitud existe y está en estado válido**
2. **Verificar que el proveedor respondió a la solicitud**
3. **Obtener todos los medicamentos aceptados por el proveedor**
4. **Para cada auditoría de la solicitud:**
   - Obtener datos del paciente
   - Calcular monto total
   - **Crear orden de compra** en `rec_compras_alto_costo`:
     - Con proveedor ganador
     - Monto total
     - Fecha estimada de entrega
     - Lugar de retiro
     - Usuario que adjudicó
     - Estado inicial: `'adjudicado'`
   - **Crear detalles** en `rec_compras_alto_costo_detalle`:
     - Por cada medicamento con precio, cantidad, totales
     - Snapshot de nombre y presentación
   - **Actualizar medicamentos:** estado 4 → 5 ("En compra")
5. **Actualizar estado de solicitud de presupuesto:** → `'ADJUDICADO'`
6. **Marcar proveedor ganador como adjudicado**
7. **Commit de transacción**

#### Response (Success)

```json
{
  "mensaje": "Presupuesto adjudicado exitosamente",
  "ordenesCreadas": [
    {
      "ordenId": 123,
      "auditoriaId": 17,
      "paciente": "Jaime, Federico",
      "monto": 1231211,
      "medicamentos": 1,
      "lugarRetiro": "Sucursal Centro - Av. San Martín 456"
    },
    {
      "ordenId": 124,
      "auditoriaId": 18,
      "paciente": "Pérez, Juan",
      "monto": 5000.50,
      "medicamentos": 2,
      "lugarRetiro": "Sucursal Centro - Av. San Martín 456"
    }
  ],
  "proveedorAdjudicado": {
    "id": 2,
    "nombre": "Droguería Alta luna S.R.L.s"
  }
}
```

#### Código Clave

```javascript
// Crear orden de compra (cabecera)
await connection.query(
    `INSERT INTO rec_compras_alto_costo
    (idreceta, id_proveedor, id_solicitud_presupuesto, monto_total,
     estado_compra, fecha_estimada_entrega, lugar_retiro, observaciones, usuario_adjudico)
    VALUES (?, ?, ?, ?, 'adjudicado', ?, ?, ?, ?)`,
    [auditoriaId, proveedorId, solicitudId, montoTotal, fechaEntrega, lugar, obs, userId]
);

// Insertar detalle (por cada medicamento)
await connection.query(
    `INSERT INTO rec_compras_alto_costo_detalle
    (id_compra, id_medicamento, codigo_medicamento, nombre_medicamento,
     presentacion, cantidad, precio_unitario, precio_total, fecha_vencimiento, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ordenId, medId, codigo, nombre, present, cant, precioUnit, precioTot, venc, obs]
);
```

---

## 📧 NOTIFICACIONES POR EMAIL

### Email de Administradores

**Cuándo:** Cuando un proveedor responde a una solicitud de presupuesto

**Destinatarios:** Todos los usuarios con `rol = 1` (administradores) que tengan `email` configurado

**Query:**
```sql
SELECT email FROM user_au
WHERE rol = 1
AND email IS NOT NULL
AND email != ''
```

**Contenido del Email:**
```
Asunto: 🔔 Nueva Respuesta de Presupuesto - [Proveedor]

Se ha recibido una respuesta de presupuesto

Proveedor: Droguería del Sud S.R.Ls
Lote: LOTE-20251022-1142
Auditoría: #18

Resumen: 2 medicamento(s) aceptado(s), 0 rechazado(s)

Por favor, ingrese al sistema para revisar los detalles completos.
```

**IMPORTANTE:** Si ningún admin tiene email configurado, el sistema registra un warning pero NO falla:
```
⚠️ No hay administradores con email configurado para notificar
```

---

## 📊 QUERIES ÚTILES

### Ver todas las órdenes de compra con sus proveedores

```sql
SELECT
    c.id as orden_id,
    c.idreceta as auditoria_id,
    p.razon_social as proveedor,
    c.monto_total,
    c.estado_compra,
    c.fecha_estimada_entrega,
    c.lugar_retiro,
    COUNT(d.id) as cantidad_medicamentos
FROM rec_compras_alto_costo c
INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
LEFT JOIN rec_compras_alto_costo_detalle d ON c.id = d.id_compra
GROUP BY c.id
ORDER BY c.fecha_recepcion DESC;
```

### Ver detalle completo de una orden

```sql
SELECT
    c.id as orden_id,
    c.estado_compra,
    c.monto_total,
    c.lugar_retiro,
    p.razon_social as proveedor,
    d.nombre_medicamento,
    d.presentacion,
    d.cantidad,
    d.precio_unitario,
    d.precio_total,
    d.fecha_vencimiento
FROM rec_compras_alto_costo c
INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
INNER JOIN rec_compras_alto_costo_detalle d ON c.id = d.id_compra
WHERE c.id = 123;
```

### Ver órdenes pendientes de entrega

```sql
SELECT
    c.id,
    c.idreceta,
    p.razon_social as proveedor,
    c.estado_compra,
    c.fecha_estimada_entrega,
    c.lugar_retiro,
    CONCAT(pa.apellido, ', ', pa.nombre) as paciente
FROM rec_compras_alto_costo c
INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
INNER JOIN rec_receta_alto_costo r ON c.idreceta = r.idreceta
INNER JOIN rec_paciente pa ON r.idpaciente = pa.id
WHERE c.estado_compra IN ('adjudicado', 'confirmado', 'en_preparacion', 'listo_retiro')
ORDER BY c.fecha_estimada_entrega ASC;
```

---

## 🚀 PASOS DE IMPLEMENTACIÓN

### 1. Aplicar Migración SQL

```bash
# IMPORTANTE: Hacer backup primero
mysqldump -u usuario -p base_datos > backup_antes_migracion_$(date +%Y%m%d_%H%M%S).sql

# Aplicar migración
mysql -u usuario -p base_datos < migrations/fix_compras_alto_costo_estructura_completa.sql
```

### 2. Configurar Emails de Administradores

```sql
-- Ver administradores actuales
SELECT id, nombre, apellido, user, rol, email FROM user_au WHERE rol = 1;

-- Configurar emails
UPDATE user_au SET email = 'admin@tuempresa.com' WHERE id = 1;
UPDATE user_au SET email = 'supervisor@tuempresa.com' WHERE id = 2;

-- Verificar
SELECT id, nombre, apellido, email FROM user_au WHERE rol = 1 AND email IS NOT NULL;
```

### 3. Reiniciar Servidor Node.js

```bash
# Detener servidor (Ctrl+C en la terminal)
# O si usas PM2:
pm2 restart api

# O simplemente:
npm restart
```

### 4. Verificar Todo Funciona

1. **Crear solicitud de presupuesto** → Debe enviar emails a proveedores
2. **Proveedor responde** → Debe notificar a administradores
3. **Adjudicar presupuesto** → Debe crear orden con detalle
4. **Verificar en base de datos:**

```sql
-- Ver orden creada
SELECT * FROM rec_compras_alto_costo ORDER BY id DESC LIMIT 1;

-- Ver detalle de la orden
SELECT * FROM rec_compras_alto_costo_detalle WHERE id_compra = [ID_DE_ARRIBA];
```

---

## ⚠️ PROBLEMAS COMUNES

### Error: "Unknown column 'id_proveedor'"

**Causa:** No aplicaste la migración SQL

**Solución:**
```bash
mysql -u usuario -p base_datos < migrations/fix_compras_alto_costo_estructura_completa.sql
```

### Error: "No recipients defined" en email

**Causa:** Ningún administrador tiene email configurado

**Solución:**
```sql
UPDATE user_au SET email = 'tu_email@ejemplo.com' WHERE rol = 1 AND id = TU_ID;
```

### Warning: "No hay administradores con email configurado"

**Causa:** El servidor tiene código viejo en memoria

**Solución:** Reiniciar el servidor Node.js

### Error: "Table 'rec_compras_alto_costo_detalle' doesn't exist"

**Causa:** La migración SQL falló o no se completó

**Solución:** Revisar errores en la migración y volver a ejecutarla

---

## 📈 REPORTES Y ANALÍTICAS (Futuro)

### Endpoints a Implementar

```
GET /api/compras/estadisticas
- Total de órdenes
- Monto total comprado
- Distribución por proveedor
- Distribución por estado
- Ahorro vs precio vademécum

GET /api/compras/ordenes
- Listar órdenes con filtros (estado, fecha, proveedor)
- Paginación

GET /api/compras/ordenes/:id
- Detalle completo de una orden
- Con medicamentos, proveedor, auditoría, paciente

PUT /api/compras/ordenes/:id/estado
- Actualizar estado de una orden
- Notificar al paciente cuando estado = 'listo_retiro'

GET /api/compras/proveedores/ranking
- Ranking de proveedores por monto
- Por cantidad de órdenes
- Por cumplimiento de tiempos
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear migración SQL para rec_compras_alto_costo
- [x] Crear tabla rec_compras_alto_costo_detalle
- [x] Actualizar código de adjudicación
- [x] Agregar campo email a user_au
- [x] Actualizar notificaciones por email
- [ ] Aplicar migraciones en base de datos
- [ ] Configurar emails de administradores
- [ ] Reiniciar servidor
- [ ] Probar flujo completo
- [ ] Implementar endpoints de reportes (futuro)
- [ ] Implementar notificación a pacientes (futuro)

---

## 📞 SOPORTE

Para dudas o problemas con la implementación, contactar al equipo de desarrollo.

**Archivos relacionados:**
- `/migrations/fix_compras_alto_costo_estructura_completa.sql`
- `/migrations/add_email_user_au.sql`
- `/migrations/add_lugar_retiro.sql`
- `/controllers/presupuestoTokenController.js`
- `/DOCUMENTACION_EMAIL_ADMINS.md`
- `/DOCUMENTACION_LUGAR_RETIRO.md`
- `/DOCUMENTACION_ADJUDICACION_ORDENES.md`
