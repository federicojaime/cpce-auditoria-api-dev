# 📊 DOCUMENTACIÓN: Nuevos Reportes Avanzados - Guía Frontend

## Fecha: 2025-10-23

---

## 🎯 DESCRIPCIÓN GENERAL

Esta documentación cubre **3 nuevos endpoints de reportes avanzados**:

1. **📊 Dashboard Ejecutivo** - Vista general con KPIs y evolución
2. **📦 Análisis de Logística** - Tiempos de entrega, puntos de retiro, cumplimiento
3. **💰 Proyección de Costos** - Tendencias y predicciones de gastos

**URL Base:** `http://localhost:3000/api/reportes`

**Autenticación:** Actualmente SIN autenticación (temporal para testing)

---

## 1. DASHBOARD EJECUTIVO

### `GET /api/reportes/dashboard-ejecutivo`

Dashboard completo con métricas clave, evolución mensual, top proveedores y distribución por estados.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaInicio` | Date (YYYY-MM-DD) | No | Fecha inicial del rango |
| `fechaFin` | Date (YYYY-MM-DD) | No | Fecha final del rango |

### Ejemplo de Llamada

```javascript
import axios from 'axios';

const obtenerDashboard = async () => {
    const response = await axios.get('/api/reportes/dashboard-ejecutivo', {
        params: {
            fechaInicio: '2025-10-01',
            fechaFin: '2025-10-23'
        }
    });
    return response.data;
};
```

### Response (200 OK)

```json
{
  "kpis": {
    "total_ordenes": 23,
    "monto_total": 1477547.00,
    "ticket_promedio": 64241.17,
    "proveedores_activos": 3,
    "pacientes_atendidos": 4
  },
  "evolucionMensual": [
    {
      "mes": "2025-10",
      "mes_nombre": "Oct 2025",
      "cantidad_ordenes": 23,
      "monto_total": 1477547.00,
      "ticket_promedio": 64241.17
    }
  ],
  "topProveedores": [
    {
      "id_proveedor": 3,
      "razon_social": "Droguería Alta Luna",
      "ordenes": 15,
      "monto_total": 1354424.00
    }
  ],
  "distribucionEstados": [
    {
      "estado_compra": "enviado_proveedores",
      "cantidad": 16,
      "porcentaje": 69.6
    },
    {
      "estado_compra": "pendiente_envio",
      "cantidad": 4,
      "porcentaje": 17.4
    }
  ]
}
```

### Componente React Completo

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const DashboardEjecutivo = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        fechaInicio: '2025-10-01',
        fechaFin: '2025-10-23'
    });

    useEffect(() => {
        cargarDashboard();
    }, [filtros]);

    const cargarDashboard = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/reportes/dashboard-ejecutivo', {
                params: filtros
            });
            setDashboard(response.data);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Cargando dashboard...</div>;
    if (!dashboard) return <div className="error">Error cargando datos</div>;

    const { kpis, evolucionMensual, topProveedores, distribucionEstados } = dashboard;

    // Configuración del gráfico de evolución
    const evolucionChartData = {
        labels: evolucionMensual.map(m => m.mes_nombre),
        datasets: [
            {
                label: 'Órdenes',
                data: evolucionMensual.map(m => m.cantidad_ordenes),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                yAxisID: 'y',
            },
            {
                label: 'Monto ($)',
                data: evolucionMensual.map(m => m.monto_total),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                yAxisID: 'y1',
            }
        ]
    };

    const evolucionOptions = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Cantidad de Órdenes'
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Monto Total ($)'
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    // Configuración del gráfico de distribución
    const distribucionChartData = {
        labels: distribucionEstados.map(e => e.estado_compra.replace('_', ' ').toUpperCase()),
        datasets: [{
            data: distribucionEstados.map(e => e.cantidad),
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
            ],
        }]
    };

    // Configuración del gráfico de proveedores
    const proveedoresChartData = {
        labels: topProveedores.map(p => p.razon_social),
        datasets: [{
            label: 'Monto Total ($)',
            data: topProveedores.map(p => p.monto_total),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
        }]
    };

    return (
        <div className="dashboard-ejecutivo">
            <div className="dashboard-header">
                <h1>📊 Dashboard Ejecutivo</h1>
                <div className="filtros">
                    <input
                        type="date"
                        value={filtros.fechaInicio}
                        onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                    />
                    <input
                        type="date"
                        value={filtros.fechaFin}
                        onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                    />
                    <button onClick={cargarDashboard}>Actualizar</button>
                </div>
            </div>

            {/* KPIs */}
            <div className="kpis-grid">
                <div className="kpi-card">
                    <div className="kpi-icon">📦</div>
                    <div className="kpi-content">
                        <h3>Total Órdenes</h3>
                        <p className="kpi-value">{kpis.total_ordenes}</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon">💰</div>
                    <div className="kpi-content">
                        <h3>Monto Total</h3>
                        <p className="kpi-value">${kpis.monto_total.toLocaleString('es-AR')}</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon">📊</div>
                    <div className="kpi-content">
                        <h3>Ticket Promedio</h3>
                        <p className="kpi-value">${kpis.ticket_promedio.toLocaleString('es-AR')}</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon">🏢</div>
                    <div className="kpi-content">
                        <h3>Proveedores</h3>
                        <p className="kpi-value">{kpis.proveedores_activos}</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon">👥</div>
                    <div className="kpi-content">
                        <h3>Pacientes</h3>
                        <p className="kpi-value">{kpis.pacientes_atendidos}</p>
                    </div>
                </div>
            </div>

            {/* Gráficos */}
            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Evolución Mensual</h3>
                    <Line data={evolucionChartData} options={evolucionOptions} />
                </div>

                <div className="chart-container">
                    <h3>Distribución por Estados</h3>
                    <Doughnut data={distribucionChartData} />
                </div>

                <div className="chart-container full-width">
                    <h3>Top 5 Proveedores</h3>
                    <Bar data={proveedoresChartData} />
                </div>
            </div>
        </div>
    );
};

export default DashboardEjecutivo;
```

