# Módulo de Compras y Presupuestos - Documentación Completa

## 📋 Descripción General

Sistema completo para gestionar el proceso de compras desde la solicitud de presupuestos hasta la entrega de medicamentos y notificación a pacientes.

## 🗂️ Estructura del Módulo

```
cpce-auditoria-api-dev/
├── sql/
│   ├── check_compras_setup.sql          ✅ CREADO - Script de verificación
│   └── create_compras_tables.sql        ✅ CREADO - Script de creación de tablas
│
├── controllers/
│   ├── presupuestosController.js        📝 A CREAR
│   ├── ordenesCompraController.js       📝 A CREAR
│   ├── notificacionesController.js      📝 A CREAR
│   └── reportesComprasController.js     📝 A CREAR
│
├── routes/
│   ├── presupuestos.js                  📝 A CREAR
│   ├── ordenesCompra.js                 📝 A CREAR
│   ├── notificaciones.js                📝 A CREAR
│   └── reportesCompras.js               📝 A CREAR
│
└── services/
    ├── emailService.js                   📝 A CREAR (opcional)
    └── smsService.js                     📝 A CREAR (opcional)
```

## 🗄️ Estructura de Base de Datos

### Tablas Principales (8 tablas)

1. **alt_solicitud_presupuesto** - Solicitudes de presupuesto
2. **alt_solicitud_presupuesto_auditoria** - Relación solicitud-auditoría
3. **alt_solicitud_presupuesto_proveedor** - Relación solicitud-proveedor
4. **alt_presupuesto_respuesta** - Respuestas de proveedores
5. **alt_orden_compra** - Órdenes de compra
6. **alt_orden_compra_detalle** - Detalle de medicamentos por orden
7. **alt_orden_compra_historial** - Historial de cambios
8. **alt_notificacion_paciente** - Notificaciones a pacientes

## 🔄 Flujo del Proceso

```
1. Auditoría Aprobada (Alto Costo)
   └─> Genera autorización para medicación
           ↓
2. Solicitar Presupuestos (Compras)
   └─> Seleccionar auditorías + proveedores
   └─> Envío masivo de solicitudes
           ↓
3. Seguimiento de Presupuestos
   └─> Monitoreo de respuestas
   └─> Comparación de precios
   └─> Adjudicación al mejor proveedor
           ↓
4. Gestión de Órdenes de Compra
   └─> Creación automática de orden
   └─> Envío al proveedor
   └─> Confirmación y preparación
   └─> Seguimiento de envío (tracking)
   └─> Confirmación de entrega
   └─> 🔔 NOTIFICACIÓN AUTOMÁTICA AL PACIENTE
           ↓
5. Reportes y Análisis
   └─> Estadísticas de compras
   └─> Ranking de proveedores
   └─> Análisis de cumplimiento
   └─> Exportación a Excel
```

## 📡 API Endpoints

### 1. Presupuestos (`/api/presupuestos`)

#### Solicitar Presupuestos
```http
POST /api/presupuestos/solicitar
Content-Type: application/json
Authorization: Bearer {token}

{
  "auditorias": ["AC-2024-001", "AC-2024-002"],
  "proveedores": [1, 2, 3],
  "fechaLimite": "2025-01-18T00:00:00Z",
  "urgencia": "ALTA",
  "observaciones": "Tratamiento oncológico urgente"
}

Response 201:
{
  "success": true,
  "solicitudId": "SOL-2025-001",
  "codigo": "SOL-2025-001",
  "cantidadAuditorias": 2,
  "cantidadProveedores": 3,
  "montoTotalEstimado": 750000,
  "fechaEnvio": "2025-01-15T10:30:00Z"
}
```

#### Listar Solicitudes
```http
GET /api/presupuestos/solicitudes?estado=TODOS&page=1&limit=10

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "SOL-2025-001",
      "fechaEnvio": "2025-01-15T10:30:00Z",
      "estado": "PARCIAL",
      "urgencia": "ALTA",
      "auditorias": ["AC-2024-001"],
      "cantidadProveedores": 3,
      "montoTotal": 750000,
      "proveedores": [...]
    }
  ],
  "page": 1,
  "totalPages": 3,
  "total": 25
}
```

