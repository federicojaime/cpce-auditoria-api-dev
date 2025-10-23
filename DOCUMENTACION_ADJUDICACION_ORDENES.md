# 🏆 Documentación: Sistema de Adjudicación y Órdenes de Compra

## 🎯 Objetivo

Sistema completo para adjudicar presupuestos a proveedores ganadores y crear automáticamente órdenes de compra, actualizando el flujo completo desde auditoría hasta gestión de órdenes.

---

## 📊 Flujo Completo

```
1. AUDITORÍA → Estado 1 (Autorizado)
             ↓
2. SOLICITAR PRESUPUESTO → Estado 4 (En presupuesto)
             ↓
3. PROVEEDORES RESPONDEN
             ↓
4. COMPARAR PRESUPUESTOS
             ↓
5. ADJUDICAR A GANADOR → Estado 5 (En compra) + Crear Orden
             ↓
6. GESTIONAR ORDEN → Confirmar, Recibir, Notificar Paciente
```

---

## 🚀 API: Adjudicar Presupuesto

### POST `/api/presupuestos/solicitudes-email/:id/adjudicar`

Adjudica el presupuesto a un proveedor ganador y crea automáticamente las órdenes de compra.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "proveedorId": 5,
  "observaciones": "Mejor precio y fecha de entrega"
}
```

**Parámetros:**
- `proveedorId` (requerido): ID del proveedor ganador
- `observaciones` (opcional): Motivo de adjudicación

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Presupuesto adjudicado exitosamente",
  "solicitudId": 1,
  "loteNumero": "LOTE-20251020-1234",
  "proveedorNombre": "Farmacia Central",
  "montoTotal": 450000,
  "ordenesCreadas": [
    {
      "ordenId": 101,
      "auditoriaId": 123,
      "paciente": "García, Juan",
      "monto": 150000,
      "medicamentos": 2
    },
    {
      "ordenId": 102,
      "auditoriaId": 124,
      "paciente": "López, María",
      "monto": 300000,
      "medicamentos": 3
    }
  ],
  "cantidadOrdenes": 2
}
```

**Respuestas de Error:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | `Debe proporcionar el ID del proveedor adjudicado` | proveedorId faltante |
| 400 | `El proveedor aún no ha respondido` | Estado != RESPONDIDO |
| 400 | `El proveedor no aceptó ningún medicamento` | Todas las ofertas rechazadas |
| 404 | `Solicitud no encontrada` | ID inválido |
| 404 | `El proveedor no está en esta solicitud` | Proveedor no contactado |

---

## 🔄 Qué Hace el Sistema Automáticamente

### 1. Validaciones:
- ✅ Verifica que la solicitud existe
- ✅ Verifica que el proveedor fue contactado
- ✅ Verifica que el proveedor respondió
- ✅ Verifica que aceptó al menos un medicamento

### 2. Crea Órdenes de Compra:
- 📋 Una orden por cada auditoría
- 💰 Calcula monto automáticamente (precio × cantidad)
- 📅 Usa fecha de retiro del proveedor como fecha estimada
- 📝 Incluye observaciones de adjudicación

### 3. Actualiza Estados:
- Solicitud: `COMPLETADO` → `ADJUDICADO`
- Medicamentos: `estado_auditoria = 4` → `estado_auditoria = 5`
- Proveedor ganador: `RESPONDIDO` → `ADJUDICADO`

### 4. Crea Registros:
- Tabla `rec_compras_alto_costo`: Órdenes de compra
- Estado inicial: `confirmada`

---

## 📊 Estados de Órdenes de Compra

### Campo: `rec_compras_alto_costo.estado_compra`

| Estado | Descripción | Color UI |
|--------|-------------|----------|
| `confirmada` | Orden creada, proveedor confirmado | Azul 🔵 |
| `en_preparacion` | Proveedor preparando medicamentos | Amarillo 🟡 |
| `pendiente_envio` | Listo para enviar/retirar | Naranja 🟠 |
| `enviada` | Medicamentos enviados | Púrpura 🟣 |
| `recibida` | Medicamentos recibidos en CPCE | Verde 🟢 |
| `notificada` | Paciente notificado para retiro | Verde Claro 💚 |
| `entregada` | Paciente retiró medicamentos | Verde Oscuro 🟢 |
| `cancelada` | Orden cancelada | Rojo 🔴 |

