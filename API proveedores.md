# 🏥 API PROVEEDORES - DOCUMENTACIÓN COMPLETA v2.5
**Sistema de Auditorías CPCE - Módulo de Proveedores de Medicación de Alto Costo**

## 📋 ÍNDICE
1. [Introducción](#introducción)
2. [Base de Datos](#base-de-datos)
3. [Autenticación](#autenticación)
4. [CRUD Proveedores](#crud-proveedores)
5. [CRUD Contactos](#crud-contactos)
6. [Endpoints Auxiliares](#endpoints-auxiliares)
7. [Validaciones](#validaciones)
8. [Códigos de Error](#códigos-de-error)
9. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🌟 INTRODUCCIÓN

Este módulo gestiona proveedores de medicación de alto costo para el sistema CPCE. Incluye:
- **CRUD completo de proveedores** (Laboratorios, Droguerías, Ambos)
- **Gestión de contactos** por proveedor
- **Búsquedas y filtros avanzados**
- **Estadísticas y reportes**
- **Validaciones robustas**

**Base URL:** `http://localhost:3000/api/proveedores`

---

## 🗄️ BASE DE DATOS

### Tabla `alt_proveedor`
```sql
CREATE TABLE alt_proveedor (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    razon_social VARCHAR(255) NOT NULL,
    cuit VARCHAR(20) UNIQUE NOT NULL,
    tipo_proveedor ENUM('Laboratorio', 'Droguería', 'Ambos') DEFAULT 'Laboratorio',
    email_general VARCHAR(255),
    telefono_general VARCHAR(50),
    direccion_calle VARCHAR(100),
    direccion_numero VARCHAR(10),
    barrio VARCHAR(100),
    localidad VARCHAR(100),
    provincia VARCHAR(100),
    activo TINYINT(1) DEFAULT 1,
    fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabla `alt_contacto_proveedor`
```sql
CREATE TABLE alt_contacto_proveedor (
    id_contacto INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    cargo VARCHAR(100),
    email VARCHAR(255),
    telefono VARCHAR(50),
    principal TINYINT(1) DEFAULT 0,
    fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES alt_proveedor(id_proveedor) ON DELETE CASCADE
);
```

---

## 🔐 AUTENTICACIÓN

Todos los endpoints requieren autenticación JWT:

```http
Authorization: Bearer {jwt_token}
```

Obtener token en `/api/auth/login`

---

## 📊 CRUD PROVEEDORES

### 1. GET /api/proveedores
**Descripción:** Obtener lista de proveedores con paginación y filtros

**Query Parameters:**
| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `page` | Integer | No | 1 | Número de página |
| `limit` | Integer | No | 10 | Registros por página (max: 100) |
| `search` | String | No | - | Búsqueda en razón social, CUIT, email |
| `tipo` | String | No | todos | Laboratorio, Droguería, Ambos, todos |
| `activo` | Boolean | No | - | true/false para filtrar por estado |

**Ejemplo de Request:**
```http
GET /api/proveedores?page=1&limit=10&search=bagó&tipo=Laboratorio&activo=true
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "data": [
        {
            "id_proveedor": 1,
            "razon_social": "Laboratorios Bagó S.A.",
            "cuit": "30-12345678-9",
            "tipo_proveedor": "Laboratorio",
            "direccion": "Av. Córdoba 3900, CABA, Buenos Aires",
            "telefono_general": "011-4567-8900",
            "email_general": "contacto@bago.com.ar",
            "activo": true,
            "created_at": "2024-01-15T10:30:00.000Z",
            "updated_at": "2024-01-15T10:30:00.000Z",
            "total_contactos": 2
        }
    ],
    "page": 1,
    "totalPages": 3,
    "total": 25,
    "limit": 10
}
```

### 2. GET /api/proveedores/:id
**Descripción:** Obtener proveedor específico con todos sus contactos

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del proveedor |

**Ejemplo de Request:**
```http
GET /api/proveedores/1
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "data": {
        "id_proveedor": 1,
        "razon_social": "Laboratorios Bagó S.A.",
        "cuit": "30-12345678-9",
        "tipo_proveedor": "Laboratorio",
        "direccion_calle": "Av. Córdoba",
        "direccion_numero": "3900",
        "barrio": "Palermo",
        "localidad": "CABA",
        "provincia": "Buenos Aires",
        "telefono_general": "011-4567-8900",
        "email_general": "contacto@bago.com.ar",
        "activo": true,
        "created_at": "2024-01-15T10:30:00.000Z",
        "contactos": [
            {
                "id_contacto": 1,
                "nombre": "María",
                "apellido": "González",
                "cargo": "Gerente de Ventas",
                "email": "mgonzalez@bago.com.ar",
                "telefono": "011-4567-8901",
                "principal": true,
                "fecha_alta": "2024-01-15T10:30:00.000Z"
            }
        ]
    }
}
```

**Respuesta Error (404):**
```json
{
    "success": false,
    "message": "Proveedor no encontrado"
}
```

### 3. POST /api/proveedores
**Descripción:** Crear nuevo proveedor con contactos opcionales

**Body (JSON):**
```json
{
    "razon_social": "Laboratorio Nuevo S.A.",
    "cuit": "30-99999999-9",
    "tipo_proveedor": "Laboratorio",
    "email_general": "info@nuevo.com",
    "telefono_general": "011-1234-5678",
    "direccion_calle": "Av. Rivadavia",
    "direccion_numero": "1234",
    "barrio": "San Telmo",
    "localidad": "CABA",
    "provincia": "Buenos Aires",
    "contactos": [
        {
            "nombre": "Juan",
            "apellido": "Pérez",
            "cargo": "Director",
            "email": "jperez@nuevo.com",
            "telefono": "011-1234-5679",
            "principal": true
        }
    ]
}
```

**Campos Requeridos:**
- `razon_social` (String, max 255)
- `cuit` (String, formato XX-XXXXXXXX-X)

**Campos Opcionales:**
- `tipo_proveedor` (Enum: Laboratorio, Droguería, Ambos)
- `email_general` (Email válido)
- `telefono_general` (String, max 50)
- `direccion_calle` (String, max 100)
- `direccion_numero` (String, max 10)
- `barrio` (String, max 100)
- `localidad` (String, max 100)
- `provincia` (String, max 100)
- `contactos` (Array de objetos contacto)

**Respuesta Exitosa (201):**
```json
{
    "success": true,
    "message": "Proveedor creado exitosamente",
    "data": {
        "id_proveedor": 5
    }
}
```

**Respuesta Error (400):**
```json
{
    "success": false,
    "message": "Ya existe un proveedor con ese CUIT"
}
```

### 4. PUT /api/proveedores/:id
**Descripción:** Actualizar proveedor existente

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del proveedor |

**Body (JSON) - Todos los campos son opcionales:**
```json
{
    "razon_social": "Laboratorio Actualizado S.A.",
    "email_general": "nuevo@email.com",
    "telefono_general": "011-9999-8888",
    "activo": true,
    "localidad": "Nueva Localidad"
}
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "Proveedor actualizado exitosamente"
}
```

**Respuesta Error (404):**
```json
{
    "success": false,
    "message": "Proveedor no encontrado"
}
```

### 5. DELETE /api/proveedores/:id
**Descripción:** Desactivar proveedor (soft delete)

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del proveedor |

**Ejemplo de Request:**
```http
DELETE /api/proveedores/1
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "Proveedor desactivado exitosamente"
}
```

---

## 👥 CRUD CONTACTOS

### 1. GET /api/proveedores/:id/contactos
**Descripción:** Obtener todos los contactos de un proveedor

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del proveedor |

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "data": [
        {
            "id_contacto": 1,
            "id_proveedor": 1,
            "nombre": "María",
            "apellido": "González",
            "cargo": "Gerente de Ventas",
            "email": "mgonzalez@bago.com.ar",
            "telefono": "011-4567-8901",
            "principal": true,
            "fecha_alta": "2024-01-15T10:30:00.000Z",
            "razon_social": "Laboratorios Bagó S.A."
        }
    ]
}
```

### 2. POST /api/proveedores/:id/contactos
**Descripción:** Agregar nuevo contacto a un proveedor

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del proveedor |

**Body (JSON):**
```json
{
    "nombre": "Ana",
    "apellido": "Martínez",
    "cargo": "Directora Técnica",
    "email": "amartinez@proveedor.com",
    "telefono": "011-5555-6666",
    "principal": false
}
```

**Campos Requeridos:**
- `nombre` (String, max 100)
- `apellido` (String, max 100)

**Campos Opcionales:**
- `cargo` (String, max 100)
- `email` (Email válido)
- `telefono` (String, max 50)
- `principal` (Boolean, default: false)

**Respuesta Exitosa (201):**
```json
{
    "success": true,
    "message": "Contacto creado exitosamente",
    "data": {
        "id_contacto": 10
    }
}
```

### 3. PUT /api/proveedores/:id/contactos/:contactoId
**Descripción:** Actualizar contacto específico

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del proveedor |
| `contactoId` | Integer | Sí | ID del contacto |

**Body (JSON) - Todos los campos son opcionales:**
```json
{
    "nombre": "Ana María",
    "cargo": "Directora Comercial",
    "email": "anamaria@proveedor.com",
    "principal": true
}
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "Contacto actualizado exitosamente"
}
```

### 4. DELETE /api/proveedores/:id/contactos/:contactoId
**Descripción:** Eliminar contacto

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del proveedor |
| `contactoId` | Integer | Sí | ID del contacto |

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "Contacto eliminado exitosamente"
}
```

---

## 🔧 ENDPOINTS AUXILIARES

### 1. GET /api/proveedores/tipos
**Descripción:** Obtener tipos de proveedores disponibles

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "data": [
        { "value": "Laboratorio", "label": "Laboratorio" },
        { "value": "Droguería", "label": "Droguería" },
        { "value": "Ambos", "label": "Ambos" }
    ]
}
```

### 2. GET /api/proveedores/estadisticas
**Descripción:** Obtener estadísticas generales del sistema

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "data": {
        "total_proveedores": 25,
        "proveedores_activos": 22,
        "proveedores_inactivos": 3,
        "laboratorios": 15,
        "droguerias": 8,
        "ambos": 2,
        "total_contactos": 45
    }
}
```

### 3. GET /api/proveedores/buscar
**Descripción:** Búsqueda rápida para autocompletar

**Query Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | String | Sí | Término de búsqueda (min: 2 caracteres) |
| `limit` | Integer | No | Límite de resultados (default: 10, max: 50) |

**Ejemplo de Request:**
```http
GET /api/proveedores/buscar?q=bagó&limit=5
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "data": [
        {
            "id_proveedor": 1,
            "razon_social": "Laboratorios Bagó S.A.",
            "cuit": "30-12345678-9",
            "tipo_proveedor": "Laboratorio",
            "email_general": "contacto@bago.com.ar",
            "telefono_general": "011-4567-8900"
        }
    ]
}
```

---

## ✅ VALIDACIONES

### Validaciones de Proveedor
```javascript
{
    razon_social: {
        required: true,
        maxLength: 255,
        message: "La razón social es obligatoria (max 255 caracteres)"
    },
    cuit: {
        required: true,
        pattern: /^\d{2}-\d{8}-\d{1}$/,
        unique: true,
        message: "CUIT debe tener formato XX-XXXXXXXX-X y ser único"
    },
    tipo_proveedor: {
        enum: ["Laboratorio", "Droguería", "Ambos"],
        message: "Tipo debe ser: Laboratorio, Droguería o Ambos"
    },
    email_general: {
        format: "email",
        message: "Email debe tener formato válido"
    },
    telefono_general: {
        maxLength: 50,
        message: "Teléfono no puede exceder 50 caracteres"
    }
}
```

### Validaciones de Contacto
```javascript
{
    nombre: {
        required: true,
        maxLength: 100,
        message: "Nombre es obligatorio (max 100 caracteres)"
    },
    apellido: {
        required: true,
        maxLength: 100,
        message: "Apellido es obligatorio (max 100 caracteres)"
    },
    email: {
        format: "email",
        message: "Email debe tener formato válido"
    },
    principal: {
        type: "boolean",
        unique: "per_provider",
        message: "Solo puede haber un contacto principal por proveedor"
    }
}
```

---

## 📊 CÓDIGOS DE ERROR

| Código | Descripción | Casos de Uso |
|--------|-------------|--------------|
| **200** | OK | Operación exitosa |
| **201** | Created | Recurso creado exitosamente |
| **400** | Bad Request | Datos inválidos, CUIT duplicado, validaciones |
| **401** | Unauthorized | Token inválido o expirado |
| **404** | Not Found | Proveedor/contacto no encontrado |
| **500** | Internal Server Error | Error interno del servidor |

### Ejemplos de Errores

**Error de Validación (400):**
```json
{
    "success": false,
    "message": "Datos inválidos",
    "details": [
        {
            "field": "cuit",
            "message": "El CUIT debe tener el formato XX-XXXXXXXX-X"
        }
    ]
}
```

**Error de CUIT Duplicado (400):**
```json
{
    "success": false,
    "message": "Ya existe un proveedor con ese CUIT"
}
```

**Error de Autenticación (401):**
```json
{
    "error": true,
    "message": "Token inválido"
}
```

---

## 🎯 EJEMPLOS DE USO

### Flujo Completo: Crear Proveedor con Contactos
```bash
# 1. Login para obtener token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "usuario",
    "password": "password"
  }'

