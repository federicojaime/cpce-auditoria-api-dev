# 💰 Documentación: Sistema de Precios en Auditorías

## 🎯 Objetivo

Todas las consultas de auditorías ahora incluyen el **precio total** calculado automáticamente desde el vademecum, multiplicando el precio unitario por la cantidad prescrita de cada medicamento.

---

## ✅ Cambios Implementados

### 1. **GET `/api/alto-costo/pendientes`** - Auditorías Pendientes

**Campo agregado:** `precio_total`

**Cálculo:**
```sql
COALESCE(SUM(v.precio * pm.cantprescripta), 0) as precio_total
```

**Respuesta JSON:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "apellido": "Jaime",
      "nombre": "Federico",
      "dni": "38437748",
      "fecha": "17-10-2025",
      "medico": "Juan Perez MP-227793",
      "renglones": 1,
      "precio_total": 75000
    }
  ]
}
```

---

### 2. **GET `/api/alto-costo/historicas`** - Auditorías Procesadas

**Campo agregado:** `precio_total`

**Cálculo:**
```sql
COALESCE(SUM(v.precio * pm.cantprescripta), 0) as precio_total
```

**Respuesta JSON:**
```json
{
  "success": true,
  "data": [
    {
      "id": 124,
      "apellido": "Jaime",
      "nombre": "Federico",
      "dni": "38437748",
      "fecha": "17-10-2025",
      "medico": "Juan Perez MP-227793",
      "renglones": 1,
      "fechaAuditoria": "20-10-2025",
      "auditor": "Ana García",
      "precio_total": 75000
    }
  ]
}
```

---

### 3. **GET `/api/alto-costo/:id`** - Detalle Completo de Auditoría

**Campos agregados:**
- `precio_unitario` - Precio individual de cada medicamento
- `precio_total` - Precio × cantidad de cada medicamento
- `precio_total` - Precio total de la auditoría (suma de todos los medicamentos)

**Respuesta JSON:**
```json
{
  "success": true,
  "auditoria": {
    "id": 123,
    "idpaciente": 456,
    "fecha_origen": "17/10/2025",
    "diagnostico": "Diabetes tipo 2",
    "paciente": {
      "id": 456,
      "apellido": "Jaime",
      "nombre": "Federico",
      "dni": "38437748",
      "edad": 35
    },
    "medico": {
      "matricula": "227793",
      "nombre_completo": "Juan Perez",
      "especialidad": "Endocrinología"
    },
    "medicamentos": [
      {
        "idreceta": 123,
        "nro_orden": 1,
        "codigo": 790,
        "cantprescripta": 1,
        "nombre_comercial": "SINTROM",
        "presentacion": "4 mg comp.x 20",
        "precio_unitario": 75000,
        "precio_total": 75000,
        "estado_auditoria": 1
      }
    ],
    "renglones": 1,
    "precio_total": 75000
  }
}
```

---

### 4. **POST `/api/presupuestos/solicitar-con-email`** - Crear Solicitud

Ya incluía precios, ahora se obtienen correctamente del vademecum:

```json
{
  "auditoriaIds": [123, 456],
  "proveedorIds": [1, 2, 3],
  "horasExpiracion": 72
}
```

**Respuesta con precios:**
```json
{
  "mensaje": "Solicitud de presupuesto creada exitosamente",
  "solicitudId": 42,
  "loteNumero": "LOTE-20251020-3847",
  "auditorias": [
    {
      "id": 123,
      "paciente_nombre": "García, Juan",
      "medicamentos": [
        {
          "id": 790,
          "nombre": "SINTROM",
          "cantidad": 1,
          "precio": 75000
        }
      ]
    }
  ]
}
```

---

## 📊 Fórmula de Cálculo

### Precio por Medicamento:
```
precio_total_medicamento = precio_vademecum × cantidad_prescrita
```

### Precio por Auditoría:
```
precio_total_auditoria = Σ(precio × cantidad) de todos los medicamentos
```

**Ejemplo:**
- Medicamento 1: $75,000 × 2 unidades = $150,000
- Medicamento 2: $50,000 × 1 unidad = $50,000
- **Total Auditoría**: $200,000

---

## 🎨 Frontend - Cómo Mostrar los Precios

### Lista de Auditorías Pendientes

```jsx
const AuditoriasPendientes = () => {
  const [auditorias, setAuditorias] = useState([]);

  useEffect(() => {
    fetchAuditorias();
  }, []);

  const fetchAuditorias = async () => {
    const response = await fetch('http://localhost:3000/api/alto-costo/pendientes', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setAuditorias(data.data);
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Prioridad</th>
          <th>Paciente</th>
          <th>Fecha Prescripción</th>
          <th>Médico Especialista</th>
          <th>Medicamentos</th>
          <th>Tipo</th>
          <th>Costo Estimado</th>
        </tr>
      </thead>
      <tbody>
        {auditorias.map(aud => (
          <tr key={aud.id}>
            <td><span className="prioridad-media">MEDIA</span></td>
            <td>
              {aud.apellido}, {aud.nombre}<br/>
              <small>DNI: {aud.dni}</small>
            </td>
            <td>{aud.fecha}<br/><small>5 días</small></td>
            <td>{aud.medico}</td>
            <td>{aud.renglones}</td>
            <td><span className="tipo-onc">ONC</span></td>
            <td className="precio">
              💰 ${parseFloat(aud.precio_total).toLocaleString('es-AR')}<br/>
              <small>/mes</small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### Detalle de Auditoría con Precios

```jsx
const DetalleAuditoria = ({ auditoriaId }) => {
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    fetchDetalle();
  }, [auditoriaId]);

  const fetchDetalle = async () => {
    const response = await fetch(`http://localhost:3000/api/alto-costo/${auditoriaId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setDetalle(data.auditoria);
  };

  if (!detalle) return <div>Cargando...</div>;

  return (
    <div className="detalle-auditoria">
      <h2>Auditoría #{detalle.id}</h2>

      <div className="resumen-costo">
        <h3>Costo Total Estimado</h3>
        <div className="precio-grande">
          ${parseFloat(detalle.precio_total).toLocaleString('es-AR')}
        </div>
      </div>

      <h3>Medicamentos Prescritos</h3>
      <table className="medicamentos-table">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Presentación</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Precio Total</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {detalle.medicamentos.map((med, idx) => (
            <tr key={idx}>
              <td><strong>{med.nombre_comercial}</strong></td>
              <td>{med.presentacion}</td>
              <td>{med.cantprescripta}</td>
              <td>${parseFloat(med.precio_unitario).toLocaleString('es-AR')}</td>
              <td className="precio-total">
                <strong>${parseFloat(med.precio_total).toLocaleString('es-AR')}</strong>
              </td>
              <td>
                {med.estado_auditoria === 1 ? (
                  <span className="badge-aprobado">✅ Aprobado</span>
                ) : med.estado_auditoria === 0 ? (
                  <span className="badge-pendiente">⏳ Pendiente</span>
                ) : (
                  <span className="badge-rechazado">❌ Rechazado</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="4" align="right"><strong>TOTAL:</strong></td>
            <td className="precio-total-final">
              <strong>${parseFloat(detalle.precio_total).toLocaleString('es-AR')}</strong>
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
```

---

## 🎨 CSS Sugerido

```css
/* Precio en lista */
.precio {
  text-align: right;
  font-weight: 600;
  color: #2196F3;
}

.precio small {
  color: #666;
  font-weight: normal;
  font-size: 0.85rem;
}

/* Resumen de costo */
.resumen-costo {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  margin: 2rem 0;
}

.precio-grande {
  font-size: 3rem;
  font-weight: bold;
  margin: 1rem 0;
}

/* Tabla de medicamentos */
.medicamentos-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.medicamentos-table th {
  background: #f5f5f5;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

.medicamentos-table td {
  padding: 1rem;
  border-top: 1px solid #eee;
}

.precio-total {
  text-align: right;
  color: #2196F3;
}

.precio-total-final {
  background: #e3f2fd;
  font-size: 1.25rem;
  color: #1976D2;
  text-align: right;
}

/* Badges de estado */
.badge-aprobado {
  background: #4CAF50;
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge-pendiente {
  background: #FFC107;
  color: #333;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge-rechazado {
  background: #F44336;
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}
```

---

## 📋 Ejemplo de Respuestas Completas

### GET `/api/alto-costo/pendientes`

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "apellido": "Jaime",
      "nombre": "Federico",
      "dni": "38437748",
      "fecha": "17-10-2025",
      "medico": "Juan Perez MP-227793",
      "renglones": 3,
      "precio_total": 225000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### GET `/api/alto-costo/historicas`

```json
{
  "success": true,
  "data": [
    {
      "id": 124,
      "apellido": "García",
      "nombre": "María",
      "dni": "12345678",
      "fecha": "15-10-2025",
      "medico": "Ana López MP-445566",
      "renglones": 2,
      "fechaAuditoria": "18-10-2025",
      "auditor": "Carlos Ruiz",
      "precio_total": 180000
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

## 🔍 Verificación en Base de Datos

Para verificar los precios en la base de datos:

```sql
-- Ver precios de medicamentos de una receta
SELECT
    pm.idreceta,
    pm.nro_orden,
    v.nombre_comercial,
    v.presentacion,
    pm.cantprescripta as cantidad,
    v.precio as precio_unitario,
    (v.precio * pm.cantprescripta) as precio_total
FROM rec_prescrmedicamento_alto_costo pm
LEFT JOIN rec_vademecum v ON pm.idmedicamento = v.codigo
WHERE pm.idreceta = 123;

-- Ver precio total de una auditoría
SELECT
    r.idreceta,
    CONCAT(p.apellido, ', ', p.nombre) as paciente,
    COUNT(pm.nro_orden) as medicamentos,
    SUM(v.precio * pm.cantprescripta) as precio_total
FROM rec_receta_alto_costo r
INNER JOIN rec_paciente p ON r.idpaciente = p.id
INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
LEFT JOIN rec_vademecum v ON pm.idmedicamento = v.codigo
WHERE r.idreceta = 123
GROUP BY r.idreceta, p.apellido, p.nombre;
```

---

## ⚠️ Notas Importantes

1. **Si un medicamento no tiene precio en el vademecum**, el campo `precio_total` será `0`
2. **El precio es orientativo** basado en el vademecum al momento de la consulta
3. **El cálculo es**: `precio_vademecum × cantidad_prescrita`
4. **En la UI**, siempre usa `toLocaleString('es-AR')` para formatear los números con separadores de miles

---

## ✅ Checklist de Implementación Frontend

- [ ] Mostrar "Costo Estimado" en la lista de auditorías pendientes
- [ ] Mostrar "Precio Total" en el detalle de cada auditoría
- [ ] Mostrar "Precio Unitario" y "Precio Total" por cada medicamento
- [ ] Agregar totalizador al pie de la tabla de medicamentos
- [ ] Formatear precios con separadores de miles ($75.000 en lugar de $75000)
- [ ] Mostrar el signo "$" antes del monto
- [ ] Agregar "/mes" si es un tratamiento mensual

---

**Última actualización:** 2025-10-20
**Versión:** 3.1.0 (Sistema de precios completo)
