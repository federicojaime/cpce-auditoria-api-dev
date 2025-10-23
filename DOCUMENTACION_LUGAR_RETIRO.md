# Documentación: Campo Lugar de Retiro

## Fecha: 2025-10-22

## Descripción General
Se agregó el campo `lugar_retiro` a la tabla `alt_presupuesto_respuesta_detalle` para permitir que los proveedores especifiquen el lugar donde se puede retirar cada medicamento (dirección, sucursal, etc.).

---

## 🗄️ Cambios en Base de Datos

### Script de Migración
Ubicación: `/migrations/add_lugar_retiro.sql`

```sql
-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS `alt_presupuesto_respuesta_detalle` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud_proveedor` int(11) NOT NULL,
  `id_auditoria` int(11) NOT NULL,
  `id_medicamento` int(11) NOT NULL,
  `acepta` tinyint(1) NOT NULL DEFAULT 0,
  `precio` decimal(10,2) DEFAULT NULL,
  `fecha_retiro` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `comentarios` text DEFAULT NULL,
  `fecha_respuesta` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar campo lugar_retiro
ALTER TABLE `alt_presupuesto_respuesta_detalle`
ADD COLUMN IF NOT EXISTS `lugar_retiro` varchar(255) DEFAULT NULL
COMMENT 'Dirección o sucursal donde se retira el medicamento'
AFTER `fecha_vencimiento`;
```

### Cómo aplicar la migración
```bash
mysql -u tu_usuario -p tu_base_de_datos < migrations/add_lugar_retiro.sql
```

---

## 🔌 Cambios en API

### Endpoint: Responder Solicitud de Presupuesto
**POST** `/api/presupuestos/responder/:token`

#### Request Body Actualizado
```json
{
  "respuestas": [
    {
      "auditoriaId": 18,
      "medicamentoId": 101,
      "acepta": true,
      "precio": 1250.50,
      "fechaRetiro": "2025-10-25",
      "fechaVencimiento": "2026-12-31",
      "lugarRetiro": "Sucursal Centro - Av. San Martín 456, Ciudad",
      "comentarios": "Stock disponible, entrega inmediata"
    }
  ]
}
```

#### Validaciones
Si el proveedor **acepta** el medicamento (`acepta: true`), los siguientes campos son **OBLIGATORIOS**:
- ✅ `precio` (decimal)
- ✅ `fechaRetiro` (date - formato YYYY-MM-DD)
- ✅ `fechaVencimiento` (date - formato YYYY-MM-DD)
- ✅ **`lugarRetiro`** (string - nuevo campo obligatorio)

#### Mensaje de Error
```json
{
  "error": "Si acepta la solicitud debe proporcionar precio, fechaRetiro, fechaVencimiento y lugarRetiro"
}
```

---

## 📊 Endpoints que Incluyen lugar_retiro

### 1. Obtener Detalle de Solicitud
**GET** `/api/presupuestos/solicitudes-email/:id`

**Response:**
```json
{
  "solicitud": {
    "id_solicitud": 5,
    "codigo_solicitud": "LOTE-20251022-1142",
    "fecha_envio": "2025-10-22T14:42:00",
    "estado": "COMPLETADO",
    "proveedores": [
      {
        "proveedor_id": 1,
        "proveedor_nombre": "Droguería del Sud S.R.Ls",
        "estado": "RESPONDIDO",
        "fecha_respuesta": "2025-10-22T15:30:00",
        "respuestas": [
          {
            "auditoria_id": 18,
            "medicamento_id": 101,
            "medicamento_nombre": "SINTROM",
            "medicamento_presentacion": "4 mg comp.x 20 | Cantidad: 1",
            "acepta": 1,
            "precio": 1250.50,
            "fecha_retiro": "2025-10-25",
            "fecha_vencimiento": "2026-12-31",
            "lugar_retiro": "Sucursal Centro - Av. San Martín 456",
            "comentarios": "Stock disponible"
          }
        ]
      }
    ]
  }
}
```

### 2. Comparar Presupuestos
**GET** `/api/presupuestos/comparar/:solicitudId`

**Response:**
```json
{
  "comparacion": {
    "auditoria_18": {
      "paciente_nombre": "Jaime, Federico",
      "paciente_dni": "38437748",
      "medicamentos": {
        "medicamento_101": {
          "medicamento_nombre": "SINTROM",
          "medicamento_presentacion": "4 mg comp.x 20 | Cantidad: 1",
          "ofertas": [
            {
              "proveedor_id": 1,
              "proveedor_nombre": "Droguería del Sud S.R.Ls",
              "acepta": true,
              "precio": 1250.50,
              "fecha_retiro": "2025-10-25",
              "fecha_vencimiento": "2026-12-31",
              "lugar_retiro": "Sucursal Centro - Av. San Martín 456",
              "comentarios": "Stock disponible",
              "es_mejor_precio": true
            },
            {
              "proveedor_id": 2,
              "proveedor_nombre": "Farmacia Principal",
              "acepta": true,
              "precio": 1350.00,
              "fecha_retiro": "2025-10-26",
              "fecha_vencimiento": "2026-11-30",
              "lugar_retiro": "Local Central - Calle Mitre 123",
              "comentarios": null,
              "es_mejor_precio": false
            }
          ]
        }
      }
    }
  }
}
```

### 3. Adjudicar Presupuesto
**POST** `/api/presupuestos/solicitudes-email/:id/adjudicar`

El sistema utiliza el campo `lugar_retiro` al crear las órdenes de compra, guardando esta información para coordinar la entrega.

---

## 🎨 Frontend - Actualización del Formulario

### Formulario de Respuesta del Proveedor

Ahora debe incluir un input de texto para el lugar de retiro por cada medicamento:

```jsx
<div className="medication-item">
  <h3>{medicamento.nombre}</h3>
  <p>{medicamento.presentacion} | Cantidad: {medicamento.cantidad}</p>

  <label>
    <input type="checkbox" checked={acepta} onChange={handleAceptaChange} />
    Acepto proporcionar este medicamento
  </label>

  {acepta && (
    <>
      <input
        type="number"
        placeholder="Precio"
        value={precio}
        onChange={handlePrecioChange}
        required
      />

      <input
        type="date"
        placeholder="Fecha de Retiro"
        value={fechaRetiro}
        onChange={handleFechaRetiroChange}
        required
      />

      <input
        type="date"
        placeholder="Fecha de Vencimiento"
        value={fechaVencimiento}
        onChange={handleFechaVencimientoChange}
        required
      />

      {/* NUEVO CAMPO */}
      <input
        type="text"
        placeholder="Lugar de Retiro (ej: Sucursal Centro - Av. San Martín 456)"
        value={lugarRetiro}
        onChange={handleLugarRetiroChange}
        maxLength={255}
        required
      />

      <textarea
        placeholder="Comentarios (opcional)"
        value={comentarios}
        onChange={handleComentariosChange}
      />
    </>
  )}
