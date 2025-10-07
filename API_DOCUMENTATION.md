# 📚 Documentación API - Sistema de Auditoría CPCE

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante JWT, excepto login y registro.

**Header requerido:**
```
Authorization: Bearer <token>
```

---

## 📋 MÓDULO DE AUDITORÍAS

### Listar auditorías pendientes (Alto Costo)
```http
GET /api/auditorias/pendientes
Authorization: Bearer <token>
```

**Query params opcionales:**
- `search`: búsqueda por apellido, nombre, DNI o médico
- `page`: número de página (default: 1)
- `limit`: registros por página (default: 10)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "apellido": "Rodriguez",
      "nombre": "Carlos",
      "dni": "12345678",
      "fecha": "15-10-2025",
      "medico": "Dr. Juan Pérez MP-12345",
      "renglones": 3,
      "meses": 6,
      "auditado": null
    }
  ],
  "total": 45,
  "page": 1,
  "totalPages": 5,
  "limit": 10
}
```

**Notas:**
- Solo muestra auditorías con `auditado = NULL` (pendientes)
- Filtro automático: `renglones > 0` (Alto Costo)
- Si el usuario tiene rol 9 (médico auditor), solo ve las bloqueadas para él

---

### Exportar Excel de auditorías (Alto Costo)
```http
GET /api/auditorias/excel?tipo=alto-costo
Authorization: Bearer <token>
```

**Query params opcionales:**
- `tipo`: `alto-costo` (pendientes con renglones > 0), `historicas` (auditadas)
- `fechaDesde`: fecha inicio (YYYY-MM-DD)
- `fechaHasta`: fecha fin (YYYY-MM-DD)
- `estado`: `pendiente`, `aprobada`, `rechazada`

**Respuesta:**
Descarga un archivo Excel (.xlsx) con las auditorías filtradas.

**Archivo generado:**
- `auditorias_alto-costo_2025-10-07.xlsx`
- Incluye: ID, Apellido, Nombre, DNI, Fecha Receta, Médico, Matrícula, Renglones, Meses, Estado, Auditor, Fecha Auditoría

**Ejemplos:**
```
GET /api/auditorias/excel?tipo=alto-costo
GET /api/auditorias/excel?tipo=historicas&fechaDesde=2025-01-01
GET /api/auditorias/excel?estado=aprobada&fechaDesde=2025-10-01&fechaHasta=2025-10-31
```

**💡 Uso típico para Alto Costo:**
```
GET /api/auditorias/excel?tipo=alto-costo
→ Descarga TODAS las auditorías pendientes con renglones > 0
```

---

### Exportar historial de paciente a Excel
```http
POST /api/auditorias/historial-paciente/excel
Authorization: Bearer <token>
Content-Type: application/json

{
  "dni": "12345678",
  "fechaDesde": "2025-01-01",
  "fechaHasta": "2025-12-31"
}
```

**Respuesta:**
Descarga un archivo Excel con el historial completo del paciente (todas sus auditorías y medicamentos).

**Contenido del Excel:**
- Información del paciente (DNI, nombre, edad)
- Tabla con todas las auditorías:
  - Fecha
  - Auditor
  - Médico
  - Medicamento (comercial)
  - Monodroga
  - Presentación
  - Cantidad prescripta
  - Posología
  - Cobertura
  - Estado

---

## 👤 MÓDULO DE AUTENTICACIÓN

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "usuario@ejemplo.com",
    "rol": "admin"
  },
  "trial": {
    "esPrueba": true,
    "diasRestantes": 15,
    "fechaExpiracion": "2025-10-22T00:00:00.000Z",
    "warning": "Tienes 15 días restantes en tu período de prueba"
  }
}
```

---

## ⏱️ MÓDULO DE PERÍODO DE PRUEBA