#### Adjudicar Presupuesto
```http
POST /api/presupuestos/{solicitudId}/adjudicar
Content-Type: application/json

{
  "proveedorId": 1,
  "idRespuesta": 5,
  "motivo": "Mejor precio y tiempo de entrega"
}

Response 200:
{
  "success": true,
  "message": "Presupuesto adjudicado exitosamente",
  "ordenCompraId": "OC-2025-001",
  "ordenCreada": true
}
```

#### Estadísticas de Solicitudes
```http
GET /api/presupuestos/estadisticas

Response 200:
{
  "success": true,
  "data": {
    "totalSolicitudes": 45,
    "enviadas": 12,
    "parciales": 8,
    "completas": 18,
    "adjudicadas": 7,
    "montoTotalGestion": 12500000,
    "tiempoPromedioRespuesta": 28.5
  }
}
```

### 2. Órdenes de Compra (`/api/ordenes-compra`)

#### Listar Órdenes
```http
GET /api/ordenes-compra?estado=TODAS&page=1&limit=10

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "OC-2025-001",
      "numeroOrden": "OC-2025-001",
      "estado": "ENVIADO",
      "proveedor": {
        "nombre": "FARMACORP S.A.",
        "contacto": {...}
      },
      "fechaCreacion": "2025-01-16",
      "fechaEntregaEstimada": "2025-01-18",
      "total": 720000,
      "cantidadPacientes": 1,
      "notificacionEnviada": false,
      "tracking": {
        "numero": "TRK-001-2025",
        "empresa": "Logística Médica SA",
        "estado": "En tránsito"
      }
    }
  ]
}
```

#### Obtener Orden por ID
```http
GET /api/ordenes-compra/{id}

Response 200:
{
  "success": true,
  "data": {
    "orden": {...},
    "detalles": [...],
    "historial": [...],
    "proveedor": {...}
  }
}
```

#### Confirmar Entrega y Notificar Paciente
```http
PUT /api/ordenes-compra/{id}/confirmar-entrega
Content-Type: application/json

{
  "fechaEntregaReal": "2025-01-18T13:45:00Z",
  "notificarPaciente": true,
  "observaciones": "Entregado en CPCE Sede Central"
}

Response 200:
{
  "success": true,
  "message": "Entrega confirmada y pacientes notificados",
  "orden": {...},
  "notificacionesEnviadas": [
    {
      "paciente": "María Elena González",
      "email": {
        "enviado": true,
        "fecha": "2025-01-18T13:45:10Z"
      },
      "sms": {
        "enviado": true,
        "fecha": "2025-01-18T13:45:15Z"
      }
    }
  ]
}
```

#### Cambiar Estado de Orden
```http
PUT /api/ordenes-compra/{id}/cambiar-estado
Content-Type: application/json

{
  "nuevoEstado": "CONFIRMADA",
  "observaciones": "Proveedor confirmó orden, en preparación"
}

Response 200:
{
  "success": true,
  "message": "Estado actualizado exitosamente",
  "estadoAnterior": "ENVIADA",
  "estadoNuevo": "CONFIRMADA"
}
```

#### Actualizar Tracking
```http
PUT /api/ordenes-compra/{id}/tracking
Content-Type: application/json

{
  "trackingNumero": "TRK-001-2025",
  "trackingEmpresa": "Logística Médica SA",
  "trackingEstado": "En tránsito",
  "trackingUrl": "https://tracking.com/TRK-001-2025"
}
```

#### Cancelar Orden
```http
DELETE /api/ordenes-compra/{id}
Content-Type: application/json

{
  "motivo": "Proveedor sin stock disponible"
}

Response 200:
{
  "success": true,
  "message": "Orden cancelada exitosamente"
}
```

