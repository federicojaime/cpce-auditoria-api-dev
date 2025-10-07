# Sistema de Usuarios de Prueba - Documentación

## Descripción General

Sistema completo para gestionar usuarios con período de prueba limitado. Permite crear usuarios con días limitados de acceso, realizar seguimiento del tiempo restante y convertir usuarios de prueba a definitivos.

## Instalación

### 1. Ejecutar Script SQL

Primero, ejecuta el script SQL en tu base de datos:

```bash
mysql -u tu_usuario -p cpce_auditoria < sql/add_trial_period.sql
```

O copia y ejecuta el contenido de `sql/add_trial_period.sql` en tu gestor de base de datos.

Este script:
- Agrega las columnas necesarias a la tabla `user_au`
- Crea triggers automáticos para calcular fechas de expiración
- Crea una vista `v_usuarios_prueba` para consultas fáciles
- Agrega índices para mejorar rendimiento

### 2. La API ya está configurada

Las rutas ya están registradas en `server.js` bajo `/api/trial`

## Estructura de la Base de Datos

### Nuevas columnas en `user_au`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `es_prueba` | TINYINT(1) | 0 = usuario definitivo, 1 = usuario de prueba |
| `fecha_inicio_prueba` | DATETIME | Fecha en que inició el período de prueba |
| `dias_prueba` | INT | Cantidad de días de prueba asignados (default: 30) |
| `fecha_expiracion_prueba` | DATETIME | Fecha calculada automáticamente de expiración |
| `ultimo_acceso` | DATETIME | Última fecha de acceso (para contador) |
| `estado_cuenta` | ENUM | Estados: 'activa', 'prueba_activa', 'prueba_expirada', 'suspendida' |

## Funcionalidades

### 1. Login Automático con Validación

El sistema valida automáticamente el estado de prueba en cada login:

```javascript
POST /api/auth/login
{
  "username": "usuario_prueba",
  "password": "password123"
}
```

**Respuesta exitosa (usuario de prueba):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "jwt_token_aqui",
  "user": {
    "idauditor": 1,
    "nombre": "Usuario",
    "apellido": "Prueba",
    "rol": "usuario",
    "foto": null,
    "firma": null,
    "esPrueba": true,
    "estadoCuenta": "prueba_activa"
  },
  "trial": {
    "diasRestantes": 25,
    "fechaExpiracion": "2025-11-06T10:30:00.000Z",
    "warning": null,
    "isFirstAccess": false
  }
}
```

**Respuesta cuando expira:**
```json
{
  "error": true,
  "message": "Tu período de prueba ha expirado. Por favor, contacta al administrador para activar tu cuenta.",
  "expired": true,
  "fechaExpiracion": "2025-10-07T10:30:00.000Z"
}
```

### 2. Contador de Días

El contador funciona así:
- **Al crear usuario de prueba:** Se establece `fecha_inicio_prueba` y `fecha_expiracion_prueba`
- **En cada login:** Se calcula automáticamente los días restantes
- **Actualización automática:** El campo `ultimo_acceso` se actualiza en cada petición

### 3. API Endpoints

#### Para Usuarios Normales

##### Obtener información de mi prueba
```javascript
GET /api/trial/my-info
Headers: { Authorization: "Bearer {token}" }

Respuesta:
{
  "success": true,
  "trial": {
    "esPrueba": true,
    "fechaInicio": "2025-10-07T10:30:00.000Z",
    "fechaExpiracion": "2025-11-06T10:30:00.000Z",
    "diasPrueba": 30,
    "diasRestantes": 25,
    "estadoCuenta": "prueba_activa",
    "activo": true
  }
}
```

#### Para Administradores

##### Listar todos los usuarios de prueba
```javascript
GET /api/trial/users
Headers: { Authorization: "Bearer {admin_token}" }

Respuesta:
{
  "success": true,
  "total": 5,
  "users": [
    {
      "id": 1,
      "username": "usuario1",
      "nombre": "Juan",
      "apellido": "Pérez",
      "dni": "12345678",
      "fechaInicio": "2025-10-07T10:30:00.000Z",
      "fechaExpiracion": "2025-11-06T10:30:00.000Z",
      "diasPrueba": 30,
      "diasRestantes": 25,
      "ultimoAcceso": "2025-10-07T15:00:00.000Z",
      "estadoCuenta": "prueba_activa",
      "expirado": false
    }
  ]
}
```

##### Crear o convertir usuario a prueba
```javascript
POST /api/trial/set-trial
Headers: { Authorization: "Bearer {admin_token}" }
Body: {
  "userId": 1,
  "diasPrueba": 30  // Opcional, default: 30
}

Respuesta:
{
  "success": true,
  "message": "Usuario configurado como prueba con 30 días",
  "user": {
    "id": 1,
    "username": "usuario1",
    "diasPrueba": 30
  }
}
```

##### Extender período de prueba
```javascript
POST /api/trial/extend
Headers: { Authorization: "Bearer {admin_token}" }
Body: {
  "userId": 1,
  "diasAdicionales": 15
}

Respuesta:
{
  "success": true,
  "message": "Prueba extendida por 15 días adicionales",
  "user": {
    "id": 1,
    "username": "usuario1",
    "nuevaFechaExpiracion": "2025-11-21T10:30:00.000Z",
    "totalDiasPrueba": 45
  }
}
```

##### Convertir a usuario definitivo
```javascript
POST /api/trial/convert-permanent
Headers: { Authorization: "Bearer {admin_token}" }
Body: {
  "userId": 1
}