### Obtener información de mi prueba
```http
GET /api/trial/mi-info
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "esPrueba": true,
    "fechaInicio": "2025-10-07T00:00:00.000Z",
    "diasPrueba": 30,
    "diasRestantes": 15,
    "fechaExpiracion": "2025-11-06T00:00:00.000Z",
    "estadoCuenta": "prueba_activa",
    "ultimoAcceso": "2025-10-07T10:30:00.000Z"
  }
}
```

### Listar usuarios de prueba (Admin)
```http
GET /api/trial/usuarios
Authorization: Bearer <token>
```

**Query params opcionales:**
- `estado`: `prueba_activa`, `prueba_expirada`, `activa`
- `porExpirar`: `true` (usuarios con menos de 7 días)

### Asignar período de prueba (Admin)
```http
POST /api/trial/asignar
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 5,
  "diasPrueba": 30
}
```

### Extender período de prueba (Admin)
```http
PUT /api/trial/extender/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "diasAdicionales": 15
}
```

### Convertir a cuenta permanente (Admin)
```http
PUT /api/trial/convertir-permanente/:userId
Authorization: Bearer <token>
```

---

## 🏢 MÓDULO DE PROVEEDORES

### Listar proveedores
```http
GET /api/proveedores
Authorization: Bearer <token>
```

**Query params opcionales:**
- `tipo`: `Laboratorio`, `Droguería`, `Ambos`
- `activo`: `true`, `false`
- `search`: búsqueda por razón social o CUIT

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_proveedor": 1,
      "razon_social": "Laboratorio Ejemplo S.A.",
      "cuit": "30-12345678-9",
      "tipo_proveedor": "Laboratorio",
      "direccion": "Av. Corrientes 1234",
      "telefono": "011-4567-8900",
      "email": "ventas@laboratorio.com",
      "activo": true,
      "created_at": "2025-10-01T00:00:00.000Z"
    }
  ]
}
```

### Obtener proveedor por ID
```http
GET /api/proveedores/:id
Authorization: Bearer <token>
```

### Crear proveedor
```http
POST /api/proveedores
Authorization: Bearer <token>
Content-Type: application/json

{
  "razon_social": "Laboratorio Nuevo S.A.",
  "cuit": "30-98765432-1",
  "tipo_proveedor": "Laboratorio",
  "direccion": "Av. Rivadavia 5000",
  "telefono": "011-5555-1234",
  "email": "contacto@labonuevo.com",
  "sitio_web": "www.labonuevo.com",
  "activo": true
}
```

### Actualizar proveedor
```http
PUT /api/proveedores/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "razon_social": "Laboratorio Actualizado S.A.",
  "telefono": "011-6666-7777"
}
```

### Eliminar proveedor
```http
DELETE /api/proveedores/:id
Authorization: Bearer <token>
```

### Listar contactos de un proveedor
```http
GET /api/proveedores/:id/contactos
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_contacto": 1,
      "id_proveedor": 1,
      "nombre": "María González",
      "cargo": "Gerente de Ventas",
      "telefono": "011-4567-8901",
      "email": "mgonzalez@laboratorio.com",
      "es_principal": true,
      "activo": true
    }
  ]
}
```

### Crear contacto
```http
POST /api/proveedores/:id/contactos
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre": "Juan Martínez",
  "cargo": "Representante Comercial",
  "telefono": "011-5555-9999",
  "email": "jmartinez@laboratorio.com",
  "es_principal": false,
  "activo": true
}
```

### Actualizar contacto
```http
PUT /api/proveedores/:proveedorId/contactos/:contactoId
Authorization: Bearer <token>
Content-Type: application/json

