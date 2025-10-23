# 📊 Sistema de Seguimiento de Presupuestos

## 🎯 Descripción General

Sistema completo para gestionar solicitudes de presupuesto a proveedores, con seguimiento de estados, respuestas y comparación de ofertas.

---

## 📈 Estados de Solicitudes

### Campo: `alt_solicitud_presupuesto.estado`

| Estado | Descripción | Cuándo cambia | Color UI |
|--------|-------------|---------------|----------|
| **ENVIADO** | Solicitud creada y emails enviados a proveedores | Al crear la solicitud | Azul 🔵 |
| **PARCIAL** | Al menos un proveedor respondió, pero no todos | Cuando responde el primer proveedor | Amarillo 🟡 |
| **COMPLETADO** | Todos los proveedores respondieron | Cuando responde el último proveedor | Verde 🟢 |
| **VENCIDO** | Expiró el plazo sin respuestas completas | Cuando expira el token | Rojo 🔴 |
| **ADJUDICADO** | Se seleccionó un proveedor ganador | Cuando el auditor adjudica | Púrpura 🟣 |
| **CANCELADO** | Solicitud cancelada manualmente | Manual | Gris ⚫ |

---

## 🔄 Flujo de Estados

```
┌──────────────┐
│   ENVIADO    │ ← Solicitud creada
└──────┬───────┘
       │
       ├─── Proveedor 1 responde
       │
       ▼
┌──────────────┐
│   PARCIAL    │ ← Respuestas parciales
└──────┬───────┘
       │
       ├─── Todos responden
       │
       ▼
┌──────────────┐
│ COMPLETADO   │
└──────┬───────┘
       │
       │ Auditor elige ganador
       ▼
┌──────────────┐
│ ADJUDICADO   │ → FIN
└──────────────┘

       ⏰ Expira
       ▼
┌──────────────┐
│   VENCIDO    │
└──────────────┘
```

---

## 📡 API Endpoints

### 1. Obtener Estadísticas (Contadores)

```http
GET /api/presupuestos/estadisticas-email
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "total": 4,
  "enviados": 0,
  "recibidos": 0,
  "pendientes": 0,
  "vencidos": 0,
  "adjudicados": 0,
  "detalle": {
    "parcial": 0,
    "completado": 0
  }
}
```

**Mapeo para tu UI:**
- `total` → **Total Solicitudes** (4)
- `enviados` → **Enviados** (0 azul)
- `recibidos` → **Recibidos** (0 verde) = parcial + completado
- `pendientes` → **Pendientes** (0 amarillo)
- `vencidos` → **Vencidos** (0 rojo)
- `adjudicados` → **Adjudicados** (0 púrpura)

---

### 2. Listar Solicitudes por Estado

```http
GET /api/presupuestos/solicitudes-email?estado=ENVIADO&page=1&limit=10
Authorization: Bearer {token}
```

**Parámetros Query:**
- `estado` (opcional): ENVIADO, PARCIAL, COMPLETADO, VENCIDO, ADJUDICADO, CANCELADO
- `page` (opcional, default: 1)
- `limit` (opcional, default: 10)

