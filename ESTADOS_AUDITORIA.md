# 📊 Estados de Auditoría de Medicamentos

## Campo: `rec_prescrmedicamento_alto_costo.estado_auditoria`

### Estados disponibles:

| Valor | Estado | Descripción | Acción Frontend |
|-------|--------|-------------|-----------------|
| `0` | **Pendiente de auditoría** | Medicamento esperando ser auditado | Mostrar en sección "Pendientes de Auditoría" |
| `1` | **Autorizado** | Medicamento auditado y aprobado, listo para solicitar presupuesto | Mostrar en sección "Disponibles para Presupuesto" |
| `2` | **Denegado** | Medicamento rechazado en auditoría | Mostrar en sección "Denegados" |
| `3` | **Requiere información** | Necesita más datos del médico/paciente | Mostrar en sección "Información Adicional Requerida" |
| `4` | **En presupuesto** | Ya se envió solicitud a proveedores | Mostrar en sección "Seguimiento de Presupuestos" |
| `5` | **En compra** | Presupuesto adjudicado, orden de compra creada | Mostrar en sección "Gestión de Órdenes" |

---

## 🔄 Flujo de Estados

```
┌─────────────────┐
│  0: Pendiente   │  ← Receta creada
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │  Auditor   │
    │   revisa   │
    └─────┬──────┘
          │
    ┌─────┴──────┬──────────────┬────────────────┐
    │            │              │                │
    ▼            ▼              ▼                ▼
┌────────┐  ┌────────┐    ┌────────┐      ┌──────────┐
│1:Auto- │  │2:Dene- │    │3:Req.  │      │   FIN    │
│rizado  │  │gado    │    │Info    │      │          │
└───┬────┘  └────────┘    └────────┘      └──────────┘
    │
    │ Auditor solicita presupuesto
    ▼
┌─────────────────┐
│ 4: En           │
│ Presupuesto     │
└────────┬────────┘
         │
         │ Proveedores responden
         │ Auditor adjudica
         ▼
┌─────────────────┐
│ 5: En Compra    │ → Orden creada
└─────────────────┘
```

---

## 🚀 Cambios Implementados

### Backend (✅ COMPLETADO)

1. **Al crear solicitud de presupuesto**, el sistema automáticamente:
   - Cambia `estado_auditoria` de `1` (Autorizado) a `4` (En presupuesto)
   - Esto ocurre en `presupuestoTokenController.js` líneas 91-98

2. **Consulta de auditorías disponibles** debe filtrar por `estado_auditoria = 1`:
   ```sql
   SELECT * FROM rec_prescrmedicamento_alto_costo
   WHERE estado_auditoria = 1
   -- Estos están listos para solicitar presupuesto
   ```

3. **Consulta de presupuestos en seguimiento** debe filtrar por `estado_auditoria = 4`:
   ```sql
   SELECT * FROM rec_prescrmedicamento_alto_costo
   WHERE estado_auditoria = 4
   -- Estos ya están en proceso de presupuesto
   ```

---

## 📱 Actualización Frontend Requerida

### 1. Pantalla "Auditorías Aprobadas"

**ANTES:**
```javascript
// Mostraba TODAS las auditorías con estado_auditoria = 1
```

**AHORA:**
```javascript
// Solo mostrar las que aún NO fueron enviadas a presupuesto
const auditoriasDisponibles = await fetch('/api/auditorias/aprobadas?estado=1');
// estado_auditoria = 1 (Autorizadas pero NO enviadas a presupuesto)
```

### 2. Nueva Pantalla "Seguimiento de Presupuestos"

**CREAR NUEVA SECCIÓN:**
```javascript
// Mostrar auditorías que ya tienen solicitud de presupuesto
const presupuestosEnProceso = await fetch('/api/auditorias/aprobadas?estado=4');
// estado_auditoria = 4 (En presupuesto)

// Aquí mostrar:
// - Número de lote
// - Proveedores contactados
// - Estado de respuestas
// - Fechas de expiración
```