{
  "telefono": "011-7777-8888",
  "cargo": "Gerente Regional"
}
```

### Eliminar contacto
```http
DELETE /api/proveedores/:proveedorId/contactos/:contactoId
Authorization: Bearer <token>
```

---

## 💰 MÓDULO DE PRESUPUESTOS

### Obtener auditorías disponibles para presupuesto
```http
GET /api/presupuestos/auditorias-disponibles
Authorization: Bearer <token>
```

**Query params opcionales:**
- `search`: búsqueda por apellido, nombre, DNI o médico
- `page`: número de página (default: 1)
- `limit`: registros por página (default: 20, máx: 100)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "apellido": "Rodriguez",
      "nombre": "Carlos",
      "dni": "12345678",
      "paciente_email": "carlos@email.com",
      "paciente_telefono": "011-9999-8888",
      "fecha": "15-10-2025",
      "medico": "Dr. Juan Pérez MP-12345",
      "renglones": 3,
      "meses": 6,
      "auditor": "María López",
      "medicamentos_aprobados": 5,
      "medicamentos": [
        {
          "id": 456,
          "nombreComercial": "Rituximab 500mg",
          "monodroga": "Rituximab",
          "presentacion": "Ampolla 500mg",
          "cantidad": 10,
          "observacion": ""
        }
      ]
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Notas:**
- Solo muestra auditorías con `auditado = 1` (aprobadas)
- Filtro automático: `renglones > 0` (Alto Costo)
- Incluye solo medicamentos con `estado_auditoria = 1` (aprobados)
- Incluye datos del paciente para notificaciones posteriores

---

### Solicitar presupuesto
```http
POST /api/presupuestos/solicitar
Authorization: Bearer <token>
Content-Type: application/json

{
  "descripcion": "Compra mensual de medicamentos oncológicos",
  "id_auditoria_asociada": 123,
  "proveedores": [1, 2, 3],
  "medicamentos": [
    {
      "nombre": "Rituximab 500mg",
      "cantidad": 10,
      "unidad": "ampolla"
    },
    {
      "nombre": "Trastuzumab 440mg",
      "cantidad": 5,
      "unidad": "ampolla"
    }
  ],
  "fecha_limite_respuesta": "2025-10-15",
  "observaciones": "Urgente - Necesario para tratamientos programados"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Solicitud de presupuesto creada exitosamente",
  "data": {
    "id_solicitud": 45,
    "numero_solicitud": "PRES-2025-045",
    "proveedores_notificados": 3,
    "fecha_creacion": "2025-10-07T10:30:00.000Z"
  }
}
```

### Listar solicitudes de presupuesto
```http
GET /api/presupuestos/solicitudes
Authorization: Bearer <token>
```

**Query params opcionales:**
- `estado`: `PENDIENTE`, `EN_REVISION`, `ADJUDICADO`, `CANCELADO`
- `desde`: fecha inicio (YYYY-MM-DD)
- `hasta`: fecha fin (YYYY-MM-DD)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_solicitud": 45,
      "numero_solicitud": "PRES-2025-045",
      "descripcion": "Compra mensual de medicamentos oncológicos",
      "estado": "PENDIENTE",
      "fecha_solicitud": "2025-10-07T10:30:00.000Z",
      "fecha_limite_respuesta": "2025-10-15T00:00:00.000Z",
      "total_proveedores": 3,
      "respuestas_recibidas": 2,
      "usuario_solicitante": "Juan Pérez"
    }
  ]
}
```

### Obtener detalle de solicitud
```http
GET /api/presupuestos/solicitudes/:id
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "solicitud": {
      "id_solicitud": 45,
      "numero_solicitud": "PRES-2025-045",
      "descripcion": "Compra mensual de medicamentos oncológicos",
      "estado": "EN_REVISION",
      "observaciones": "Urgente"
    },
    "medicamentos": [
      {
        "nombre": "Rituximab 500mg",
        "cantidad": 10,
        "unidad": "ampolla"
      }
    ],
    "proveedores": [
      {
        "id_proveedor": 1,
        "razon_social": "Laboratorio Ejemplo S.A.",
        "tiene_respuesta": true,
        "fecha_respuesta": "2025-10-08T15:00:00.000Z"
      }
    ],
    "respuestas": [
      {
        "id_respuesta": 10,
        "id_proveedor": 1,
        "razon_social": "Laboratorio Ejemplo S.A.",
        "monto_total": 150000.00,
        "tiempo_entrega_dias": 7,
        "observaciones": "Stock disponible",
        "adjudicado": false
      }
    ]
  }
}
```