**Respuesta:**
```json
{
  "solicitudes": [
    {
      "id": 1,
      "lote_numero": "LOTE-20251020-1234",
      "fecha_envio": "2025-10-20T14:30:00Z",
      "estado": "PARCIAL",
      "observaciones": "Urgente",
      "usuario_envia_nombre": "Juan Pérez",
      "total_auditorias": 3,
      "total_proveedores": 5,
      "respuestas_recibidas": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

---

### 3. Obtener Detalle de Solicitud

```http
GET /api/presupuestos/solicitudes-email/:id
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "solicitud": {
    "id": 1,
    "lote_numero": "LOTE-20251020-1234",
    "fecha_envio": "2025-10-20T14:30:00Z",
    "estado": "PARCIAL",
    "observaciones": "Medicamentos críticos",
    "usuario_envia_nombre": "Juan Pérez",
    "usuario_envia_email": "juan@example.com"
  },
  "auditorias": [
    {
      "id": 123,
      "paciente_nombre": "García, María",
      "paciente_dni": "12345678"
    }
  ],
  "proveedores": [
    {
      "solicitud_proveedor_id": 1,
      "estado": "RESPONDIDO",
      "fecha_expiracion": "2025-10-23T14:30:00Z",
      "fecha_respuesta": "2025-10-21T10:00:00Z",
      "proveedor_id": 5,
      "proveedor_nombre": "Farmacia Central",
      "proveedor_email": "federiconj@gmail.com",
      "proveedor_telefono": "1234567890",
      "respuestas": [
        {
          "auditoria_id": 123,
          "medicamento_id": 790,
          "acepta": true,
          "precio": 658376,
          "fecha_retiro": "2025-10-25",
          "fecha_vencimiento": "2026-10-20",
          "comentarios": "Stock disponible",
          "fecha_respuesta": "2025-10-21T10:00:00Z",
          "medicamento_nombre": "AULO GELIO REPELENTE",
          "medicamento_presentacion": "crx 50 g"
        }
      ]
    },
    {
      "solicitud_proveedor_id": 2,
      "estado": "ENVIADO",
      "fecha_expiracion": "2025-10-23T14:30:00Z",
      "fecha_respuesta": null,
      "proveedor_id": 6,
      "proveedor_nombre": "Droguería del Sur",
      "proveedor_email": "compras@drogueria.com",
      "proveedor_telefono": null,
      "respuestas": []
    }
  ]
}
```

---

### 4. Comparar Presupuestos

```http
GET /api/presupuestos/comparar/:solicitudId
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "solicitudId": "1",
  "comparacion": [
    {
      "auditoria": {
        "id": 123,
        "paciente_nombre": "García, María",
        "paciente_dni": "12345678"
      },
      "medicamento": {
        "id": 790,
        "nombre": "SINTROM",
        "presentacion": "4 mg comp.x 20"
      },
      "ofertas": [
        {
          "proveedor_id": 5,
          "proveedor_nombre": "Farmacia Central",
          "acepta": true,
          "precio": 326164,
          "fecha_retiro": "2025-10-25",
          "fecha_vencimiento": "2026-10-20",
          "comentarios": "Stock disponible"
        },
        {
          "proveedor_id": 6,
          "proveedor_nombre": "Droguería del Sur",
          "acepta": true,
          "precio": 298500,
          "fecha_retiro": "2025-10-26",
          "fecha_vencimiento": "2026-12-15",
          "comentarios": "Mejor precio de la plaza"
        },
        {
          "proveedor_id": 7,
          "proveedor_nombre": "Farmacia Norte",
          "acepta": false,
          "precio": null,
          "fecha_retiro": null,
          "fecha_vencimiento": null,
          "comentarios": "Sin stock"
        }
      ],
      "mejorOferta": {
        "proveedor_id": 6,
        "proveedor_nombre": "Droguería del Sur",
        "acepta": true,
        "precio": 298500,
        "fecha_retiro": "2025-10-26",
        "fecha_vencimiento": "2026-12-15",
        "comentarios": "Mejor precio de la plaza"
      },
      "totalOfertas": 3,
      "ofertasAceptadas": 2
    }
  ]
}
```

---

### 5. Actualizar Estado Manualmente

```http
PUT /api/presupuestos/solicitudes-email/:id/estado
Authorization: Bearer {token}
Content-Type: application/json

{
  "estado": "ADJUDICADO"
}
```

**Estados válidos:**
- ENVIADO
- PARCIAL
- COMPLETADO
- VENCIDO
- ADJUDICADO
- CANCELADO

**Respuesta:**
```json
{
  "mensaje": "Estado actualizado exitosamente",
  "solicitudId": "1",
  "nuevoEstado": "ADJUDICADO"
}
```

---

## 🎨 Implementación Frontend

### Dashboard de Estadísticas

```jsx
import React, { useState, useEffect } from 'react';