</div>
```

### Payload de Envío
```javascript
const payload = {
  respuestas: medicamentos.map(med => ({
    auditoriaId: med.auditoriaId,
    medicamentoId: med.id,
    acepta: med.acepta,
    precio: med.acepta ? parseFloat(med.precio) : null,
    fechaRetiro: med.acepta ? med.fechaRetiro : null,
    fechaVencimiento: med.acepta ? med.fechaVencimiento : null,
    lugarRetiro: med.acepta ? med.lugarRetiro : null,  // NUEVO
    comentarios: med.comentarios || null
  }))
};

await axios.post(`/api/presupuestos/responder/${token}`, payload);
```

---

## 📋 Ejemplo de Uso Completo

### 1. Proveedor recibe email con token
Email enviado por el sistema al crear solicitud.

### 2. Proveedor completa formulario
```
Medicamento: SINTROM 4mg comp. x 20 | Cantidad: 1

☑ Acepto proporcionar este medicamento

Precio: $ 1.250,50
Fecha de Retiro: 25/10/2025
Fecha de Vencimiento: 31/12/2026
Lugar de Retiro: Sucursal Centro - Av. San Martín 456, Ciudad
Comentarios: Stock disponible, entrega inmediata
```

### 3. Sistema guarda la información
```sql
INSERT INTO alt_presupuesto_respuesta_detalle
(id_solicitud_proveedor, id_auditoria, id_medicamento, acepta, precio,
 fecha_retiro, fecha_vencimiento, lugar_retiro, comentarios)