### Registrar respuesta de proveedor
```http
POST /api/presupuestos/respuesta
Authorization: Bearer <token>
Content-Type: application/json

{
  "id_solicitud": 45,
  "id_proveedor": 1,
  "monto_total": 150000.00,
  "tiempo_entrega_dias": 7,
  "observaciones": "Stock disponible. Entrega en 7 días hábiles",
  "detalles_medicamentos": [
    {
      "nombre_medicamento": "Rituximab 500mg",
      "precio_unitario": 12000.00,
      "cantidad": 10,
      "subtotal": 120000.00
    },
    {
      "nombre_medicamento": "Trastuzumab 440mg",
      "precio_unitario": 6000.00,
      "cantidad": 5,
      "subtotal": 30000.00
    }
  ]
}
```

### Adjudicar presupuesto
```http
POST /api/presupuestos/:id/adjudicar
Authorization: Bearer <token>
Content-Type: application/json

{
  "id_respuesta": 10,
  "motivo_adjudicacion": "Mejor precio y tiempo de entrega"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Presupuesto adjudicado exitosamente",
  "data": {
    "id_orden": 78,
    "numero_orden": "OC-2025-078",
    "id_proveedor": 1,
    "razon_social": "Laboratorio Ejemplo S.A.",
    "monto_total": 150000.00,
    "estado": "PENDIENTE"
  }
}
```

---

## 📦 MÓDULO DE ÓRDENES DE COMPRA

### Listar órdenes de compra
```http
GET /api/ordenes-compra
Authorization: Bearer <token>
```

**Query params opcionales:**
- `estado`: `PENDIENTE`, `CONFIRMADO`, `EN_TRANSITO`, `ENTREGADO`, `CANCELADO`
- `proveedor`: ID del proveedor
- `desde`: fecha inicio
- `hasta`: fecha fin

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_orden": 78,
      "numero_orden": "OC-2025-078",
      "id_proveedor": 1,
      "razon_social": "Laboratorio Ejemplo S.A.",
      "monto_total": 150000.00,
      "estado": "PENDIENTE",
      "fecha_orden": "2025-10-07T16:00:00.000Z",
      "fecha_entrega_estimada": "2025-10-14T00:00:00.000Z",
      "total_medicamentos": 15
    }
  ]
}
```

### Obtener detalle de orden
```http
GET /api/ordenes-compra/:id
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "orden": {
      "id_orden": 78,
      "numero_orden": "OC-2025-078",
      "razon_social": "Laboratorio Ejemplo S.A.",
      "monto_total": 150000.00,
      "estado": "PENDIENTE",
      "fecha_orden": "2025-10-07T16:00:00.000Z"
    },
    "detalles": [
      {
        "id_detalle": 120,
        "medicamento_nombre": "Rituximab 500mg",
        "cantidad": 10,
        "precio_unitario": 12000.00,
        "subtotal": 120000.00,
        "paciente_nombre": "Carlos Rodríguez",
        "paciente_dni": "12345678",
        "paciente_email": "carlos@email.com",
        "paciente_telefono": "011-9999-8888",
        "id_auditoria": 123
      }
    ],
    "historial": [
      {
        "estado_anterior": null,
        "estado_nuevo": "PENDIENTE",
        "fecha_cambio": "2025-10-07T16:00:00.000Z",
        "usuario": "Juan Pérez",
        "observaciones": "Orden creada"
      }
    ]
  }
}
```

### Confirmar entrega de orden (🔥 TRIGGER DE NOTIFICACIONES)
```http
PUT /api/ordenes-compra/:id/confirmar-entrega
Authorization: Bearer <token>
Content-Type: application/json