---

## 🔍 Endpoints del Frontend

### Obtener auditorías por estado

```javascript
// Pendientes de auditoría (estado 0)
GET /api/auditorias/pendientes
// Retorna: medicamentos con estado_auditoria = 0

// Aprobadas y disponibles para presupuesto (estado 1)
GET /api/auditorias/aprobadas
// Retorna: medicamentos con estado_auditoria = 1

// En proceso de presupuesto (estado 4)
GET /api/auditorias/en-presupuesto
// Retorna: medicamentos con estado_auditoria = 4
// INCLUYE información de solicitud y proveedores
```

---

## 📋 Ejemplo de Respuesta con Presupuestos

```json
{
  "auditorias": [
    {
      "idreceta": 123,
      "paciente": "García, Juan",
      "dni": "12345678",
      "estado_auditoria": 4,
      "medicamentos": [
        {
          "nombre": "SINTROM",
          "cantidad": 20,
          "precio": 326164
        }
      ],
      "presupuesto": {
        "loteNumero": "LOTE-20251020-1234",
        "fechaEnvio": "2025-10-20T14:30:00Z",
        "fechaExpiracion": "2025-10-23T14:30:00Z",
        "proveedores": [
          {
            "nombre": "Farmacia Central",
            "estado": "ENVIADO",
            "respondio": false
          },
          {
            "nombre": "Droguería del Sur",
            "estado": "RESPONDIDO",
            "respondio": true,
            "fechaRespuesta": "2025-10-21T10:00:00Z"
          }
        ]
      }
    }
  ]
}
```

---

## ⚠️ IMPORTANTE - Migración de Datos

Si ya tienes datos en producción con `estado_auditoria = 1`, NO los cambies automáticamente.

Solo cambian a estado `4` cuando:
1. El auditor crea una nueva solicitud de presupuesto
2. El backend ejecuta el UPDATE automáticamente

---

## 🎨 Sugerencias de UI

### Sección "Disponibles para Presupuesto" (estado 1)
- Color: Verde
- Icono: ✅
- Botón: "Solicitar Presupuesto"

### Sección "Seguimiento de Presupuestos" (estado 4)
- Color: Azul
- Icono: 📋
- Mostrar:
  - Progreso de respuestas (Ej: "2 de 3 proveedores respondieron")
  - Tiempo restante de expiración
  - Botón "Ver Respuestas"

### Sección "Denegados" (estado 2)
- Color: Rojo
- Icono: ❌

### Sección "Requiere Información" (estado 3)
- Color: Amarillo
- Icono: ⚠️

---

## 🧪 Cómo Probar

1. **Auditar una receta** → pasa de estado 0 a 1
2. **Verificar que aparece en "Disponibles para Presupuesto"**
3. **Crear solicitud de presupuesto** con esa auditoría
4. **Verificar que YA NO aparece en "Disponibles para Presupuesto"**
5. **Verificar que SÍ aparece en "Seguimiento de Presupuestos"**
6. **Verificar que tiene estado_auditoria = 4 en la base de datos**

---

## 📞 Resumen para Implementar

### Frontend debe:
1. ✅ Filtrar auditorías aprobadas por `estado_auditoria = 1`
2. ✅ Crear nueva sección "Seguimiento" para `estado_auditoria = 4`
3. ✅ NO mostrar auditorías con estado 4 en "Disponibles para Presupuesto"
4. ✅ Mostrar información del lote y proveedores en seguimiento

### Backend ya hace automáticamente:
1. ✅ Cambiar estado de 1 a 4 al crear solicitud
2. ✅ Incluir precio del vademecum en los datos
3. ✅ Filtrar correctamente por estado en las consultas

---

**Última actualización:** 2025-10-20
**Versión:** 2.1.0 (con gestión de estados)