const DashboardPresupuestos = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const fetchEstadisticas = async () => {
    const response = await fetch('http://localhost:3000/api/presupuestos/estadisticas-email', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setStats(data);
  };

  if (!stats) return <div>Cargando...</div>;

  return (
    <div className="dashboard-stats">
      <StatCard
        title="Total Solicitudes"
        value={stats.total}
        color="#333"
      />
      <StatCard
        title="Enviados"
        value={stats.enviados}
        color="#2196F3"
        icon="📤"
      />
      <StatCard
        title="Recibidos"
        value={stats.recibidos}
        color="#4CAF50"
        icon="✅"
      />
      <StatCard
        title="Pendientes"
        value={stats.pendientes}
        color="#FFC107"
        icon="⏳"
      />
      <StatCard
        title="Vencidos"
        value={stats.vencidos}
        color="#F44336"
        icon="⚠️"
      />
      <StatCard
        title="Adjudicados"
        value={stats.adjudicados}
        color="#9C27B0"
        icon="🏆"
      />
    </div>
  );
};

const StatCard = ({ title, value, color, icon }) => (
  <div className="stat-card" style={{ borderColor: color }}>
    <div className="stat-icon">{icon}</div>
    <h3>{value}</h3>
    <p>{title}</p>
  </div>
);
```

### CSS para Stats

```css
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  border-left: 4px solid;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-card h3 {
  font-size: 2.5rem;
  margin: 0.5rem 0;
  font-weight: bold;
}