# 2. Crear proveedor completo
curl -X POST http://localhost:3000/api/proveedores \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "razon_social": "Laboratorio Innovación S.A.",
    "cuit": "30-77777777-7",
    "tipo_proveedor": "Laboratorio",
    "email_general": "contacto@innovacion.com",
    "telefono_general": "011-1234-5678",
    "direccion_calle": "Av. Corrientes",
    "direccion_numero": "1234",
    "localidad": "CABA",
    "provincia": "Buenos Aires",
    "contactos": [
      {
        "nombre": "Juan",
        "apellido": "Pérez",
        "cargo": "Director",
        "email": "jperez@innovacion.com",
        "principal": true
      }
    ]
  }'
```

### Flujo: Buscar y Actualizar Proveedor
```bash
# 1. Buscar proveedor
curl -X GET "http://localhost:3000/api/proveedores/buscar?q=innovación" \
  -H "Authorization: Bearer {token}"

# 2. Actualizar proveedor encontrado
curl -X PUT http://localhost:3000/api/proveedores/5 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "telefono_general": "011-9999-8888",
    "email_general": "nuevo@innovacion.com"
  }'
```

### Flujo: Gestionar Contactos
```bash
# 1. Ver contactos actuales
curl -X GET http://localhost:3000/api/proveedores/5/contactos \
  -H "Authorization: Bearer {token}"