### CSS Recomendado

```css
.dashboard-ejecutivo {
    padding: 20px;
    background: #f5f5f5;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.filtros {
    display: flex;
    gap: 10px;
}

.filtros input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.filtros button {
    padding: 8px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.filtros button:hover {
    background: #0056b3;
}

.kpis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.kpi-card {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 15px;
}

.kpi-icon {
    font-size: 40px;
}

.kpi-content h3 {
    margin: 0;
    font-size: 14px;
    color: #666;
    font-weight: 500;
}

.kpi-value {
    margin: 5px 0 0 0;
    font-size: 24px;
    font-weight: bold;
    color: #333;
}

.charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.chart-container {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-container.full-width {
    grid-column: 1 / -1;
}

.chart-container h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
}
```

---

## 2. ANÁLISIS DE LOGÍSTICA

### `GET /api/reportes/analisis-logistica`

Análisis detallado de aspectos logísticos: tiempos de entrega por proveedor, puntos de retiro, cumplimiento de fechas.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaInicio` | Date | No | Fecha inicial |
| `fechaFin` | Date | No | Fecha final |
| `proveedorId` | Integer | No | Filtrar por proveedor específico |

### Response (200 OK)

```json
{
  "tiemposProveedor": [
    {
      "proveedor": "Droguería Alta Luna",
      "total_entregas": 10,
      "dias_promedio": 7.5,
      "dias_minimo": 3,
      "dias_maximo": 15
    }
  ],
  "puntosRetiro": [
    {
      "punto_retiro": "Sucursal Centro",
      "cantidad": 15,
      "porcentaje": 65.2
    }
  ],
  "cumplimiento": {
    "total_con_fecha_estimada": 20,
    "entregadas_a_tiempo": 18,
    "entregadas_tarde": 2,
    "vencidas_pendientes": 0,
    "porcentaje_cumplimiento": 90.0
  }
}
```

### Componente React

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';

const AnalisisLogistica = () => {
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarAnalisis();
    }, []);

    const cargarAnalisis = async () => {
        try {
            const response = await axios.get('/api/reportes/analisis-logistica', {
                params: {
                    fechaInicio: '2025-10-01',
                    fechaFin: '2025-10-23'
                }
            });
            setDatos(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Cargando...</div>;
    if (!datos) return <div>Sin datos</div>;

    const { tiemposProveedor, puntosRetiro, cumplimiento } = datos;

    // Gráfico de tiempos por proveedor
    const tiemposChartData = {
        labels: tiemposProveedor.map(p => p.proveedor),
        datasets: [{
            label: 'Días Promedio de Entrega',
            data: tiemposProveedor.map(p => p.dias_promedio),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
        }]
    };

    // Gráfico de puntos de retiro
    const puntosChartData = {
        labels: puntosRetiro.map(p => p.punto_retiro),
        datasets: [{
            data: puntosRetiro.map(p => p.cantidad),
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
            ],
        }]
    };

    return (
        <div className="analisis-logistica">
            <h1>📦 Análisis de Logística</h1>

            {/* Indicador de Cumplimiento */}
            <div className="cumplimiento-card">
                <h3>Cumplimiento de Fechas</h3>
                <div className="cumplimiento-gauge">
                    <div className="gauge-value" style={{
                        background: `conic-gradient(
                            #28a745 0% ${cumplimiento.porcentaje_cumplimiento}%,
                            #e9ecef ${cumplimiento.porcentaje_cumplimiento}% 100%
                        )`
                    }}>
                        <span className="porcentaje">{cumplimiento.porcentaje_cumplimiento}%</span>
                    </div>
                </div>
                <div className="cumplimiento-detalles">
                    <p>✅ A tiempo: {cumplimiento.entregadas_a_tiempo}</p>
                    <p>⏰ Tarde: {cumplimiento.entregadas_tarde}</p>
                    <p>❌ Vencidas: {cumplimiento.vencidas_pendientes}</p>
                </div>
            </div>

            {/* Gráficos */}
            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Tiempos de Entrega por Proveedor</h3>
                    <Bar data={tiemposChartData} />
                </div>

                <div className="chart-container">
                    <h3>Distribución de Puntos de Retiro</h3>
                    <Pie data={puntosChartData} />
                </div>
            </div>

            {/* Tabla de detalles */}
            <div className="tabla-container">
                <h3>Detalle por Proveedor</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Proveedor</th>
                            <th>Entregas</th>
                            <th>Promedio</th>
                            <th>Mínimo</th>
                            <th>Máximo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tiemposProveedor.map((proveedor, index) => (
                            <tr key={index}>
                                <td>{proveedor.proveedor}</td>
                                <td>{proveedor.total_entregas}</td>
                                <td>{proveedor.dias_promedio} días</td>
                                <td>{proveedor.dias_minimo} días</td>
                                <td>{proveedor.dias_maximo} días</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnalisisLogistica;
```