.stat-card p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}
```

---

### Lista de Solicitudes por Estado

```jsx
const ListaSolicitudes = ({ estado }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSolicitudes();
  }, [estado, page]);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const query = estado ? `?estado=${estado}&page=${page}` : `?page=${page}`;
      const response = await fetch(`http://localhost:3000/api/presupuestos/solicitudes-email${query}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setSolicitudes(data.solicitudes);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'ENVIADO': { color: '#2196F3', icon: '📤', text: 'Enviado' },
      'PARCIAL': { color: '#FFC107', icon: '⏳', text: 'Parcial' },
      'COMPLETADO': { color: '#4CAF50', icon: '✅', text: 'Completado' },
      'VENCIDO': { color: '#F44336', icon: '⚠️', text: 'Vencido' },
      'ADJUDICADO': { color: '#9C27B0', icon: '🏆', text: 'Adjudicado' },
      'CANCELADO': { color: '#9E9E9E', icon: '❌', text: 'Cancelado' }
    };
    const badge = badges[estado] || {};
    return (
      <span className="estado-badge" style={{ backgroundColor: badge.color }}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="solicitudes-container">
      <h2>Solicitudes {estado ? `- ${estado}` : ''}</h2>

      <table className="solicitudes-table">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Fecha Envío</th>
            <th>Estado</th>
            <th>Auditorías</th>
            <th>Proveedores</th>
            <th>Respuestas</th>
            <th>Progreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map(solicitud => (
            <tr key={solicitud.id}>
              <td><strong>{solicitud.lote_numero}</strong></td>
              <td>{new Date(solicitud.fecha_envio).toLocaleDateString('es-AR')}</td>
              <td>{getEstadoBadge(solicitud.estado)}</td>
              <td>{solicitud.total_auditorias}</td>
              <td>{solicitud.total_proveedores}</td>
              <td>{solicitud.respuestas_recibidas} / {solicitud.total_proveedores}</td>
              <td>
                <ProgressBar
                  current={solicitud.respuestas_recibidas}
                  total={solicitud.total_proveedores}
                />
              </td>
              <td>
                <button onClick={() => verDetalle(solicitud.id)}>
                  Ver Detalle
                </button>
                {solicitud.estado === 'COMPLETADO' && (
                  <button onClick={() => comparar(solicitud.id)}>
                    Comparar
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

const ProgressBar = ({ current, total }) => {
  const percentage = (current / total) * 100;
  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar-fill"
        style={{ width: `${percentage}%` }}
      />
      <span className="progress-text">{Math.round(percentage)}%</span>
    </div>
  );
};
```

---

### Detalle de Solicitud con Respuestas

```jsx
const DetalleSolicitud = ({ solicitudId }) => {
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    fetchDetalle();
  }, [solicitudId]);

  const fetchDetalle = async () => {
    const response = await fetch(`http://localhost:3000/api/presupuestos/solicitudes-email/${solicitudId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setDetalle(data);
  };

  if (!detalle) return <div>Cargando...</div>;

  return (
    <div className="detalle-solicitud">
      <h2>Solicitud {detalle.solicitud.lote_numero}</h2>

      <div className="info-general">
        <p><strong>Estado:</strong> {detalle.solicitud.estado}</p>
        <p><strong>Fecha Envío:</strong> {new Date(detalle.solicitud.fecha_envio).toLocaleString('es-AR')}</p>
        <p><strong>Creado por:</strong> {detalle.solicitud.usuario_envia_nombre}</p>
        {detalle.solicitud.observaciones && (
          <p><strong>Observaciones:</strong> {detalle.solicitud.observaciones}</p>
        )}
      </div>

      <h3>Auditorías Incluidas ({detalle.auditorias.length})</h3>
      <ul className="auditorias-list">
        {detalle.auditorias.map(aud => (
          <li key={aud.id}>
            #{aud.id} - {aud.paciente_nombre} (DNI: {aud.paciente_dni})
          </li>
        ))}
      </ul>

      <h3>Respuestas de Proveedores</h3>
      {detalle.proveedores.map(proveedor => (
        <div key={proveedor.proveedor_id} className="proveedor-card">
          <div className="proveedor-header">
            <h4>{proveedor.proveedor_nombre}</h4>
            <span className={`estado-badge ${proveedor.estado.toLowerCase()}`}>
              {proveedor.estado}
            </span>
          </div>

          <div className="proveedor-info">
            <p>📧 {proveedor.proveedor_email}</p>
            {proveedor.proveedor_telefono && <p>📞 {proveedor.proveedor_telefono}</p>}
            <p>⏰ Expira: {new Date(proveedor.fecha_expiracion).toLocaleString('es-AR')}</p>
            {proveedor.fecha_respuesta && (
              <p>✅ Respondió: {new Date(proveedor.fecha_respuesta).toLocaleString('es-AR')}</p>
            )}
          </div>

          {proveedor.respuestas.length > 0 ? (
            <table className="respuestas-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Acepta</th>
                  <th>Precio</th>
                  <th>Fecha Retiro</th>
                  <th>Vencimiento</th>
                  <th>Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {proveedor.respuestas.map((resp, idx) => (
                  <tr key={idx} className={resp.acepta ? 'acepta' : 'rechaza'}>
                    <td>{resp.medicamento_nombre}</td>
                    <td>
                      {resp.acepta ? '✅ Sí' : '❌ No'}
                    </td>
                    <td>
                      {resp.precio ? `$${parseFloat(resp.precio).toLocaleString('es-AR')}` : '-'}
                    </td>
                    <td>{resp.fecha_retiro || '-'}</td>
                    <td>{resp.fecha_vencimiento || '-'}</td>
                    <td>{resp.comentarios || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="sin-respuesta">⏳ Aún no respondió</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

### Comparador de Presupuestos

```jsx
const ComparadorPresupuestos = ({ solicitudId }) => {
  const [comparacion, setComparacion] = useState([]);

  useEffect(() => {
    fetchComparacion();
  }, [solicitudId]);

  const fetchComparacion = async () => {
    const response = await fetch(`http://localhost:3000/api/presupuestos/comparar/${solicitudId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setComparacion(data.comparacion);
  };

  return (
    <div className="comparador">
      <h2>Comparador de Presupuestos</h2>

      {comparacion.map((item, idx) => (
        <div key={idx} className="medicamento-comparacion">
          <h3>{item.medicamento.nombre}</h3>
          <p className="presentacion">{item.medicamento.presentacion}</p>
          <p className="paciente">Paciente: {item.auditoria.paciente_nombre}</p>

          <div className="ofertas-grid">
            {item.ofertas.map((oferta, oIdx) => (
              <div
                key={oIdx}
                className={`oferta-card ${oferta === item.mejorOferta ? 'mejor-oferta' : ''} ${!oferta.acepta ? 'rechazada' : ''}`}
              >
                {oferta === item.mejorOferta && <div className="badge-mejor">🏆 MEJOR PRECIO</div>}

                <h4>{oferta.proveedor_nombre}</h4>

                {oferta.acepta ? (
                  <>
                    <div className="precio-grande">
                      ${parseFloat(oferta.precio).toLocaleString('es-AR')}
                    </div>
                    <p>📦 Retiro: {new Date(oferta.fecha_retiro).toLocaleDateString('es-AR')}</p>
                    <p>📅 Vence: {new Date(oferta.fecha_vencimiento).toLocaleDateString('es-AR')}</p>
                    {oferta.comentarios && <p className="comentarios">💬 {oferta.comentarios}</p>}
                  </>
                ) : (
                  <div className="rechazado">
                    <p>❌ No acepta</p>
                    {oferta.comentarios && <p>{oferta.comentarios}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="resumen-ofertas">
            <p>Total de ofertas: {item.totalOfertas}</p>
            <p>Aceptadas: {item.ofertasAceptadas}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 🎨 CSS Completo

```css
/* Estados Badge */
.estado-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
}

/* Tabla de solicitudes */
.solicitudes-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-radius: 10px;
  overflow: hidden;
}

.solicitudes-table thead {
  background: #f5f5f5;
}

.solicitudes-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #333;
}

.solicitudes-table td {
  padding: 1rem;
  border-top: 1px solid #eee;
}

.solicitudes-table tbody tr:hover {
  background: #f9f9f9;
}

/* Progress Bar */
.progress-bar-container {
  position: relative;
  width: 100%;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: bold;
  color: #333;
}

/* Proveedor Card */
.proveedor-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.proveedor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.proveedor-info {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 5px;
  margin-bottom: 1rem;
}

.proveedor-info p {
  margin: 0.5rem 0;
}

/* Respuestas Table */
.respuestas-table {
  width: 100%;
  margin-top: 1rem;
}

.respuestas-table tr.acepta {
  background: #e8f5e9;
}

.respuestas-table tr.rechaza {
  background: #ffebee;
}

/* Comparador */
.medicamento-comparacion {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.ofertas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.oferta-card {
  position: relative;
  background: #f9f9f9;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.5rem;
  transition: transform 0.2s;
}

.oferta-card:hover {
  transform: translateY(-5px);
}

.oferta-card.mejor-oferta {
  border-color: #4CAF50;
  border-width: 3px;
  background: #f1f8f4;
}

.oferta-card.rechazada {
  opacity: 0.6;
  background: #fafafa;
}

.badge-mejor {
  position: absolute;
  top: -10px;
  right: 10px;
  background: #4CAF50;
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
}

.precio-grande {
  font-size: 2rem;
  font-weight: bold;
  color: #2196F3;
  margin: 1rem 0;
}

.rechazado {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.comentarios {
  background: white;
  padding: 0.8rem;
  border-left: 3px solid #2196F3;
  margin-top: 1rem;
  font-style: italic;
}
```

---

## 🔄 Actualización Automática de Estados

El sistema actualiza estados automáticamente cuando:

1. **ENVIADO → PARCIAL**: Cuando el primer proveedor responde
2. **PARCIAL → COMPLETADO**: Cuando el último proveedor responde
3. **ENVIADO/PARCIAL → VENCIDO**: Cuando expira el token

---

## 📋 Checklist de Implementación Frontend

### Backend (✅ COMPLETADO)
- [x] Endpoints de estadísticas
- [x] Endpoints de listado por estado
- [x] Endpoint de detalle con respuestas
- [x] Endpoint de comparación
- [x] Actualización automática de estados
- [x] Endpoint para cambiar estado manualmente

### Frontend (🔲 TU TAREA)
- [ ] Dashboard con contadores (6 tarjetas)
- [ ] Lista de solicitudes con filtro por estado
- [ ] Página de detalle de solicitud
- [ ] Comparador de presupuestos
- [ ] Indicadores de progreso (X/Y proveedores)
- [ ] Badges de estado con colores
- [ ] Notificaciones cuando cambia estado

---

**Última actualización:** 2025-10-20
**Versión:** 3.0.0 (Sistema completo de seguimiento)