# 2. Agregar nuevo contacto
curl -X POST http://localhost:3000/api/proveedores/5/contactos \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Ana",
    "apellido": "López",
    "cargo": "Gerente Técnico",
    "email": "alopez@innovacion.com"
  }'

# 3. Actualizar contacto para hacerlo principal
curl -X PUT http://localhost:3000/api/proveedores/5/contactos/2 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": true
  }'
```

### Flujo: Obtener Estadísticas y Filtrar
```bash
# 1. Ver estadísticas generales
curl -X GET http://localhost:3000/api/proveedores/estadisticas \
  -H "Authorization: Bearer {token}"

# 2. Listar solo laboratorios activos
curl -X GET "http://localhost:3000/api/proveedores?tipo=Laboratorio&activo=true&limit=20" \
  -H "Authorization: Bearer {token}"

# 3. Buscar proveedores con paginación
curl -X GET "http://localhost:3000/api/proveedores?search=buenos aires&page=2&limit=5" \
  -H "Authorization: Bearer {token}"
```

---

## 🚀 INTEGRACIÓN EN FRONTEND

### JavaScript/Fetch Example
```javascript
// Configuración base
const API_BASE = 'http://localhost:3000/api';
const token = localStorage.getItem('jwt_token');

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// Obtener proveedores con filtros
async function getProveedores(page = 1, filters = {}) {
    const params = new URLSearchParams({
        page,
        limit: 10,
        ...filters
    });
    
    const response = await fetch(`${API_BASE}/proveedores?${params}`, {
        headers
    });
    
    return await response.json();
}