---

## 3. PROYECCIÓN DE COSTOS

### `GET /api/reportes/proyeccion-costos`

Análisis de evolución de costos y proyección futura basada en tendencias.

### Response (200 OK)

```json
{
  "evolucionCostos": [
    {
      "mes": "2025-10",
      "mes_nombre": "Oct 2025",
      "ordenes": 23,
      "costo_total": 1477547.00,
      "costo_promedio": 64241.17,
      "costo_minimo": 0.00,
      "costo_maximo": 1231112.00
    }
  ],
  "proyeccionProximoMes": {
    "ordenes_estimadas": 23,
    "costo_estimado": 1477547.00,
    "tendencia": "CRECIENTE"
  },
  "costosPorProveedor": [
    {
      "proveedor": "Droguería Alta Luna",
      "ordenes": 15,
      "costo_total": 1354424.00,
      "costo_promedio": 90294.93,
      "porcentaje_del_total": 91.7
    }
  ]
}
```

### Componente React

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';

const ProyeccionCostos = () => {
    const [proyeccion, setProyeccion] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarProyeccion();
    }, []);

    const cargarProyeccion = async () => {
        try {
            const response = await axios.get('/api/reportes/proyeccion-costos', {
                params: {
                    fechaInicio: '2025-08-01',
                    fechaFin: '2025-10-23'
                }
            });
            setProyeccion(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Cargando...</div>;
    if (!proyeccion) return <div>Sin datos</div>;

    const { evolucionCostos, proyeccionProximoMes, costosPorProveedor } = proyeccion;

    // Gráfico de evolución
    const evolucionChartData = {
        labels: evolucionCostos.map(m => m.mes_nombre),
        datasets: [{
            label: 'Costo Total',
            data: evolucionCostos.map(m => m.costo_total),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
        }]
    };

    // Gráfico de costos por proveedor
    const proveedoresChartData = {
        labels: costosPorProveedor.map(p => p.proveedor),
        datasets: [{
            label: 'Costo Total ($)',
            data: costosPorProveedor.map(p => p.costo_total),
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
        }]
    };

    return (
        <div className="proyeccion-costos">
            <h1>💰 Proyección de Costos</h1>

            {/* Proyección para próximo mes */}
            {proyeccionProximoMes && (
                <div className="proyeccion-card">
                    <h3>Estimación Próximo Mes</h3>
                    <div className="proyeccion-content">
                        <div className="proyeccion-item">
                            <span className="label">Órdenes Estimadas:</span>
                            <span className="value">{proyeccionProximoMes.ordenes_estimadas}</span>
                        </div>
                        <div className="proyeccion-item">
                            <span className="label">Costo Estimado:</span>
                            <span className="value">${proyeccionProximoMes.costo_estimado.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="proyeccion-item">
                            <span className="label">Tendencia:</span>
                            <span className={`badge ${proyeccionProximoMes.tendencia === 'CRECIENTE' ? 'warning' : 'success'}`}>
                                {proyeccionProximoMes.tendencia}
                                {proyeccionProximoMes.tendencia === 'CRECIENTE' ? ' 📈' : ' 📉'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Gráficos */}
            <div className="charts-grid">
                <div className="chart-container full-width">
                    <h3>Evolución de Costos</h3>
                    <Line data={evolucionChartData} />
                </div>

                <div className="chart-container full-width">
                    <h3>Distribución de Costos por Proveedor</h3>
                    <Bar data={proveedoresChartData} />
                </div>
            </div>

            {/* Tabla de proveedores */}
            <div className="tabla-container">
                <h3>Detalle por Proveedor</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Proveedor</th>
                            <th>Órdenes</th>
                            <th>Costo Total</th>
                            <th>Costo Promedio</th>
                            <th>% del Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {costosPorProveedor.map((proveedor, index) => (
                            <tr key={index}>
                                <td>{proveedor.proveedor}</td>
                                <td>{proveedor.ordenes}</td>
                                <td>${proveedor.costo_total.toLocaleString('es-AR')}</td>
                                <td>${proveedor.costo_promedio.toLocaleString('es-AR')}</td>
                                <td>{proveedor.porcentaje_del_total}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProyeccionCostos;
```

---

## 📦 INSTALACIÓN DE DEPENDENCIAS

```bash
npm install chart.js react-chartjs-2
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Instalar `chart.js` y `react-chartjs-2`
- [ ] Crear componente `DashboardEjecutivo.jsx`
- [ ] Crear componente `AnalisisLogistica.jsx`
- [ ] Crear componente `ProyeccionCostos.jsx`
- [ ] Agregar CSS personalizado
- [ ] Agregar rutas en el router de React
- [ ] Probar cada endpoint individualmente
- [ ] Verificar que los gráficos se rendericen correctamente
- [ ] Implementar manejo de errores
- [ ] Agregar estados de carga

---

## 🎨 PALETA DE COLORES RECOMENDADA

```css
:root {
    --color-primary: #007bff;
    --color-success: #28a745;
    --color-warning: #ffc107;
    --color-danger: #dc3545;
    --color-info: #17a2b8;
    --color-bg: #f5f5f5;
    --color-card: #ffffff;
}
```

---

## 📞 SOPORTE

Para dudas o problemas con la implementación, verificar:

1. Que el servidor backend esté corriendo en puerto 3000
2. Que las rutas estén correctamente configuradas
3. Que los datos existan en la base de datos
4. Que las dependencias estén instaladas

**Fecha de creación:** 2025-10-23
**Versión:** 1.0.0