{
  "fecha_entrega_real": "2025-10-14",
  "observaciones": "Entrega completa sin novedades",
  "recibido_por": "María López - Farmacia"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Entrega confirmada y pacientes notificados",
  "data": {
    "id_orden": 78,
    "estado": "ENTREGADO",
    "fecha_entrega_real": "2025-10-14T00:00:00.000Z",
    "notificaciones_enviadas": {
      "total": 3,
      "exitosas": 3,
      "fallidas": 0,
      "detalles": [
        {
          "paciente": "Carlos Rodríguez",
          "email": "carlos@email.com",
          "estado": "ENVIADO",
          "mensaje": "Email enviado exitosamente"
        }
      ]
    }
  }
}
```

### Cambiar estado de orden
```http
PUT /api/ordenes-compra/:id/cambiar-estado
Authorization: Bearer <token>
Content-Type: application/json

{
  "nuevo_estado": "EN_TRANSITO",
  "observaciones": "Despachado por transportadora XYZ - Tracking: 123456"
}
```

**Estados válidos:**
- `PENDIENTE`: Orden creada, esperando confirmación del proveedor
- `CONFIRMADO`: Proveedor confirmó la orden
- `EN_TRANSITO`: Medicamentos en camino
- `ENTREGADO`: Medicamentos recibidos (⚠️ **envía notificaciones automáticas**)
- `CANCELADO`: Orden cancelada

---

## 📧 MÓDULO DE NOTIFICACIONES

### Notificar pacientes manualmente
```http
POST /api/notificaciones/paciente
Authorization: Bearer <token>
Content-Type: application/json

{
  "ordenId": 78,
  "pacientes": [
    {
      "nombre": "Carlos Rodríguez",
      "email": "carlos@email.com",
      "telefono": "011-9999-8888",
      "medicamentos": ["Rituximab 500mg x10"]
    },
    {
      "nombre": "Ana Martínez",
      "email": "ana@email.com",
      "telefono": "011-8888-7777",
      "medicamentos": ["Trastuzumab 440mg x5"]
    }
  ],
  "medicamentos": [
    {
      "nombre": "Rituximab 500mg",
      "cantidad": 10
    },
    {
      "nombre": "Trastuzumab 440mg",
      "cantidad": 5
    }
  ],
  "datosOrden": {
    "numero": "OC-2025-078",
    "proveedor": "Laboratorio Ejemplo S.A.",
    "fechaEntrega": "2025-10-14"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Notificaciones procesadas",
  "data": {
    "total": 2,
    "exitosas": 2,
    "fallidas": 0,
    "resultados": [
      {
        "paciente": "Carlos Rodríguez",
        "email": "carlos@email.com",
        "estado": "ENVIADO",
        "fecha_envio": "2025-10-14T10:30:00.000Z",
        "mensaje": "Email enviado exitosamente"
      },
      {
        "paciente": "Ana Martínez",
        "email": "ana@email.com",
        "estado": "ENVIADO",
        "fecha_envio": "2025-10-14T10:30:05.000Z",
        "mensaje": "Email enviado exitosamente"
      }
    ]
  }
}
```

### Reenviar notificación
```http
POST /api/notificaciones/:id/reenviar
Authorization: Bearer <token>
```

### Historial de notificaciones de una orden
```http
GET /api/notificaciones/orden/:ordenId
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_notificacion": 50,
      "paciente_nombre": "Carlos Rodríguez",
      "paciente_email": "carlos@email.com",
      "tipo_notificacion": "EMAIL",
      "estado": "ENVIADO",
      "fecha_envio": "2025-10-14T10:30:00.000Z",
      "intentos": 1,
      "mensaje_error": null
    }
  ]
}
```

---

## 📊 MÓDULO DE REPORTES

### Obtener reporte completo
```http
GET /api/reportes-compras
Authorization: Bearer <token>
```

**Query params opcionales:**
- `desde`: fecha inicio (YYYY-MM-DD)
- `hasta`: fecha fin (YYYY-MM-DD)
- `proveedor`: ID del proveedor

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "resumen": {
      "total_ordenes": 45,
      "monto_total": 2500000.00,
      "ordenes_pendientes": 5,
      "ordenes_entregadas": 38,
      "ordenes_canceladas": 2,
      "promedio_tiempo_entrega_dias": 8.5
    },
    "por_proveedor": [
      {
        "id_proveedor": 1,
        "razon_social": "Laboratorio Ejemplo S.A.",
        "total_ordenes": 15,
        "monto_total": 850000.00,
        "ordenes_completadas": 14,
        "porcentaje_cumplimiento": 93.33,
        "promedio_tiempo_entrega": 7.2
      }
    ],
    "por_mes": [
      {
        "mes": "2025-10",
        "total_ordenes": 12,
        "monto_total": 650000.00
      }
    ],
    "medicamentos_mas_comprados": [
      {
        "medicamento": "Rituximab 500mg",
        "total_comprado": 250,
        "total_ordenes": 25,
        "monto_total": 3000000.00
      }
    ],
    "notificaciones": {
      "total_enviadas": 156,
      "exitosas": 152,
      "fallidas": 4,
      "tasa_exito": 97.44
    }
  }
}
```