#### Estadísticas de Órdenes
```http
GET /api/ordenes-compra/estadisticas

Response 200:
{
  "success": true,
  "data": {
    "borradores": 2,
    "enviadas": 5,
    "confirmadas": 8,
    "enPreparacion": 3,
    "enviados": 4,
    "entregados": 18,
    "canceladas": 1,
    "pacientesNotificados": 15
  }
}
```

### 3. Notificaciones (`/api/notificaciones`)

#### Notificar Paciente
```http
POST /api/notificaciones/paciente
Content-Type: application/json

{
  "ordenId": "OC-2025-001",
  "pacientes": [
    {
      "nombre": "María Elena González",
      "dni": "32456789",
      "telefono": "351-1234567",
      "email": "maria.gonzalez@email.com"
    }
  ],
  "tipo": "MEDICAMENTOS_DISPONIBLES",
  "canal": "EMAIL_SMS",
  "urgencia": "ALTA",
  "datosOrden": {
    "numero": "OC-2025-001",
    "proveedor": "FARMACORP S.A.",
    "fechaEntrega": "2025-01-18T13:45:00Z",
    "tracking": "TRK-001-2025"
  },
  "medicamentos": [
    {
      "nombre": "KEYTRUDA 100MG",
      "cantidad": 6
    }
  ]
}

Response 200:
{
  "success": true,
  "notificaciones": [
    {
      "paciente": "María Elena González",
      "dni": "32456789",
      "email": {
        "enviado": true,
        "fecha": "2025-01-18T13:45:10Z",
        "destinatario": "maria.gonzalez@email.com"
      },
      "sms": {
        "enviado": true,
        "fecha": "2025-01-18T13:45:15Z",
        "destinatario": "351-1234567"
      }
    }
  ],
  "totalEnviados": 1,
  "errores": []
}
```

#### Reenviar Notificación
```http
POST /api/notificaciones/{id}/reenviar
Content-Type: application/json

{
  "canal": "EMAIL_SMS"
}
```

#### Historial de Notificaciones
```http
GET /api/notificaciones/orden/{ordenId}

Response 200:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tipo": "MEDICAMENTOS_DISPONIBLES",
      "paciente": {...},
      "emailEnviado": true,
      "smsEnviado": true,
      "fechaCreacion": "2025-01-18T13:45:00Z"
    }
  ]
}
```

### 4. Reportes de Compras (`/api/reportes-compras`)

#### Obtener Reporte Completo
```http
GET /api/reportes-compras?fechaDesde=2024-10-01&fechaHasta=2025-01-31&proveedor=TODOS&estado=TODOS

Response 200:
{
  "success": true,
  "resumenGeneral": {
    "totalOrdenes": 24,
    "montoTotal": 8750000,
    "ordenesEntregadas": 18,
    "ordenesPendientes": 4,
    "ordenesVencidas": 2,
    "proveedoresActivos": 6,
    "tiempoPromedioEntrega": 2.3,
    "ahorroPorNegociacion": 425000
  },
  "distribucionEstados": [
    {
      "estado": "ENTREGADO",
      "cantidad": 18,
      "porcentaje": 75,
      "montoTotal": 6562500
    }
  ],
  "topProveedores": [
    {
      "id": 1,
      "nombre": "FARMACORP S.A.",
      "cantidadOrdenes": 8,
      "montoTotal": 2340000,
      "tiempoPromedioEntrega": 1.8,
      "cumplimiento": 95,
      "ahorro": 125000
    }
  ],
  "topMedicamentos": [
    {
      "nombre": "KEYTRUDA 100MG",
      "categoria": "Inmunoterapia Oncológica",
      "cantidadOrdenes": 12,
      "unidadesTotales": 72,
      "montoTotal": 2940000
    }
  ],
  "evolucionMensual": [
    {
      "mes": "2024-10",
      "cantidadOrdenes": 5,
      "montoTotal": 1625000,
      "tiempoPromedioEntrega": 2.5
    }
  ],
  "analisisCumplimiento": {
    "entregas_en_tiempo": 85,
    "entregas_tardias": 12,
    "no_entregado": 3,
    "tiempo_promedio_dias": 2.3,
    "meta_dias": 3
  },
  "alertas": [
    {
      "tipo": "RETRASO",
      "prioridad": "ALTA",
      "mensaje": "2 órdenes con retraso mayor a 5 días"
    }
  ]
}
```

