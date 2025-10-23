# 📋 Documentación: Sistema de Horas de Expiración Configurables

## 🎯 Objetivo

Permitir que el auditor configure cuántas horas tendrán los proveedores para responder a la solicitud de presupuesto antes de que el token expire.

---

## 🔧 Implementación Backend (YA COMPLETADO)

### Cambios realizados:

1. **Nuevo parámetro**: `horasExpiracion` (opcional)
2. **Validaciones**:
   - Mínimo: 1 hora
   - Máximo: 720 horas (30 días)
   - Valor por defecto: 72 horas (si no se envía)
3. **Cálculo dinámico**: La fecha de expiración se calcula usando el valor recibido

---

## 📤 API Endpoint

### POST `/api/presupuestos/solicitar-con-email`

**Headers:**
```
Authorization: Bearer {token_jwt}
Content-Type: application/json
```

**Request Body:**
```json
{
  "auditoriaIds": [123, 456, 789],
  "proveedorIds": [1, 2, 3],
  "observaciones": "Urgente - Medicamentos críticos",
  "horasExpiracion": 48
}
```

**Parámetros:**

| Campo | Tipo | Requerido | Descripción | Valor por defecto |
|-------|------|-----------|-------------|-------------------|
| `auditoriaIds` | Array de números | ✅ Sí | IDs de las auditorías aprobadas | - |
| `proveedorIds` | Array de números | ✅ Sí | IDs de los proveedores a contactar | - |
| `observaciones` | String | ❌ No | Comentarios adicionales | null |
| `horasExpiracion` | Number | ❌ No | Horas antes de que expire el token | 72 |

**Validaciones de `horasExpiracion`:**

- ✅ Debe ser un número entero
- ✅ Mínimo: 1 hora
- ✅ Máximo: 720 horas (30 días)
- ✅ Si no se envía o es `null`/`undefined`, usa 72 horas por defecto

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Solicitud de presupuesto creada exitosamente",
  "solicitudId": 42,
  "loteNumero": "LOTE-20251020-3847",
  "fechaExpiracion": "2025-10-22T14:30:00.000Z",
  "cantidadProveedores": 3,
  "resultadosEnvio": [
    {
      "proveedor": "Farmacia Central",
      "email": "federiconj@gmail.com",
      "enviado": true,
      "error": null
    },
    {
      "proveedor": "Droguería del Sur",
      "email": "compras@drogueria.com",
      "enviado": true,
      "error": null
    }
  ]
}
```

**Respuestas de Error:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | `Las horas de expiración deben ser un número mayor o igual a 1` | Valor < 1 o no numérico |
| 400 | `Las horas de expiración no pueden exceder 720 horas (30 días)` | Valor > 720 |
| 400 | `Debe proporcionar al menos una auditoría` | Array vacío |
| 400 | `Debe seleccionar al menos un proveedor` | Array vacío |

---

## 🎨 Implementación Frontend (REACT)

### Opción 1: Campo de Input Simple

```jsx
import React, { useState } from 'react';