Respuesta:
{
  "success": true,
  "message": "Usuario convertido a cuenta definitiva exitosamente",
  "user": {
    "id": 1,
    "username": "usuario1"
  }
}
```

##### Suspender usuario
```javascript
POST /api/trial/suspend
Headers: { Authorization: "Bearer {admin_token}" }
Body: {
  "userId": 1
}
```

##### Reactivar usuario
```javascript
POST /api/trial/reactivate
Headers: { Authorization: "Bearer {admin_token}" }
Body: {
  "userId": 1
}
```

## Uso en el Frontend

### Ejemplo React/Vue/Angular

```javascript
// Al hacer login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const data = await loginResponse.json();

if (data.success) {
  // Guardar token
  localStorage.setItem('token', data.token);

  // Verificar si es usuario de prueba
  if (data.user.esPrueba && data.trial) {
    const { diasRestantes, warning } = data.trial;

    // Mostrar notificación si quedan pocos días
    if (warning) {
      showNotification(warning, 'warning');
    }

    // Mostrar contador en la UI
    displayTrialCounter(diasRestantes);
  }
}
```

### Ejemplo de componente contador

```javascript
// Componente para mostrar días restantes
function TrialCounter({ diasRestantes, fechaExpiracion }) {
  const isExpiringSoon = diasRestantes <= 7;

  return (
    <div className={`trial-badge ${isExpiringSoon ? 'warning' : ''}`}>
      <span>Prueba: {diasRestantes} días restantes</span>
      <span className="expiration">
        Expira: {new Date(fechaExpiracion).toLocaleDateString()}
      </span>
    </div>
  );
}
```

## Consultas SQL Útiles

### Ver todos los usuarios de prueba
```sql
SELECT * FROM v_usuarios_prueba;
```

### Ver usuarios que expiran en los próximos 7 días
```sql
SELECT * FROM v_usuarios_prueba
WHERE dias_restantes <= 7 AND dias_restantes >= 0
ORDER BY dias_restantes ASC;
```

### Ver usuarios expirados
```sql
SELECT * FROM v_usuarios_prueba
WHERE dias_restantes < 0
ORDER BY dias_restantes ASC;
```

### Crear usuario de prueba manualmente
```sql
INSERT INTO user_au (user, password, nombre, apellido, dni, rol, es_prueba, fecha_inicio_prueba, dias_prueba)
VALUES ('usuario_prueba', MD5('password123'), 'Usuario', 'Prueba', '12345678', 'usuario', 1, NOW(), 30);
```

### Convertir usuario existente a prueba
```sql
UPDATE user_au
SET es_prueba = 1,
    fecha_inicio_prueba = NOW(),
    dias_prueba = 30
WHERE user = 'usuario_existente';
```

## Middleware Opcional

Si quieres validar el estado de prueba en TODAS las peticiones (no solo en login), puedes usar el middleware:

```javascript
import { validateTrialMiddleware } from './middleware/trialValidation.js';

// En tus rutas protegidas
router.get('/ruta-protegida', authMiddleware, validateTrialMiddleware, controlador);
```

Esto bloqueará automáticamente el acceso si el período de prueba expiró.

## Estados de Cuenta

| Estado | Descripción |
|--------|-------------|
| `activa` | Usuario definitivo con acceso completo |
| `prueba_activa` | Usuario de prueba con acceso vigente |
| `prueba_expirada` | Usuario de prueba con período vencido |
| `suspendida` | Cuenta suspendida por administrador |

## Flujo Completo

1. **Admin crea usuario de prueba** → Se establece `es_prueba = 1` y `dias_prueba = 30`
2. **Usuario hace login por primera vez** → Se establece `fecha_inicio_prueba` y `fecha_expiracion_prueba`
3. **Sistema calcula días restantes** → `DATEDIFF(fecha_expiracion_prueba, NOW())`
4. **Usuario ve contador** → Frontend muestra días restantes
5. **Al expirar** → Login bloqueado con mensaje de expiración
6. **Admin puede:**
   - Extender prueba → Suma días adicionales
   - Convertir a definitivo → `es_prueba = 0`
   - Suspender cuenta → `estado_cuenta = 'suspendida'`

## Testing

### Probar con Postman/Thunder Client

1. Crear usuario de prueba (SQL)
2. Login → Verificar que devuelve info de `trial`
3. Obtener info de prueba → `GET /api/trial/my-info`
4. Admin: Extender prueba → `POST /api/trial/extend`
5. Admin: Convertir a definitivo → `POST /api/trial/convert-permanent`

## Mantenimiento

### Tarea programada para limpiar usuarios expirados

Puedes crear un cron job que actualice estados:

```sql
-- Actualizar usuarios expirados
UPDATE user_au
SET estado_cuenta = 'prueba_expirada'
WHERE es_prueba = 1
  AND fecha_expiracion_prueba < NOW()
  AND estado_cuenta != 'prueba_expirada';
```

## Soporte

Para cualquier duda o problema, revisa:
- [authController.js](controllers/authController.js) - Lógica de login y validación
- [trialController.js](controllers/trialController.js) - Gestión de pruebas
- [trialValidation.js](middleware/trialValidation.js) - Middleware de validación
- [add_trial_period.sql](sql/add_trial_period.sql) - Estructura de base de datos
