# 📊 DOCUMENTACIÓN API: Reportes de Compras - Guía para Frontend

## Fecha: 2025-10-22

---

## 🎯 DESCRIPCIÓN GENERAL

Esta API proporciona endpoints completos para generar reportes y análisis detallados sobre las órdenes de compra de medicamentos de alto costo.

**URL Base:** `http://localhost:3000/api/compras`

**Autenticación:** Todas las rutas requieren token JWT en el header `Authorization: Bearer {token}`

---

## 📑 ÍNDICE DE ENDPOINTS

1. [Estadísticas Ejecutivas](#1-estadísticas-ejecutivas)
2. [Distribución por Estados](#2-distribución-por-estados)
3. [Análisis de Cumplimiento](#3-análisis-de-cumplimiento)
4. [Ranking de Proveedores](#4-ranking-de-proveedores)
5. [Listar Órdenes](#5-listar-órdenes)
6. [Detalle de Orden](#6-detalle-de-orden)

---

## 1. ESTADÍSTICAS EJECUTIVAS

### `GET /api/compras/reportes/estadisticas`

Obtiene el resumen ejecutivo con las métricas principales del sistema de compras.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaDesde` | Date (YYYY-MM-DD) | No | Fecha inicial del rango |
| `fechaHasta` | Date (YYYY-MM-DD) | No | Fecha final del rango |
| `proveedorId` | Integer | No | Filtrar por proveedor específico o "TODOS" |
| `estado` | String | No | Filtrar por estado específico o "TODOS" |

### Ejemplo de Llamada (JavaScript/Axios)

```javascript
import axios from 'axios';

const obtenerEstadisticas = async () => {
    try {
        const response = await axios.get('/api/compras/reportes/estadisticas', {
            params: {
                fechaDesde: '2025-01-01',
                fechaHasta: '2025-10-22',
                proveedorId: 'TODOS',
                estado: 'TODOS'
            },
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        throw error;
    }
};
```

### Response (200 OK)

```json
{
  "resumen": {
    "totalOrdenes": 45,
    "montoTotal": 2250000.50,
    "montoPromedio": 50000.01,
    "entregadas": 30,
    "pendientes": 12,
    "vencidas": 3,
    "proveedores": 5,
    "tiempoPromedioEntrega": "7.5"
  },
  "distribucionEstados": [
    {
      "estado_compra": "entregado",
      "cantidad": 30
    },
    {
      "estado_compra": "listo_retiro",
      "cantidad": 8
    },
    {
      "estado_compra": "en_preparacion",
      "cantidad": 4
    },
    {
      "estado_compra": "confirmado",
      "cantidad": 2
    },
    {
      "estado_compra": "adjudicado",
      "cantidad": 1
    }
  ]
}
```

### Uso en React Component

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ResumenEjecutivo = () => {
    const [estadisticas, setEstadisticas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        fechaDesde: '2025-01-01',
        fechaHasta: '2025-10-22',
        proveedorId: 'TODOS',
        estado: 'TODOS'
    });

    useEffect(() => {
        cargarEstadisticas();
    }, [filtros]);

    const cargarEstadisticas = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/compras/reportes/estadisticas', {
                params: filtros,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setEstadisticas(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="resumen-ejecutivo">
            <h2>Resumen Ejecutivo</h2>

            <div className="tarjetas-resumen">
                <div className="tarjeta">
                    <h3>Total Órdenes</h3>
                    <p className="valor">{estadisticas.resumen.totalOrdenes}</p>
                </div>

                <div className="tarjeta">
                    <h3>Monto Total</h3>
                    <p className="valor">
                        ${estadisticas.resumen.montoTotal.toLocaleString('es-AR')}
                    </p>
                </div>

                <div className="tarjeta">
                    <h3>Entregadas</h3>
                    <p className="valor success">{estadisticas.resumen.entregadas}</p>
                </div>

                <div className="tarjeta">
                    <h3>Pendientes</h3>
                    <p className="valor warning">{estadisticas.resumen.pendientes}</p>
                </div>

                <div className="tarjeta">
                    <h3>Vencidas</h3>
                    <p className="valor danger">{estadisticas.resumen.vencidas}</p>
                </div>

                <div className="tarjeta">
                    <h3>Proveedores</h3>
                    <p className="valor">{estadisticas.resumen.proveedores}</p>
                </div>

                <div className="tarjeta">
                    <h3>Tiempo Prom. Entrega</h3>
                    <p className="valor">{estadisticas.resumen.tiempoPromedioEntrega} días</p>
                </div>
            </div>
        </div>
    );
};

export default ResumenEjecutivo;
```

---

## 2. DISTRIBUCIÓN POR ESTADOS

### `GET /api/compras/reportes/distribucion-estados`

Obtiene la distribución de órdenes agrupadas por estado con porcentajes.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaDesde` | Date | No | Fecha inicial del rango |
| `fechaHasta` | Date | No | Fecha final del rango |
| `proveedorId` | Integer | No | Filtrar por proveedor |

### Ejemplo de Llamada

```javascript
const obtenerDistribucion = async (filtros) => {
    const response = await axios.get('/api/compras/reportes/distribucion-estados', {
        params: filtros,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};
```

### Response (200 OK)

```json
{
  "distribucion": [
    {
      "estado": "entregado",
      "cantidad": 30,
      "monto_total": 1500000.00,
      "porcentaje": 66.67
    },
    {
      "estado": "listo_retiro",
      "cantidad": 8,
      "monto_total": 400000.00,
      "porcentaje": 17.78
    },
    {
      "estado": "en_preparacion",
      "cantidad": 4,
      "monto_total": 200000.00,
      "porcentaje": 8.89
    },
    {
      "estado": "confirmado",
      "cantidad": 2,
      "monto_total": 100000.00,
      "porcentaje": 4.44
    },
    {
      "estado": "adjudicado",
      "cantidad": 1,
      "monto_total": 50000.00,
      "porcentaje": 2.22
    }
  ]
}
```

### Uso con Chart.js (Gráfico de Torta)

```jsx
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import axios from 'axios';

const GraficoDistribucion = () => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const response = await axios.get('/api/compras/reportes/distribucion-estados', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const distribucion = response.data.distribucion;

            // Configurar colores por estado
            const colores = {
                'adjudicado': '#28a745',
                'confirmado': '#17a2b8',
                'en_preparacion': '#ffc107',
                'listo_retiro': '#20c997',
                'entregado': '#28a745',
                'cancelado': '#dc3545',
                'finalizado': '#6c757d'
            };

            setChartData({
                labels: distribucion.map(d => d.estado.toUpperCase().replace('_', ' ')),
                datasets: [{
                    data: distribucion.map(d => d.cantidad),
                    backgroundColor: distribucion.map(d => colores[d.estado] || '#6c757d'),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            });
        } catch (error) {
            console.error('Error cargando distribución:', error);
        }
    };

    if (!chartData) return <div>Cargando gráfico...</div>;

    return (
        <div className="grafico-distribucion">
            <h3>Distribución por Estados</h3>
            <Pie data={chartData} options={{
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const porcentaje = ((value / total) * 100).toFixed(2);
                                return `${label}: ${value} (${porcentaje}%)`;
                            }
                        }
                    }
                }
            }} />
        </div>
    );
};

export default GraficoDistribucion;
```

---

## 3. ANÁLISIS DE CUMPLIMIENTO

### `GET /api/compras/reportes/cumplimiento`

Analiza el cumplimiento de tiempos de entrega comparando fechas estimadas vs reales.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaDesde` | Date | No | Fecha inicial |
| `fechaHasta` | Date | No | Fecha final |
| `proveedorId` | Integer | No | Filtrar por proveedor |

### Ejemplo de Llamada

```javascript
const obtenerCumplimiento = async () => {
    const response = await axios.get('/api/compras/reportes/cumplimiento', {
        params: {
            fechaDesde: '2025-01-01',
            fechaHasta: '2025-10-22'
        },
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};
```

### Response (200 OK)

```json
{
  "cumplimiento": {
    "total_ordenes_entregadas": 30,
    "entregadas_a_tiempo": 25,
    "entregadas_tarde": 5,
    "porcentaje_cumplimiento": 83.33,
    "dias_promedio_entrega": 7.5,
    "desviacion_promedio_dias": 1.2
  },
  "distribucionTiempos": [
    {
      "rango_dias": "1-3 días",
      "cantidad": 10
    },
    {
      "rango_dias": "4-7 días",
      "cantidad": 15
    },
    {
      "rango_dias": "8-15 días",
      "cantidad": 4
    },
    {
      "rango_dias": "16-30 días",
      "cantidad": 1
    }
  ]
}
```

### Uso en React

```jsx
const AnalisisCumplimiento = () => {
    const [cumplimiento, setCumplimiento] = useState(null);

    useEffect(() => {
        cargarCumplimiento();
    }, []);

    const cargarCumplimiento = async () => {
        try {
            const response = await axios.get('/api/compras/reportes/cumplimiento', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setCumplimiento(response.data.cumplimiento);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    if (!cumplimiento) return <div>Cargando...</div>;

    const porcentajeCumplimiento = parseFloat(cumplimiento.porcentaje_cumplimiento);

    return (
        <div className="cumplimiento-container">
            <h3>Análisis de Cumplimiento</h3>

            <div className="indicador-cumplimiento">
                <div className="circular-progress" style={{
                    background: `conic-gradient(#28a745 0% ${porcentajeCumplimiento}%, #e9ecef ${porcentajeCumplimiento}% 100%)`
                }}>
                    <span className="porcentaje">{porcentajeCumplimiento}%</span>
                </div>
                <p>Cumplimiento de Tiempos</p>
            </div>

            <div className="metricas">
                <div className="metrica">
                    <span className="label">Total Entregadas:</span>
                    <span className="value">{cumplimiento.total_ordenes_entregadas}</span>
                </div>
                <div className="metrica success">
                    <span className="label">A Tiempo:</span>
                    <span className="value">{cumplimiento.entregadas_a_tiempo}</span>
                </div>
                <div className="metrica danger">
                    <span className="label">Tarde:</span>
                    <span className="value">{cumplimiento.entregadas_tarde}</span>
                </div>
                <div className="metrica">
                    <span className="label">Promedio Entrega:</span>
                    <span className="value">{cumplimiento.dias_promedio_entrega} días</span>
                </div>
            </div>
        </div>
    );
};

export default AnalisisCumplimiento;
```

---

## 4. RANKING DE PROVEEDORES

### `GET /api/compras/reportes/ranking-proveedores`

Obtiene el ranking de proveedores ordenados por desempeño.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaDesde` | Date | No | Fecha inicial |
| `fechaHasta` | Date | No | Fecha final |
| `limit` | Integer (1-50) | No | Cantidad de proveedores (default: 10) |

### Ejemplo de Llamada

```javascript
const obtenerRankingProveedores = async (limit = 10) => {
    const response = await axios.get('/api/compras/reportes/ranking-proveedores', {
        params: { limit },
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};
```

### Response (200 OK)

```json
{
  "ranking": [
    {
      "id_proveedor": 2,
      "razon_social": "Droguería Alta luna S.R.L.s",
      "total_ordenes": 20,
      "monto_total": 1000000.00,
      "monto_promedio": 50000.00,
      "ordenes_entregadas": 18,
      "ordenes_pendientes": 2,
      "ordenes_canceladas": 0,
      "tiempo_promedio_entrega": 6.5,
      "tasa_cumplimiento": 90.00
    },
    {
      "id_proveedor": 1,
      "razon_social": "Droguería del Sud S.R.Ls",
      "total_ordenes": 15,
      "monto_total": 750000.00,
      "monto_promedio": 50000.00,
      "ordenes_entregadas": 12,
      "ordenes_pendientes": 3,
      "ordenes_canceladas": 0,
      "tiempo_promedio_entrega": 8.2,
      "tasa_cumplimiento": 80.00
    }
  ]
}
```

### Uso en React (Tabla con Ranking)

```jsx
const RankingProveedores = () => {
    const [proveedores, setProveedores] = useState([]);

    useEffect(() => {
        cargarRanking();
    }, []);

    const cargarRanking = async () => {
        try {
            const response = await axios.get('/api/compras/reportes/ranking-proveedores', {
                params: { limit: 10 },
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setProveedores(response.data.ranking);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div className="ranking-proveedores">
            <h3>Top 10 Proveedores</h3>
            <table className="tabla-ranking">
                <thead>
                    <tr>
                        <th>Posición</th>
                        <th>Proveedor</th>
                        <th>Órdenes</th>
                        <th>Monto Total</th>
                        <th>Cumplimiento</th>
                        <th>Tiempo Prom.</th>
                    </tr>
                </thead>
                <tbody>
                    {proveedores.map((proveedor, index) => (
                        <tr key={proveedor.id_proveedor}>
                            <td className="posicion">
                                {index + 1 === 1 && '🥇'}
                                {index + 1 === 2 && '🥈'}
                                {index + 1 === 3 && '🥉'}
                                {index + 1 > 3 && index + 1}
                            </td>
                            <td>{proveedor.razon_social}</td>
                            <td>{proveedor.total_ordenes}</td>
                            <td>${proveedor.monto_total.toLocaleString('es-AR')}</td>
                            <td>
                                <span className={`badge ${proveedor.tasa_cumplimiento >= 90 ? 'success' : 'warning'}`}>
                                    {proveedor.tasa_cumplimiento}%
                                </span>
                            </td>
                            <td>{proveedor.tiempo_promedio_entrega} días</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RankingProveedores;
```

---

## 5. LISTAR ÓRDENES

### `GET /api/compras/ordenes`

Lista todas las órdenes de compra con filtros y paginación.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaDesde` | Date | No | Fecha inicial |
| `fechaHasta` | Date | No | Fecha final |
| `proveedorId` | Integer | No | Filtrar por proveedor |
| `estado` | String | No | Filtrar por estado |
| `page` | Integer | No | Página actual (default: 1) |
| `limit` | Integer | No | Registros por página (default: 20) |
| `sortBy` | String | No | Campo de ordenamiento (fecha_recepcion, monto_total, estado_compra, fecha_estimada_entrega) |
| `sortOrder` | String | No | ASC o DESC (default: DESC) |

### Ejemplo de Llamada

```javascript
const listarOrdenes = async (filtros) => {
    const response = await axios.get('/api/compras/ordenes', {
        params: {
            fechaDesde: filtros.fechaDesde,
            fechaHasta: filtros.fechaHasta,
            proveedorId: filtros.proveedorId,
            estado: filtros.estado,
            page: filtros.page || 1,
            limit: filtros.limit || 20,
            sortBy: filtros.sortBy || 'fecha_recepcion',
            sortOrder: filtros.sortOrder || 'DESC'
        },
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};
```

### Response (200 OK)

```json
{
  "ordenes": [
    {
      "orden_id": 123,
      "auditoria_id": 17,
      "id_proveedor": 2,
      "proveedor_nombre": "Droguería Alta luna S.R.L.s",
      "id_solicitud_presupuesto": 18,
      "lote_numero": "LOTE-20251022-1142",
      "monto_total": 1231211.00,
      "estado_compra": "listo_retiro",
      "fecha_recepcion": "2025-10-22T17:40:00.000Z",
      "fecha_envio_proveedores": null,
      "fecha_estimada_entrega": "2025-11-11T00:00:00.000Z",
      "fecha_entrega_real": null,
      "lugar_retiro": "Sucursal Centro - Av. San Martín 456",
      "observaciones": "Adjudicado desde lote LOTE-20251022-1142",
      "paciente_nombre": "Jaime, Federico",
      "paciente_dni": "38437748",
      "total_medicamentos": 1
    }
  ],
  "paginacion": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Uso en React (Tabla con Filtros y Paginación)

```jsx
const ListadoOrdenes = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [paginacion, setPaginacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        fechaDesde: '2025-01-01',
        fechaHasta: '2025-10-22',
        proveedorId: 'TODOS',
        estado: 'TODOS',
        page: 1,
        limit: 20,
        sortBy: 'fecha_recepcion',
        sortOrder: 'DESC'
    });

    useEffect(() => {
        cargarOrdenes();
    }, [filtros]);

    const cargarOrdenes = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/compras/ordenes', {
                params: filtros,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setOrdenes(response.data.ordenes);
            setPaginacion(response.data.paginacion);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const cambiarPagina = (nuevaPagina) => {
        setFiltros({ ...filtros, page: nuevaPagina });
    };

    const aplicarFiltros = (nuevosFiltros) => {
        setFiltros({ ...filtros, ...nuevosFiltros, page: 1 });
    };

    const estadoBadgeClass = (estado) => {
        const clases = {
            'adjudicado': 'badge-success',
            'confirmado': 'badge-info',
            'en_preparacion': 'badge-warning',
            'listo_retiro': 'badge-primary',
            'entregado': 'badge-success',
            'cancelado': 'badge-danger',
            'finalizado': 'badge-secondary'
        };
        return clases[estado] || 'badge-secondary';
    };

    if (loading) return <div>Cargando órdenes...</div>;

    return (
        <div className="listado-ordenes">
            {/* Filtros */}
            <div className="filtros-container">
                <div className="filtro-grupo">
                    <label>Fecha Desde:</label>
                    <input
                        type="date"
                        value={filtros.fechaDesde}
                        onChange={(e) => aplicarFiltros({ fechaDesde: e.target.value })}
                    />
                </div>
                <div className="filtro-grupo">
                    <label>Fecha Hasta:</label>
                    <input
                        type="date"
                        value={filtros.fechaHasta}
                        onChange={(e) => aplicarFiltros({ fechaHasta: e.target.value })}
                    />
                </div>
                <div className="filtro-grupo">
                    <label>Estado:</label>
                    <select
                        value={filtros.estado}
                        onChange={(e) => aplicarFiltros({ estado: e.target.value })}
                    >
                        <option value="TODOS">Todos</option>
                        <option value="adjudicado">Adjudicado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="en_preparacion">En Preparación</option>
                        <option value="listo_retiro">Listo Retiro</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
                <button onClick={cargarOrdenes} className="btn-aplicar">
                    Aplicar Filtros
                </button>
            </div>

            {/* Tabla */}
            <table className="tabla-ordenes">
                <thead>
                    <tr>
                        <th>Orden #</th>
                        <th>Fecha</th>
                        <th>Paciente</th>
                        <th>Proveedor</th>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th>Medicamentos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {ordenes.map(orden => (
                        <tr key={orden.orden_id}>
                            <td>#{orden.orden_id}</td>
                            <td>{new Date(orden.fecha_recepcion).toLocaleDateString('es-AR')}</td>
                            <td>{orden.paciente_nombre}</td>
                            <td>{orden.proveedor_nombre}</td>
                            <td>${orden.monto_total.toLocaleString('es-AR')}</td>
                            <td>
                                <span className={`badge ${estadoBadgeClass(orden.estado_compra)}`}>
                                    {orden.estado_compra.toUpperCase().replace('_', ' ')}
                                </span>
                            </td>
                            <td>{orden.total_medicamentos}</td>
                            <td>
                                <button
                                    className="btn-ver"
                                    onClick={() => window.location.href = `/ordenes/${orden.orden_id}`}
                                >
                                    Ver Detalle
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Paginación */}
            {paginacion && (
                <div className="paginacion">
                    <button
                        disabled={paginacion.page === 1}
                        onClick={() => cambiarPagina(paginacion.page - 1)}
                    >
                        Anterior
                    </button>
                    <span>
                        Página {paginacion.page} de {paginacion.totalPages}
                    </span>
                    <button
                        disabled={paginacion.page === paginacion.totalPages}
                        onClick={() => cambiarPagina(paginacion.page + 1)}
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
};

export default ListadoOrdenes;
```

---

## 6. DETALLE DE ORDEN

### `GET /api/compras/ordenes/:id`

Obtiene el detalle completo de una orden específica con todos sus medicamentos.

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID de la orden |

### Ejemplo de Llamada

```javascript
const obtenerDetalleOrden = async (ordenId) => {
    const response = await axios.get(`/api/compras/ordenes/${ordenId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};
```

### Response (200 OK)

```json
{
  "orden": {
    "orden_id": 123,
    "auditoria_id": 17,
    "id_proveedor": 2,
    "proveedor_nombre": "Droguería Alta luna S.R.L.s",
    "proveedor_cuit": "20-12345678-9",
    "proveedor_email": "contacto@altaluna.com",
    "proveedor_telefono": "351-1234567",
    "id_solicitud_presupuesto": 18,
    "lote_numero": "LOTE-20251022-1142",
    "monto_total": 1231211.00,
    "estado_compra": "listo_retiro",
    "fecha_recepcion": "2025-10-22T17:40:00.000Z",
    "fecha_envio_proveedores": null,
    "fecha_estimada_entrega": "2025-11-11T00:00:00.000Z",
    "fecha_entrega_real": null,
    "lugar_retiro": "Sucursal Centro - Av. San Martín 456",
    "observaciones": "Adjudicado desde lote LOTE-20251022-1142",
    "id_usuario_compras": null,
    "usuario_adjudico": null,
    "paciente_nombre": "Jaime, Federico",
    "paciente_dni": "38437748",
    "paciente_email": "federicojni@gmail.com",
    "paciente_telefono": "351-9876543",
    "receta_numero": "REC-2025-001"
  },
  "medicamentos": [
    {
      "id": 1,
      "id_medicamento": 101,
      "codigo_medicamento": "101",
      "nombre_medicamento": "SINTROM",
      "presentacion": "4 mg comp.x 20",
      "cantidad": 1,
      "precio_unitario": 1231211.00,
      "precio_total": 1231211.00,
      "fecha_vencimiento": "2026-12-31",
      "lote_medicamento": null,
      "observaciones": "sdasdascxzc"
    }
  ]
}
```

### Uso en React (Página de Detalle)

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const DetalleOrden = () => {
    const { id } = useParams();
    const [orden, setOrden] = useState(null);
    const [medicamentos, setMedicamentos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDetalle();
    }, [id]);

    const cargarDetalle = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/compras/ordenes/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setOrden(response.data.orden);
            setMedicamentos(response.data.medicamentos);
        } catch (error) {
            console.error('Error cargando detalle:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Cargando detalle...</div>;
    if (!orden) return <div>Orden no encontrada</div>;

    return (
        <div className="detalle-orden-container">
            <div className="header-detalle">
                <h2>Orden #{orden.orden_id}</h2>
                <span className={`badge estado-${orden.estado_compra}`}>
                    {orden.estado_compra.toUpperCase().replace('_', ' ')}
                </span>
            </div>

            {/* Información de la Orden */}
            <div className="seccion-info">
                <h3>Información General</h3>
                <div className="grid-info">
                    <div className="info-item">
                        <label>Lote:</label>
                        <span>{orden.lote_numero}</span>
                    </div>
                    <div className="info-item">
                        <label>Fecha Recepción:</label>
                        <span>{new Date(orden.fecha_recepcion).toLocaleDateString('es-AR')}</span>
                    </div>
                    <div className="info-item">
                        <label>Fecha Estimada Entrega:</label>
                        <span>{new Date(orden.fecha_estimada_entrega).toLocaleDateString('es-AR')}</span>
                    </div>
                    <div className="info-item">
                        <label>Monto Total:</label>
                        <span className="monto">${orden.monto_total.toLocaleString('es-AR')}</span>
                    </div>
                </div>
            </div>

            {/* Información del Proveedor */}
            <div className="seccion-info">
                <h3>Proveedor</h3>
                <div className="grid-info">
                    <div className="info-item">
                        <label>Razón Social:</label>
                        <span>{orden.proveedor_nombre}</span>
                    </div>
                    <div className="info-item">
                        <label>CUIT:</label>
                        <span>{orden.proveedor_cuit}</span>
                    </div>
                    <div className="info-item">
                        <label>Email:</label>
                        <span>{orden.proveedor_email}</span>
                    </div>
                    <div className="info-item">
                        <label>Teléfono:</label>
                        <span>{orden.proveedor_telefono}</span>
                    </div>
                </div>
            </div>

            {/* Información del Paciente */}
            <div className="seccion-info">
                <h3>Paciente</h3>
                <div className="grid-info">
                    <div className="info-item">
                        <label>Nombre:</label>
                        <span>{orden.paciente_nombre}</span>
                    </div>
                    <div className="info-item">
                        <label>DNI:</label>
                        <span>{orden.paciente_dni}</span>
                    </div>
                    <div className="info-item">
                        <label>Email:</label>
                        <span>{orden.paciente_email}</span>
                    </div>
                    <div className="info-item">
                        <label>Teléfono:</label>
                        <span>{orden.paciente_telefono}</span>
                    </div>
                </div>
            </div>

            {/* Lugar de Retiro */}
            {orden.lugar_retiro && (
                <div className="seccion-info lugar-retiro">
                    <h3>📍 Lugar de Retiro</h3>
                    <p className="direccion">{orden.lugar_retiro}</p>
                </div>
            )}

            {/* Medicamentos */}
            <div className="seccion-medicamentos">
                <h3>Medicamentos</h3>
                <table className="tabla-medicamentos">
                    <thead>
                        <tr>
                            <th>Medicamento</th>
                            <th>Presentación</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Precio Total</th>
                            <th>Vencimiento</th>
                        </tr>
                    </thead>
                    <tbody>
                        {medicamentos.map(med => (
                            <tr key={med.id}>
                                <td className="med-nombre">{med.nombre_medicamento}</td>
                                <td>{med.presentacion}</td>
                                <td>{med.cantidad}</td>
                                <td>${med.precio_unitario.toLocaleString('es-AR')}</td>
                                <td className="precio-total">${med.precio_total.toLocaleString('es-AR')}</td>
                                <td>{new Date(med.fecha_vencimiento).toLocaleDateString('es-AR')}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="4" className="text-right"><strong>Total:</strong></td>
                            <td className="total-general">
                                ${orden.monto_total.toLocaleString('es-AR')}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Observaciones */}
            {orden.observaciones && (
                <div className="seccion-info">
                    <h3>Observaciones</h3>
                    <p className="observaciones">{orden.observaciones}</p>
                </div>
            )}

            {/* Acciones */}
            <div className="acciones-detalle">
                <button className="btn-volver" onClick={() => window.history.back()}>
                    Volver
                </button>
                <button className="btn-imprimir" onClick={() => window.print()}>
                    Imprimir
                </button>
                <button className="btn-exportar" onClick={() => exportarPDF(orden, medicamentos)}>
                    Exportar PDF
                </button>
            </div>
        </div>
    );
};

export default DetalleOrden;
```

---

## 🎨 ESTILOS CSS RECOMENDADOS

```css
/* Tarjetas de Resumen */
.resumen-ejecutivo .tarjetas-resumen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.tarjeta {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    text-align: center;
}

.tarjeta h3 {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
}

.tarjeta .valor {
    font-size: 32px;
    font-weight: bold;
    color: #333;
}

.tarjeta .valor.success { color: #28a745; }
.tarjeta .valor.warning { color: #ffc107; }
.tarjeta .valor.danger { color: #dc3545; }

/* Badges de Estado */
.badge {
    display: inline-block;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
}

.badge-success { background-color: #28a745; color: white; }
.badge-info { background-color: #17a2b8; color: white; }
.badge-warning { background-color: #ffc107; color: #000; }
.badge-danger { background-color: #dc3545; color: white; }
.badge-secondary { background-color: #6c757d; color: white; }

/* Tabla */
.tabla-ordenes {
    width: 100%;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tabla-ordenes thead {
    background-color: #f8f9fa;
}

.tabla-ordenes th,
.tabla-ordenes td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
}

.tabla-ordenes tbody tr:hover {
    background-color: #f8f9fa;
}

/* Filtros */
.filtros-container {
    background: white;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 20px;
    display: flex;
    gap: 15px;
    align-items: flex-end;
}

.filtro-grupo {
    display: flex;
    flex-direction: column;
}

.filtro-grupo label {
    font-size: 14px;
    margin-bottom: 5px;
    color: #666;
}

.filtro-grupo input,
.filtro-grupo select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

/* Paginación */
.paginacion {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 20px;
}

.paginacion button {
    padding: 8px 16px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
}

.paginacion button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.paginacion button:not(:disabled):hover {
    background-color: #f8f9fa;
}
```

---

## 🚀 EXPORTAR A EXCEL

Ejemplo de función para exportar reportes a Excel:

```javascript
import * as XLSX from 'xlsx';

const exportarExcel = async (filtros) => {
    try {
        // Obtener datos con los filtros
        const response = await axios.get('/api/compras/ordenes', {
            params: {
                ...filtros,
                limit: 10000 // Sin paginación para export
            },
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const ordenes = response.data.ordenes;

        // Formatear datos para Excel
        const datosExcel = ordenes.map(orden => ({
            'Orden #': orden.orden_id,
            'Fecha': new Date(orden.fecha_recepcion).toLocaleDateString('es-AR'),
            'Paciente': orden.paciente_nombre,
            'DNI': orden.paciente_dni,
            'Proveedor': orden.proveedor_nombre,
            'Lote': orden.lote_numero,
            'Monto Total': orden.monto_total,
            'Estado': orden.estado_compra,
            'Fecha Estimada': new Date(orden.fecha_estimada_entrega).toLocaleDateString('es-AR'),
            'Lugar Retiro': orden.lugar_retiro,
            'Medicamentos': orden.total_medicamentos
        }));

        // Crear workbook y worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(datosExcel);

        // Agregar worksheet al workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Órdenes de Compra');

        // Descargar archivo
        XLSX.writeFile(wb, `reporte-compras-${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error('Error exportando a Excel:', error);
        alert('Error al exportar el reporte');
    }
};
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Instalar axios: `npm install axios`
- [ ] Instalar react-chartjs-2: `npm install react-chartjs-2 chart.js`
- [ ] Instalar xlsx para exports: `npm install xlsx`
- [ ] Configurar baseURL de axios
- [ ] Implementar interceptor para token JWT
- [ ] Crear componentes de reportes
- [ ] Agregar estilos CSS
- [ ] Implementar filtros y paginación
- [ ] Agregar función de exportar a Excel
- [ ] Probar todos los endpoints
- [ ] Manejar errores y estados de carga

---

## 📞 SOPORTE

Para dudas o problemas con la implementación, contactar al equipo de desarrollo.

**Fecha:** 2025-10-22
**Versión API:** 1.0.0