### Exportar a Excel (placeholder)
```http
POST /api/reportes-compras/exportar-excel
Authorization: Bearer <token>
Content-Type: application/json

{
  "desde": "2025-01-01",
  "hasta": "2025-12-31",
  "proveedor": 1
}
```

---

## 📧 Configuración de Email

**Servicio:** Hostinger SMTP
**Host:** smtp.hostinger.com
**Puerto:** 587 (TLS)
**Usuario:** envios@codeo.site
**Remitente:** "CPCE Salud" <envios@codeo.site>

### Plantilla de Email de Notificación

Los pacientes reciben un email HTML profesional con:
- Logo y encabezado CPCE Salud
- Saludo personalizado con nombre del paciente
- Número de orden de compra
- Lista de medicamentos disponibles
- Información del proveedor
- Instrucciones para retiro
- Datos de contacto
- Footer con información legal

---

## 🔄 Flujo de Trabajo Completo

### Proceso de Compra con Notificaciones

1. **Solicitar Presupuesto**
   ```
   POST /api/presupuestos/solicitar
   → Crea solicitud y notifica a proveedores
   ```

2. **Proveedores Responden**
   ```
   POST /api/presupuestos/respuesta
   → Cada proveedor envía su cotización
   ```

3. **Adjudicar al Mejor Proveedor**
   ```
   POST /api/presupuestos/:id/adjudicar
   → Crea orden de compra automáticamente
   ```

4. **Seguimiento de la Orden**
   ```
   PUT /api/ordenes-compra/:id/cambiar-estado
   → Actualizar: CONFIRMADO → EN_TRANSITO
   ```

5. **Confirmar Entrega** (🔥 **TRIGGER AUTOMÁTICO DE NOTIFICACIONES**)
   ```
   PUT /api/ordenes-compra/:id/confirmar-entrega
   → Estado: ENTREGADO
   → Sistema busca todos los pacientes de la orden
   → Envía email a cada paciente automáticamente
   → Registra cada notificación en BD
   ```

6. **Pacientes Reciben Email**
   ```
   📧 "Sus medicamentos están disponibles para retiro"
   → Email HTML profesional con todos los detalles
   ```

### Notificación Manual (Opcional)

Si necesitas reenviar o enviar notificaciones fuera del flujo:
```
POST /api/notificaciones/paciente
→ Especificas manualmente pacientes y medicamentos
```

---

## ⚠️ Códigos de Error

### 400 - Bad Request
```json
{
  "error": true,
  "message": "Datos de entrada inválidos",
  "details": [
    {
      "field": "email",
      "message": "Email inválido"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "error": true,
  "message": "Token no proporcionado o inválido"
}
```