// Crear proveedor
async function createProveedor(proveedorData) {
    const response = await fetch(`${API_BASE}/proveedores`, {
        method: 'POST',
        headers,
        body: JSON.stringify(proveedorData)
    });
    
    return await response.json();
}

// Actualizar proveedor
async function updateProveedor(id, updates) {
    const response = await fetch(`${API_BASE}/proveedores/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
    });
    
    return await response.json();
}
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 🔒 **Seguridad**
- Todos los endpoints requieren autenticación JWT válida
- Validación robusta en servidor de todos los campos
- Protección contra inyección SQL con prepared statements
- Rate limiting aplicado (100 requests por 15 minutos)

### 📋 **Reglas de Negocio**
1. **CUIT único:** No puede haber dos proveedores activos con el mismo CUIT
2. **Contacto principal único:** Solo un contacto puede ser principal por proveedor
3. **Soft delete:** Los proveedores se desactivan, no se eliminan físicamente
4. **Cascada:** Al eliminar proveedor, se eliminan todos sus contactos

### 🔍 **Búsquedas y Filtros**
- Búsqueda case-insensitive en razón social, CUIT y email
- Filtros por tipo de proveedor y estado activo
- Paginación en todos los listados
- Ordenamiento por razón social por defecto

### 🗃️ **Base de Datos**
- Tablas con prefijo `alt_` para evitar conflictos
- Índices optimizados para búsquedas frecuentes
- Foreign keys con CASCADE DELETE para integridad
- Timestamps automáticos para auditoría

---

## 📝 CHANGELOG v2.5

### ✅ **Nuevas Funcionalidades**
- **Documentación completa** con todos los endpoints
- **Ejemplos de uso** para cada funcionalidad
- **Validaciones detalladas** con mensajes de error específicos
- **Códigos de estado** claramente documentados
- **Integración frontend** con ejemplos de JavaScript

### 🔄 **Mejoras**
- **Estructura mejorada** de la documentación
- **Ejemplos reales** de requests y responses
- **Casos de error** documentados con soluciones
- **Flujos completos** de trabajo típicos

---

## 🎯 PRÓXIMOS PASOS

1. **Importar colección Postman** actualizada para testing
2. **Implementar frontend** usando los ejemplos de JavaScript
3. **Configurar monitoreo** de errores y performance
4. **Agregar tests unitarios** para cada endpoint
5. **Documentar integraciones** con el módulo de auditorías

---