---

## 🎨 Frontend: Adjudicar Presupuesto

### Comparador con Botón de Adjudicación

```jsx
const ComparadorConAdjudicacion = ({ solicitudId }) => {
  const [comparacion, setComparacion] = useState([]);
  const [loading, setLoading] = useState(false);

  const adjudicarProveedor = async (proveedorId, proveedorNombre) => {
    if (!confirm(`¿Adjudicar presupuesto a ${proveedorNombre}?`)) return;

    setLoading(true);
    try {
      const observaciones = prompt('Motivo de adjudicación (opcional):');

      const response = await fetch(`http://localhost:3000/api/presupuestos/solicitudes-email/${solicitudId}/adjudicar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          proveedorId,
          observaciones
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.mensaje}

📋 ${data.cantidadOrdenes} órdenes creadas
💰 Monto total: $${data.montoTotal.toLocaleString('es-AR')}

Las órdenes están disponibles en "Gestión de Órdenes"`);

        // Redirigir a gestión de órdenes
        window.location.href = '/gestion-ordenes';
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert('Error al adjudicar presupuesto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comparador-adjudicacion">
      <h2>Comparador de Presupuestos</h2>

      {comparacion.map((item, idx) => (
        <div key={idx} className="medicamento-comparacion">
          <h3>{item.medicamento.nombre}</h3>

          <div className="ofertas-grid">
            {item.ofertas.map((oferta, oIdx) => (
              <div
                key={oIdx}
                className={`oferta-card ${oferta === item.mejorOferta ? 'mejor-oferta' : ''}`}
              >
                {oferta === item.mejorOferta && (
                  <div className="badge-mejor">🏆 MEJOR PRECIO</div>
                )}

                <h4>{oferta.proveedor_nombre}</h4>

                {oferta.acepta ? (
                  <>
                    <div className="precio-grande">
                      ${parseFloat(oferta.precio).toLocaleString('es-AR')}
                    </div>
                    <p>📦 Retiro: {new Date(oferta.fecha_retiro).toLocaleDateString('es-AR')}</p>
                    <p>📅 Vence: {new Date(oferta.fecha_vencimiento).toLocaleDateString('es-AR')}</p>
                  </>
                ) : (
                  <p className="rechazado">❌ No acepta</p>
                )}

                {oferta.acepta && (
                  <button
                    className={`btn-adjudicar ${oferta === item.mejorOferta ? 'destacado' : ''}`}
                    onClick={() => adjudicarProveedor(oferta.proveedor_id, oferta.proveedor_nombre)}
                    disabled={loading}
                  >
                    {oferta === item.mejorOferta ? '🏆 Adjudicar (Recomendado)' : 'Adjudicar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

### CSS para Botón de Adjudicación

```css
.btn-adjudicar {
  width: 100%;
  padding: 0.8rem;
  margin-top: 1rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-adjudicar:hover {
  background: #1976D2;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.btn-adjudicar.destacado {
  background: linear-gradient(135deg, #4CAF50, #8BC34A);
  font-size: 1.05rem;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.btn-adjudicar.destacado:hover {
  background: linear-gradient(135deg, #45a049, #7CB342);
}

.btn-adjudicar:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

---

## 📋 Gestión de Órdenes de Compra

### GET `/api/ordenes-compra` (Ya existente, agregar filtros)

```javascript
const OrdenesDeCompra = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => {
    fetchOrdenes();
  }, [filtro]);

  const fetchOrdenes = async () => {
    const response = await fetch(`http://localhost:3000/api/ordenes-compra?estado=${filtro}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setOrdenes(data.ordenes);
  };

  return (
    <div className="ordenes-container">
      <div className="contadores">
        <div className="contador" onClick={() => setFiltro('confirmada')}>
          <h3>0</h3>
          <p>Confirmadas</p>
        </div>
        <div className="contador" onClick={() => setFiltro('en_preparacion')}>
          <h3>0</h3>
          <p>En Prep.</p>
        </div>
        <div className="contador" onClick={() => setFiltro('recibida')}>
          <h3>0</h3>
          <p>Recibidas</p>
        </div>
        {/* ... más contadores ... */}
      </div>

      <table className="ordenes-table">
        <thead>
          <tr>
            <th>ID Orden</th>
            <th>Paciente</th>
            <th>Proveedor</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Fecha Estimada</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map(orden => (
            <tr key={orden.id}>
              <td>#{orden.id}</td>
              <td>{orden.paciente_nombre}</td>
              <td>{orden.proveedor_nombre}</td>
              <td>${parseFloat(orden.monto_total).toLocaleString('es-AR')}</td>
              <td><EstadoBadge estado={orden.estado_compra} /></td>
              <td>{new Date(orden.fecha_estimada_entrega).toLocaleDateString('es-AR')}</td>
              <td>
                <button onClick={() => verDetalle(orden.id)}>Ver</button>
                {orden.estado_compra === 'recibida' && (
                  <button onClick={() => notificarPaciente(orden.id)}>
                    Notificar Paciente
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EstadoBadge = ({ estado }) => {
  const colores = {
    'confirmada': '#2196F3',
    'en_preparacion': '#FFC107',
    'pendiente_envio': '#FF9800',
    'enviada': '#9C27B0',
    'recibida': '#4CAF50',
    'notificada': '#8BC34A',
    'entregada': '#2E7D32',
    'cancelada': '#F44336'
  };

  return (
    <span
      className="estado-badge"
      style={{ backgroundColor: colores[estado] }}
    >
      {estado.replace('_', ' ').toUpperCase()}
    </span>
  );
};
```

---

## 📊 Reportes de Compras

### Estructura de Datos Requerida

```json
{
  "resumenEjecutivo": {
    "totalOrdenes": 45,
    "montoTotal": 12500000,
    "ordenesEntregadas": 30,
    "ordenesVencidas": 2,
    "proveedoresActivos": 8,
    "tiempoPromedioEntrega": "5 días",
    "ahorroTotal": 850000
  },
  "distribucionPorEstado": {
    "confirmada": 5,
    "en_preparacion": 3,
    "enviada": 2,
    "recibida": 4,
    "entregada": 30,
    "cancelada": 1
  },
  "analisisCumplimiento": {
    "aTiempo": 28,
    "conRetraso": 2,
    "porcentajeCumplimiento": 93.3
  },
  "topProveedores": [
    {
      "nombre": "Farmacia Central",
      "ordenes": 15,
      "monto": 4500000,
      "cumplimiento": 95
    }
  ]
}
```

---

## 🔄 Flujo Completo con Ejemplos

### 1. Auditor aprueba medicamentos
```
Estado: 0 → 1 (Autorizado)
```

### 2. Auditor solicita presupuesto
```
POST /api/presupuestos/solicitar-con-email
{
  "auditoriaIds": [123, 124],
  "proveedorIds": [1, 2, 3],
  "horasExpiracion": 72
}

Estado: 1 → 4 (En presupuesto)
```

### 3. Proveedores responden
```
3 proveedores contactados
2 respondieron
Estado solicitud: ENVIADO → PARCIAL → COMPLETADO
```

### 4. Auditor compara y adjudica
```
POST /api/presupuestos/solicitudes-email/1/adjudicar
{
  "proveedorId": 2,
  "observaciones": "Mejor precio y entrega rápida"
}

Estado medicamentos: 4 → 5 (En compra)
Estado solicitud: COMPLETADO → ADJUDICADO
Crea órdenes automáticamente
```

### 5. Gestión de órdenes
```
Orden #101 creada
Estado: confirmada
Paciente: García, Juan
Monto: $150,000
```

---

## ✅ Checklist de Implementación

### Backend (✅ COMPLETADO)
- [x] Endpoint de adjudicación
- [x] Creación automática de órdenes
- [x] Actualización de estados (4 → 5)
- [x] Validaciones completas
- [x] Cálculo automático de montos

### Frontend (🔲 TU TAREA)
- [ ] Botón "Adjudicar" en comparador
- [ ] Modal de confirmación con observaciones
- [ ] Pantalla de gestión de órdenes
- [ ] Contadores por estado
- [ ] Botón "Notificar Paciente"
- [ ] Reportes de compras con gráficos

---

**Última actualización:** 2025-10-22
**Versión:** 4.0.0 (Sistema completo de adjudicación y órdenes)