#### Exportar a Excel
```http
POST /api/reportes-compras/exportar-excel
Content-Type: application/json

{
  "fechaDesde": "2024-10-01",
  "fechaHasta": "2025-01-31",
  "proveedor": "TODOS",
  "estado": "TODOS"
}

Response 200:
{
  "success": true,
  "urlDescarga": "https://api.cpce.com/files/reporte_compras_2025-01-31.xlsx",
  "nombreArchivo": "reporte_compras_2025-01-31.xlsx"
}
```

## 🔧 Instalación

### 1. Verificar Tablas Existentes

```bash
mysql -u usuario -p nombre_bd < sql/check_compras_setup.sql
```

### 2. Crear Tablas (si no existen)

```bash
mysql -u usuario -p nombre_bd < sql/create_compras_tables.sql
```

### 3. Configurar Variables de Entorno

Agregar al archivo `.env`:

```env
# Notificaciones
EMAIL_SERVICE=smtp.gmail.com
EMAIL_USER=notificaciones@cpce.com
EMAIL_PASSWORD=tu_password
EMAIL_FROM=CPCE Salud <notificaciones@cpce.com>

SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=tu_account_sid
SMS_AUTH_TOKEN=tu_auth_token
SMS_FROM=+5493511234567
```

## 🎯 Funcionalidades Clave

### ✅ Solicitud Masiva
- Seleccionar múltiples auditorías
- Enviar a múltiples proveedores simultáneamente
- Establecer fecha límite y urgencia

### ✅ Seguimiento en Tiempo Real
- Dashboard con estadísticas
- Estado por proveedor
- Comparación de presupuestos
- Adjudicación rápida

### ✅ Gestión de Órdenes
- Creación automática desde adjudicación
- Estados: BORRADOR → ENVIADA → CONFIRMADA → EN_PREPARACION → ENVIADO → ENTREGADO
- Tracking de logística
- Historial completo de cambios

### 🔔 Notificación Automática (FUNCIONALIDAD ESTRELLA)
- Al confirmar entrega en CPCE
- Envío simultáneo de Email y SMS
- Datos incluidos:
  - Medicamentos disponibles
  - Número de orden
  - Proveedor
  - Fecha de entrega
  - Tracking
- Registro completo de notificaciones
- Reenvío manual si falla

### 📊 Reportes y Análisis
- Estadísticas generales
- Ranking de proveedores
- Medicamentos más solicitados
- Análisis de cumplimiento
- Evolución temporal
- Exportación a Excel

## 🔐 Permisos

Roles con acceso al módulo:
- **Rol 3**: Compras
- **Rol 5**: Administrativo

## 📝 Notas Importantes

1. **Orden de Creación de Tablas**: Las tablas tienen dependencias (FK), seguir el orden del script
2. **Triggers**: Se crean automáticamente para actualizar estados
3. **Vistas**: Facilitan consultas complejas
4. **Notificaciones**: Requiere configuración de SMTP y SMS
5. **Historial**: Todos los cambios quedan registrados
6. **Auditorías**: Vincular correctamente con tabla de auditorías existente

## 🚀 Próximos Pasos

1. ✅ Verificar estructura de base de datos
2. ✅ Crear tablas necesarias
3. 📝 Implementar controladores
4. 📝 Crear rutas
5. 📝 Registrar en server.js
6. 📝 Configurar servicios de Email/SMS
7. 🧪 Testing completo
8. 📱 Integración con frontend

## 📞 Soporte

Para cualquier duda sobre la implementación, consultar:
- [create_compras_tables.sql](sql/create_compras_tables.sql) - Estructura de base de datos
- [check_compras_setup.sql](sql/check_compras_setup.sql) - Verificación de tablas