const FormularioPresupuesto = () => {
  const [auditoriaIds, setAuditoriaIds] = useState([]);
  const [proveedorIds, setProveedorIds] = useState([]);
  const [horasExpiracion, setHorasExpiracion] = useState(72);
  const [observaciones, setObservaciones] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/api/presupuestos/solicitar-con-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          auditoriaIds,
          proveedorIds,
          observaciones,
          horasExpiracion: parseInt(horasExpiracion) // Asegurar que sea número
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Solicitud creada: ${data.loteNumero}`);
        console.log('Resultados de envío:', data.resultadosEnvio);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear solicitud');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... otros campos ... */}

      <div className="form-group">
        <label htmlFor="horasExpiracion">
          ⏰ Tiempo de expiración (horas)
        </label>
        <input
          type="number"
          id="horasExpiracion"
          value={horasExpiracion}
          onChange={(e) => setHorasExpiracion(e.target.value)}
          min="1"
          max="720"
          placeholder="72"
        />
        <small className="help-text">
          Los proveedores tendrán {horasExpiracion} horas para responder
          (Mínimo: 1h, Máximo: 720h / 30 días)
        </small>
      </div>

      <button type="submit">Enviar Solicitud</button>
    </form>
  );
};

export default FormularioPresupuesto;
```

---

### Opción 2: Select con Opciones Predefinidas

```jsx
const FormularioPresupuesto = () => {
  const [horasExpiracion, setHorasExpiracion] = useState(72);

  const opcionesExpiracion = [
    { value: 12, label: '12 horas (medio día)' },
    { value: 24, label: '24 horas (1 día)' },
    { value: 48, label: '48 horas (2 días)' },
    { value: 72, label: '72 horas (3 días) - Recomendado' },
    { value: 96, label: '96 horas (4 días)' },
    { value: 120, label: '120 horas (5 días)' },
    { value: 168, label: '168 horas (7 días / 1 semana)' },
    { value: 336, label: '336 horas (14 días / 2 semanas)' },
    { value: 720, label: '720 horas (30 días / 1 mes)' }
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="horasExpiracion">
          ⏰ Tiempo de expiración
        </label>
        <select
          id="horasExpiracion"
          value={horasExpiracion}
          onChange={(e) => setHorasExpiracion(parseInt(e.target.value))}
        >
          {opcionesExpiracion.map(opcion => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
};
```

---

### Opción 3: Slider con Vista Previa de Fecha

```jsx
import React, { useState, useMemo } from 'react';

const FormularioPresupuesto = () => {
  const [horasExpiracion, setHorasExpiracion] = useState(72);

  // Calcular fecha de expiración en tiempo real
  const fechaExpiracion = useMemo(() => {
    const fecha = new Date();
    fecha.setHours(fecha.getHours() + parseInt(horasExpiracion));
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [horasExpiracion]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="horasExpiracion">
          ⏰ Tiempo de expiración: {horasExpiracion} horas
        </label>

        <input
          type="range"
          id="horasExpiracion"
          value={horasExpiracion}
          onChange={(e) => setHorasExpiracion(e.target.value)}
          min="1"
          max="720"
          step="1"
        />

        <div className="expiracion-info">
          <p>📅 Los proveedores podrán responder hasta:</p>
          <p className="fecha-expiracion"><strong>{fechaExpiracion}</strong></p>
          <p className="dias-equivalente">
            ({Math.floor(horasExpiracion / 24)} días y {horasExpiracion % 24} horas)
          </p>
        </div>
      </div>
    </form>
  );
};
```

---

## 🎨 CSS Sugerido

```css
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.form-group input[type="range"] {
  width: 100%;
  height: 8px;
  background: linear-gradient(to right, #ff6b6b 0%, #ffd93d 50%, #6bcf7f 100%);
  border-radius: 5px;
  outline: none;
}

.help-text {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.expiracion-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f0f8ff;
  border-left: 4px solid #0066cc;
  border-radius: 5px;
}

.fecha-expiracion {
  font-size: 1.25rem;
  color: #0066cc;
  margin: 0.5rem 0;
}

.dias-equivalente {
  font-size: 0.875rem;
  color: #666;
  font-style: italic;
}
```

---

## 📊 Ejemplos de Uso

### Caso 1: Urgente (12 horas)
```json
{
  "auditoriaIds": [101],
  "proveedorIds": [5, 6],
  "observaciones": "URGENTE - Paciente requiere medicamento inmediato",
  "horasExpiracion": 12
}
```
**Email dirá:** "⏰ Este enlace expira el 21/10/2025 02:30" (12 horas desde ahora)

---

### Caso 2: Estándar (72 horas)
```json
{
  "auditoriaIds": [102, 103],
  "proveedorIds": [1, 2, 3],
  "horasExpiracion": 72
}
```
**Email dirá:** "⏰ Este enlace expira el 23/10/2025 14:30" (3 días desde ahora)

---

### Caso 3: Sin especificar (usa default de 72 horas)
```json
{
  "auditoriaIds": [104],
  "proveedorIds": [7]
}
```
**Sistema usa:** 72 horas automáticamente

---

## 🧪 Testing

### Pruebas que debes hacer en el frontend:

1. **Valor por defecto:**
   - No enviar `horasExpiracion` → debe usar 72 horas

2. **Validación mínima:**
   - Enviar `horasExpiracion: 0` → debe dar error
   - Enviar `horasExpiracion: -5` → debe dar error

3. **Validación máxima:**
   - Enviar `horasExpiracion: 721` → debe dar error
   - Enviar `horasExpiracion: 720` → debe funcionar

4. **Valores válidos:**
   - Enviar `horasExpiracion: 24` → debe calcular expiración en 1 día
   - Enviar `horasExpiracion: 168` → debe calcular expiración en 7 días

---

## 📧 Impacto en Emails

El email enviado a los proveedores mostrará:

```
⏰ IMPORTANTE: Este enlace expira el {fecha_calculada} ({horasExpiracion} horas desde el envío)
```

**Ejemplo con 48 horas:**
```
⏰ IMPORTANTE: Este enlace expira el 22/10/2025 14:30 (48 horas desde el envío)
```

---

## ✅ Checklist de Implementación

### Backend (✅ COMPLETADO)
- [x] Agregar parámetro `horasExpiracion` al controlador
- [x] Validar rango (1-720)
- [x] Usar valor por defecto de 72 si no se envía
- [x] Calcular fecha de expiración dinámicamente

### Frontend (🔲 TU TAREA)
- [ ] Agregar campo al formulario de solicitud
- [ ] Validar input en el cliente (min=1, max=720)
- [ ] Mostrar preview de fecha de expiración
- [ ] Enviar `horasExpiracion` en el POST request
- [ ] Manejar errores de validación del servidor
- [ ] Agregar estilos al campo
- [ ] Probar diferentes valores

---

## 💡 Recomendaciones UX

1. **Valor sugerido:** 72 horas (3 días) es un buen balance
2. **Rangos comunes:**
   - Urgente: 12-24 horas
   - Normal: 48-72 horas
   - Relajado: 120-168 horas (5-7 días)
3. **Mostrar countdown:** Considera agregar un indicador visual de cuánto tiempo falta
4. **Color coding:** Rojo para < 24h, amarillo para 24-72h, verde para > 72h

---

## 🐛 Troubleshooting

**Problema:** Error "Las horas de expiración deben ser un número mayor o igual a 1"
**Solución:** Asegúrate de convertir a `parseInt()` antes de enviar

**Problema:** El campo muestra "72.5" horas
**Solución:** Usa `parseInt()` o agrega `step="1"` al input

**Problema:** Los proveedores no reciben el email
**Solución:** Verifica que ejecutaste la migración SQL para agregar las columnas `token` y `fecha_expiracion`

---

## 📞 Soporte

Si tienes dudas sobre la implementación, verifica:
1. Que el request incluya `horasExpiracion` como número
2. Que el valor esté entre 1 y 720
3. Que tengas el token JWT válido en el header `Authorization`
4. Que los `auditoriaIds` y `proveedorIds` existan en la base de datos

---

**Última actualización:** 2025-10-20
**Versión Backend:** 2.0.0 (con horas configurables)