### 403 - Forbidden
```json
{
  "error": true,
  "message": "Tu período de prueba ha expirado",
  "expired": true
}
```

### 404 - Not Found
```json
{
  "error": true,
  "message": "Recurso no encontrado"
}
```

### 500 - Internal Server Error
```json
{
  "error": true,
  "message": "Error interno del servidor",
  "details": "Descripción técnica del error"
}
```

---

## 🧪 Testing con Postman/Thunder Client

### Collection Variables
```
base_url: http://localhost:3000
token: (se actualiza después del login)
```

### Orden de Testing Recomendado

1. **Login** → Guardar token
2. **Crear Proveedor** → Guardar ID
3. **Crear Contacto** → Asociar al proveedor
4. **Solicitar Presupuesto** → Guardar ID solicitud
5. **Registrar Respuesta** → Guardar ID respuesta
6. **Adjudicar** → Crea orden automáticamente
7. **Confirmar Entrega** → Trigger de notificaciones
8. **Ver Reportes** → Verificar estadísticas

---

## 📝 Notas Importantes

- **Autenticación obligatoria:** Todos los endpoints (excepto login) requieren token JWT
- **Período de prueba:** Se valida en cada request, puede bloquear acceso si expiró
- **Notificaciones automáticas:** Al confirmar entrega con estado `ENTREGADO`
- **Transacciones:** Operaciones críticas usan transacciones MySQL para consistencia
- **Logs:** Todas las notificaciones se registran en `alt_notificacion_paciente`
- **CORS:** Configurado para desarrollo local, ajustar para producción

---

## 🚀 Inicio Rápido para Frontend

### 1. Configurar Axios con interceptor
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 && error.response?.data?.expired) {
      // Período de prueba expirado
      alert('Tu período de prueba ha expirado');
      // Redirigir a página de suscripción
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Login y guardar token
```javascript
import api from './api';

async function login(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password });

    // Guardar token
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    // Verificar período de prueba
    if (response.data.trial) {
      const { diasRestantes, warning } = response.data.trial;
      if (diasRestantes <= 7) {
        alert(warning);
      }
    }

    return response.data;
  } catch (error) {
    console.error('Error en login:', error.response?.data);
    throw error;
  }
}
```

### 3. Confirmar entrega y notificar pacientes
```javascript
async function confirmarEntrega(ordenId, datos) {
  try {
    const response = await api.put(`/ordenes-compra/${ordenId}/confirmar-entrega`, {
      fecha_entrega_real: datos.fechaEntrega,
      observaciones: datos.observaciones,
      recibido_por: datos.recibidoPor
    });

    // Mostrar resumen de notificaciones
    const { notificaciones_enviadas } = response.data.data;
    alert(`Entrega confirmada. Emails enviados: ${notificaciones_enviadas.exitosas}/${notificaciones_enviadas.total}`);

    return response.data;
  } catch (error) {
    console.error('Error al confirmar entrega:', error);
    throw error;
  }
}
```

### 4. Solicitar presupuesto
```javascript
async function solicitarPresupuesto(datos) {
  try {
    const response = await api.post('/presupuestos/solicitar', {
      descripcion: datos.descripcion,
      id_auditoria_asociada: datos.auditoriaId,
      proveedores: datos.proveedoresIds, // [1, 2, 3]
      medicamentos: datos.medicamentos, // [{ nombre, cantidad, unidad }]
      fecha_limite_respuesta: datos.fechaLimite,
      observaciones: datos.observaciones
    });

    alert(`Presupuesto ${response.data.data.numero_solicitud} creado`);
    return response.data;
  } catch (error) {
    console.error('Error al solicitar presupuesto:', error);
    throw error;
  }
}
```

---

## 📞 Soporte

Para problemas o dudas sobre la API, contactar al equipo de desarrollo.

**Versión:** 1.0.0
**Última actualización:** Octubre 2025