VALUES (1, 18, 101, 1, 1250.50, '2025-10-25', '2026-12-31',
        'Sucursal Centro - Av. San Martín 456, Ciudad',
        'Stock disponible, entrega inmediata');
```

### 4. Auditor compara presupuestos
Ve el lugar de retiro de cada proveedor para tomar decisión.

### 5. Auditor adjudica al mejor proveedor
El lugar de retiro queda registrado en la orden de compra.

---

## ✅ Resumen de Cambios

| Componente | Archivo | Cambio |
|-----------|---------|--------|
| Base de Datos | `alt_presupuesto_respuesta_detalle` | + campo `lugar_retiro` VARCHAR(255) |
| Backend | `presupuestoTokenController.js` (línea 431) | + `lugarRetiro` en destructuring |
| Backend | `presupuestoTokenController.js` (línea 443) | + validación obligatoria |
| Backend | `presupuestoTokenController.js` (línea 452) | + INSERT con lugar_retiro |
| Backend | `presupuestoTokenController.js` (línea 669) | + SELECT lugar_retiro (detalle) |
| Backend | `presupuestoTokenController.js` (línea 720) | + SELECT lugar_retiro (comparación) |
| Backend | `presupuestoTokenController.js` (línea 996) | + SELECT lugar_retiro (adjudicación) |
| Frontend | Formulario proveedor | + input text para lugar_retiro |

---

## 🧪 Testing

### Test 1: Crear respuesta sin lugar_retiro (debe fallar)
```bash
curl -X POST http://localhost:3000/api/presupuestos/responder/TOKEN \
-H "Content-Type: application/json" \
-d '{
  "respuestas": [{
    "auditoriaId": 18,
    "medicamentoId": 101,
    "acepta": true,
    "precio": 1250.50,
    "fechaRetiro": "2025-10-25",
    "fechaVencimiento": "2026-12-31"
  }]
}'

# Respuesta esperada: 400 Bad Request
# "Si acepta la solicitud debe proporcionar precio, fechaRetiro, fechaVencimiento y lugarRetiro"
```

### Test 2: Crear respuesta con lugar_retiro (debe funcionar)
```bash
curl -X POST http://localhost:3000/api/presupuestos/responder/TOKEN \
-H "Content-Type: application/json" \
-d '{
  "respuestas": [{
    "auditoriaId": 18,
    "medicamentoId": 101,
    "acepta": true,
    "precio": 1250.50,
    "fechaRetiro": "2025-10-25",
    "fechaVencimiento": "2026-12-31",
    "lugarRetiro": "Sucursal Centro - Av. San Martín 456",
    "comentarios": "Stock disponible"
  }]
}'

# Respuesta esperada: 200 OK
```

### Test 3: Verificar que aparece en consultas
```bash
curl http://localhost:3000/api/presupuestos/solicitudes-email/5 \
-H "Authorization: Bearer JWT_TOKEN"

# Debe incluir "lugar_retiro" en las respuestas
```

---

## 🚀 Despliegue

### Pasos para aplicar en producción:

1. **Backup de base de datos**
   ```bash
   mysqldump -u usuario -p base_datos > backup_$(date +%Y%m%d).sql
   ```

2. **Aplicar migración SQL**
   ```bash
   mysql -u usuario -p base_datos < migrations/add_lugar_retiro.sql
   ```

3. **Reiniciar servidor Node.js**
   ```bash
   pm2 restart api
   ```

4. **Actualizar frontend** con el nuevo campo en el formulario

5. **Verificar** que funcione correctamente

---

## 📞 Soporte

Para consultas sobre esta funcionalidad, contactar al equipo de desarrollo.
