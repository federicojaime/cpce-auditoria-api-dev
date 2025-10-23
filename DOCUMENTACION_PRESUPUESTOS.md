# Sistema de Solicitud de Presupuestos a Proveedores

## Descripción General

Sistema completo para enviar solicitudes de presupuesto a proveedores externos mediante email con enlaces seguros (tokens). Los proveedores pueden responder sin necesidad de ingresar al sistema, simplemente usando el enlace enviado por email.

## Características Principales

- ✅ Envío automático de emails a múltiples proveedores
- ✅ Enlaces únicos y seguros (tokens) con expiración de 72 horas
- ✅ Formulario externo sin necesidad de autenticación
- ✅ Respuestas por medicamento (precio, fecha retiro, vencimiento)
- ✅ Notificaciones automáticas cuando se reciben respuestas
- ✅ Seguimiento y comparación de presupuestos
- ✅ No permite modificar respuestas (por seguridad)

---

## 1. Estructura de Base de Datos

### 1.1. Ejecutar Migración

Primero, ejecuta el archivo SQL de migración:

\`\`\`bash
mysql -u tu_usuario -p tu_base_de_datos < database/migrations/create_presupuestos_tables.sql
\`\`\`

O desde MySQL Workbench/phpMyAdmin, ejecuta el contenido del archivo: `database/migrations/create_presupuestos_tables.sql`

### 1.2. Tablas Creadas

#### `presupuesto_solicitudes`
Tabla principal de solicitudes.
- `id`: ID único
- `lote_numero`: Número de lote único (ej: LOTE-20251020-0001)
- `fecha_envio`: Fecha de envío
- `usuario_envia`: Usuario que creó la solicitud
- `estado`: pendiente, en_proceso, finalizada, cancelada
- `observaciones`: Texto opcional

#### `presupuesto_solicitud_proveedores`
Proveedores incluidos en cada solicitud.
- `id`: ID único
- `solicitud_id`: Referencia a presupuesto_solicitudes
- `proveedor_id`: Referencia a proveedores
- `token`: Token único para acceder (encriptado)
- `fecha_expiracion`: 72 horas desde envío
- `fecha_respuesta`: Cuándo respondió
- `estado`: pendiente, respondido, expirado

#### `presupuesto_solicitud_auditorias`
Auditorías incluidas en la solicitud.
- `solicitud_id`: Referencia a presupuesto_solicitudes
- `auditoria_id`: Referencia a auditorias

#### `presupuesto_respuestas`
Respuestas de proveedores por cada medicamento.
- `solicitud_proveedor_id`: Referencia a presupuesto_solicitud_proveedores
- `auditoria_id`: Auditoría a la que pertenece
- `medicamento_id`: Medicamento específico
- `acepta`: Boolean (acepta o rechaza)
- `precio`: Precio ofrecido (si acepta)
- `fecha_retiro`: Cuándo puede entregar
- `fecha_vencimiento`: Vencimiento del medicamento
- `comentarios`: Comentarios opcionales

#### `presupuesto_notificaciones`
Registro de notificaciones enviadas.

---

## 2. Flujo de Trabajo

### Paso 1: Usuario Interno Crea Solicitud

El usuario selecciona:
1. Auditorías aprobadas de alto costo (con medicamentos)
2. Proveedores a los que enviar la solicitud
3. Observaciones opcionales

**Endpoint:** `POST /api/presupuestos/solicitar-con-email`

### Paso 2: Sistema Envía Emails

El sistema:
1. Genera un número de lote único
2. Crea tokens únicos para cada proveedor
3. Envía emails con enlaces personalizados
4. Establece expiración a 72 horas

### Paso 3: Proveedor Recibe Email

El proveedor recibe un email con:
- Lista de medicamentos solicitados
- Detalles de auditorías y pacientes
- Enlace único para responder
- Fecha de expiración clara

### Paso 4: Proveedor Responde

El proveedor:
1. Hace clic en el enlace del email
2. Accede al formulario (sin login)
3. Para cada medicamento indica:
   - ✅ Acepta o ❌ Rechaza
   - Precio (si acepta)
   - Fecha de retiro disponible
   - Fecha de vencimiento del medicamento
   - Comentarios opcionales

**Endpoint:** `POST /api/presupuestos/responder/:token`

### Paso 5: Sistema Notifica

Cuando un proveedor responde:
1. Se guarda la respuesta en la base de datos
2. Se envía notificación por email a usuarios administradores
3. Se actualiza el estado de la solicitud

### Paso 6: Seguimiento y Comparación

Los usuarios internos pueden:
1. Ver todas las solicitudes
2. Ver respuestas detalladas
3. Comparar precios entre proveedores
4. Identificar la mejor oferta

---

## 3. API Endpoints

### 3.1. Endpoints PÚBLICOS (sin autenticación)

#### GET /api/presupuestos/solicitud/:token
Obtener información de una solicitud usando el token.

**Parámetros:**
- `token` (URL): Token único del proveedor

**Respuesta exitosa (200):**
\`\`\`json
{
  "solicitud": {
    "loteNumero": "LOTE-20251020-0001",
    "fechaEnvio": "2025-10-20T10:00:00.000Z",
    "fechaExpiracion": "2025-10-23T10:00:00.000Z",
    "observaciones": "Urgente",
    "proveedor": {
      "nombre": "Droguería Alta Luna S.R.L.s",
      "email": "federiconj@gmail.com"
    }
  },
  "auditorias": [
    {
      "id": 17,
      "paciente_nombre": "Jaime, Federico",
      "paciente_dni": "38437748",
      "medicamentos": [
        {
          "id": 1,
          "nombre": "Paracetamol",
          "presentacion": "500mg",
          "cantidad": 2
        }
      ]
    }
  ],
  "solicitudProveedorId": 1
}
\`\`\`

**Errores:**
- `404`: Token no válido
- `410`: Solicitud expirada
- `400`: Ya respondió a esta solicitud

---

#### POST /api/presupuestos/responder/:token
Enviar respuesta de presupuesto.

**Parámetros:**
- `token` (URL): Token único del proveedor

**Body:**
\`\`\`json
{
  "respuestas": [
    {
      "auditoriaId": 17,
      "medicamentoId": 1,
      "acepta": true,
      "precio": 1500.50,
      "fechaRetiro": "2025-10-25",
      "fechaVencimiento": "2026-12-31",
      "comentarios": "Disponible inmediatamente"
    },
    {
      "auditoriaId": 18,
      "medicamentoId": 2,
      "acepta": false,
      "comentarios": "No disponible en stock"
    }
  ]
}
\`\`\`

**Validaciones:**
- Si `acepta: true`, entonces `precio`, `fechaRetiro` y `fechaVencimiento` son **obligatorios**
- Si `acepta: false`, solo puede incluir `comentarios` (opcional)

**Respuesta exitosa (200):**
\`\`\`json
{
  "mensaje": "Respuesta enviada exitosamente",
  "loteNumero": "LOTE-20251020-0001",
  "proveedor": "Droguería Alta Luna S.R.L.s",
  "respuestasEnviadas": 2
}
\`\`\`

---

### 3.2. Endpoints PROTEGIDOS (requieren autenticación)

#### POST /api/presupuestos/solicitar-con-email
Crear solicitud y enviar emails a proveedores.

**Headers:**
\`\`\`
Authorization: Bearer <token_jwt>
\`\`\`

**Body:**
\`\`\`json
{
  "auditoriaIds": [17, 18],
  "proveedorIds": [1, 2, 3],
  "observaciones": "Solicitud urgente"
}
\`\`\`

**Respuesta exitosa (201):**
\`\`\`json
{
  "mensaje": "Solicitud de presupuesto creada exitosamente",
  "solicitudId": 1,
  "loteNumero": "LOTE-20251020-0001",
  "auditorias": 2,
  "proveedores": 3,
  "fechaExpiracion": "2025-10-23T10:00:00.000Z",
  "resultadosEnvio": [
    {
      "proveedor": "Droguería Alta Luna S.R.L.s",
      "email": "federiconj@gmail.com",
      "enviado": true,
      "error": null
    },
    {
      "proveedor": "Droguería del Sud S.R.L.s",
      "email": "federiconj@gmail.com",
      "enviado": true,
      "error": null
    }
  ]
}
\`\`\`

---

#### GET /api/presupuestos/solicitudes-email
Listar solicitudes de presupuesto.

**Query params:**
- `estado` (opcional): pendiente, en_proceso, finalizada, cancelada
- `page` (opcional): Página (default: 1)
- `limit` (opcional): Resultados por página (default: 10)

**Respuesta:**
\`\`\`json
{
  "solicitudes": [
    {
      "id": 1,
      "lote_numero": "LOTE-20251020-0001",
      "fecha_envio": "2025-10-20T10:00:00.000Z",
      "estado": "en_proceso",
      "observaciones": "Urgente",
      "usuario_envia_nombre": "Juan Pérez",
      "total_auditorias": 2,
      "total_proveedores": 3,
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
\`\`\`

---

#### GET /api/presupuestos/solicitudes-email/:id
Obtener detalles completos de una solicitud con respuestas.

**Respuesta:**
\`\`\`json
{
  "solicitud": {
    "id": 1,
    "lote_numero": "LOTE-20251020-0001",
    "fecha_envio": "2025-10-20T10:00:00.000Z",
    "estado": "en_proceso",
    "observaciones": "Urgente",
    "usuario_envia_nombre": "Juan Pérez",
    "usuario_envia_email": "juan@example.com"
  },
  "auditorias": [
    {
      "id": 17,
      "paciente_nombre": "Jaime, Federico",
      "paciente_dni": "38437748"
    }
  ],
  "proveedores": [
    {
      "solicitud_proveedor_id": 1,
      "estado": "respondido",
      "fecha_expiracion": "2025-10-23T10:00:00.000Z",
      "fecha_respuesta": "2025-10-21T14:30:00.000Z",
      "proveedor_id": 1,
      "proveedor_nombre": "Droguería Alta Luna S.R.L.s",
      "proveedor_email": "federiconj@gmail.com",
      "proveedor_telefono": "02657218215",
      "respuestas": [
        {
          "auditoria_id": 17,
          "medicamento_id": 1,
          "acepta": true,
          "precio": "1500.50",
          "fecha_retiro": "2025-10-25",
          "fecha_vencimiento": "2026-12-31",
          "comentarios": "Disponible inmediatamente",
          "fecha_respuesta": "2025-10-21T14:30:00.000Z",
          "medicamento_nombre": "Paracetamol",
          "medicamento_presentacion": "500mg"
        }
      ]
    }
  ]
}
\`\`\`

---

#### GET /api/presupuestos/comparar/:solicitudId
Comparar presupuestos de diferentes proveedores.

**Respuesta:**
\`\`\`json
{
  "solicitudId": "1",
  "comparacion": [
    {
      "auditoria": {
        "id": 17,
        "paciente_nombre": "Jaime, Federico",
        "paciente_dni": "38437748"
      },
      "medicamento": {
        "id": 1,
        "nombre": "Paracetamol",
        "presentacion": "500mg"
      },
      "ofertas": [
        {
          "proveedor_id": 1,
          "proveedor_nombre": "Droguería Alta Luna S.R.L.s",
          "acepta": true,
          "precio": "1500.50",
          "fecha_retiro": "2025-10-25",
          "fecha_vencimiento": "2026-12-31",
          "comentarios": "Disponible inmediatamente"
        },
        {
          "proveedor_id": 2,
          "proveedor_nombre": "Droguería del Sud S.R.L.s",
          "acepta": true,
          "precio": "1450.00",
          "fecha_retiro": "2025-10-26",
          "fecha_vencimiento": "2027-01-15",
          "comentarios": "Stock disponible"
        }
      ],
      "mejorOferta": {
        "proveedor_id": 2,
        "proveedor_nombre": "Droguería del Sud S.R.L.s",
        "precio": "1450.00"
      },
      "totalOfertas": 2,
      "ofertasAceptadas": 2
    }
  ]
}
\`\`\`

---

## 4. Configuración de Email

### 4.1. Variables de Entorno

Agrega las siguientes variables en tu archivo `.env` o `config/local.js`:

\`\`\`env
# Configuración de Email
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=envios@codeo.site
EMAIL_PASSWORD=D^z2ZL70$13b
EMAIL_FROM=envios@codeo.site
EMAIL_FROM_NAME=CPCE Salud

# URL del Frontend (para los enlaces)
FRONTEND_URL=http://localhost:3000
\`\`\`

### 4.2. Servicios de Email Implementados

El archivo `services/emailService.js` incluye:

1. **enviarSolicitudPresupuesto()** - Envía solicitud a proveedores
2. **notificarRespuestaPresupuesto()** - Notifica cuando se recibe respuesta

---

## 5. Frontend - Formulario para Proveedores

El proveedor accede a través del enlace: `http://localhost:3000/presupuesto/responder/:token`

### 5.1. Página de Respuesta (React ejemplo)

\`\`\`jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function ResponderPresupuesto() {
  const { token } = useParams();
  const [solicitud, setSolicitud] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarSolicitud();
  }, [token]);

  const cargarSolicitud = async () => {
    try {
      const response = await axios.get(\`/api/presupuestos/solicitud/\${token}\`);
      setSolicitud(response.data);

      // Inicializar respuestas
      const respuestasIniciales = {};
      response.data.auditorias.forEach(aud => {
        aud.medicamentos.forEach(med => {
          respuestasIniciales[\`\${aud.id}_\${med.id}\`] = {
            auditoriaId: aud.id,
            medicamentoId: med.id,
            acepta: false,
            precio: '',
            fechaRetiro: '',
            fechaVencimiento: '',
            comentarios: ''
          };
        });
      });
      setRespuestas(respuestasIniciales);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar la solicitud');
      setLoading(false);
    }
  };

  const handleChange = (audId, medId, field, value) => {
    const key = \`\${audId}_\${medId}\`;
    setRespuestas(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const respuestasArray = Object.values(respuestas);

      await axios.post(\`/api/presupuestos/responder/\${token}\`, {
        respuestas: respuestasArray
      });

      alert('Respuesta enviada exitosamente');
      // Redirigir o mostrar mensaje de éxito
    } catch (err) {
      alert(err.response?.data?.error || 'Error al enviar la respuesta');
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!solicitud) return null;

  return (
    <div className="container">
      <h1>Solicitud de Presupuesto</h1>
      <div className="info-box">
        <p><strong>Lote:</strong> {solicitud.solicitud.loteNumero}</p>
        <p><strong>Proveedor:</strong> {solicitud.solicitud.proveedor.nombre}</p>
        <p><strong>Expira:</strong> {new Date(solicitud.solicitud.fechaExpiracion).toLocaleString()}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {solicitud.auditorias.map(auditoria => (
          <div key={auditoria.id} className="auditoria-card">
            <h3>Auditoría #{auditoria.id}</h3>
            <p>Paciente: {auditoria.paciente_nombre} (DNI: {auditoria.paciente_dni})</p>

            {auditoria.medicamentos.map(medicamento => {
              const key = \`\${auditoria.id}_\${medicamento.id}\`;
              const resp = respuestas[key];

              return (
                <div key={medicamento.id} className="medicamento-card">
                  <h4>{medicamento.nombre}</h4>
                  <p>Presentación: {medicamento.presentacion} - Cantidad: {medicamento.cantidad}</p>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={resp.acepta}
                        onChange={(e) => handleChange(auditoria.id, medicamento.id, 'acepta', e.target.checked)}
                      />
                      Acepto proporcionar este medicamento
                    </label>
                  </div>

                  {resp.acepta && (
                    <>
                      <div className="form-group">
                        <label>Precio *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={resp.precio}
                          onChange={(e) => handleChange(auditoria.id, medicamento.id, 'precio', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Fecha de Retiro *</label>
                        <input
                          type="date"
                          value={resp.fechaRetiro}
                          onChange={(e) => handleChange(auditoria.id, medicamento.id, 'fechaRetiro', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Fecha de Vencimiento *</label>
                        <input
                          type="date"
                          value={resp.fechaVencimiento}
                          onChange={(e) => handleChange(auditoria.id, medicamento.id, 'fechaVencimiento', e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label>Comentarios</label>
                    <textarea
                      value={resp.comentarios}
                      onChange={(e) => handleChange(auditoria.id, medicamento.id, 'comentarios', e.target.value)}
                      rows="3"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <button type="submit" className="btn-primary">
          Enviar Respuesta
        </button>
      </form>
    </div>
  );
}

export default ResponderPresupuesto;
\`\`\`

---

## 6. Testing

### 6.1. Probar el Flujo Completo

#### Paso 1: Crear Solicitud
\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/solicitar-con-email \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TU_TOKEN_JWT" \\
  -d '{
    "auditoriaIds": [17, 18],
    "proveedorIds": [1, 2],
    "observaciones": "Urgente"
  }'
\`\`\`

#### Paso 2: Verificar Email
Revisa la bandeja de entrada de los proveedores. Deberían recibir un email con un enlace como:
\`\`\`
http://localhost:3000/presupuesto/responder/a1b2c3d4e5f6...
\`\`\`

#### Paso 3: Ver Solicitud (Proveedor)
\`\`\`bash
curl http://localhost:3000/api/presupuestos/solicitud/TOKEN_DEL_EMAIL
\`\`\`

#### Paso 4: Enviar Respuesta (Proveedor)
\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/responder/TOKEN_DEL_EMAIL \\
  -H "Content-Type: application/json" \\
  -d '{
    "respuestas": [
      {
        "auditoriaId": 17,
        "medicamentoId": 1,
        "acepta": true,
        "precio": 1500.50,
        "fechaRetiro": "2025-10-25",
        "fechaVencimiento": "2026-12-31",
        "comentarios": "Disponible"
      }
    ]
  }'
\`\`\`

#### Paso 5: Ver Respuestas (Usuario Interno)
\`\`\`bash
curl http://localhost:3000/api/presupuestos/solicitudes-email/1 \\
  -H "Authorization: Bearer TU_TOKEN_JWT"
\`\`\`

#### Paso 6: Comparar Presupuestos
\`\`\`bash
curl http://localhost:3000/api/presupuestos/comparar/1 \\
  -H "Authorization: Bearer TU_TOKEN_JWT"
\`\`\`

---

## 7. Seguridad

### 7.1. Tokens
- Generados con `crypto.randomBytes(32).toString('hex')`
- Únicos por proveedor y solicitud
- Expiran en 72 horas
- No reutilizables después de responder

### 7.2. Validaciones
- Verificación de expiración en cada acceso
- Validación de campos obligatorios
- Prevención de respuestas duplicadas
- Transacciones de base de datos para integridad

### 7.3. Permisos
- Rutas públicas: Solo accesibles con token válido
- Rutas protegidas: Requieren JWT de usuario autenticado
- Separación clara entre endpoints públicos y privados

---

## 8. Mantenimiento

### 8.1. Limpiar Tokens Expirados

Crea un cron job para actualizar tokens expirados:

\`\`\`sql
UPDATE presupuesto_solicitud_proveedores
SET estado = 'expirado'
WHERE estado = 'pendiente'
AND fecha_expiracion < NOW();
\`\`\`

### 8.2. Logs y Monitoreo

Los errores se registran en:
- Console: `console.error('Error...')`
- Respuestas API: Incluyen detalles del error

### 8.3. Notificaciones

Las notificaciones se envían automáticamente cuando:
- Se crea una solicitud (email a proveedores)
- Se recibe una respuesta (email a administradores)

---

## 9. Preguntas Frecuentes

### ¿Qué pasa si el enlace expira?
El proveedor verá un mensaje de error 410 indicando que la solicitud ha expirado. Deberá contactar con CPCE para una nueva solicitud.

### ¿Un proveedor puede modificar su respuesta?
No, por el momento no se permite modificar respuestas. Si necesita cambiar algo, debe contactar directamente con CPCE.

### ¿Qué pasa si un proveedor no responde?
El estado del proveedor quedará como "pendiente" y luego "expirado" después de 72 horas. Los usuarios internos pueden ver qué proveedores no respondieron.

### ¿Se pueden enviar recordatorios?
Actualmente no está implementado, pero sería una buena extensión futura enviar un email recordatorio 24 horas antes de la expiración.

### ¿Cómo se comparan los presupuestos?
El endpoint `/api/presupuestos/comparar/:solicitudId` agrupa las respuestas por medicamento y automáticamente identifica la mejor oferta (menor precio).

---

## 10. Próximas Mejoras

- [ ] Sistema de recordatorios automáticos
- [ ] Permitir modificar respuesta (con confirmación)
- [ ] Dashboard visual de comparación de presupuestos
- [ ] Exportar comparación a PDF/Excel
- [ ] Historial de presupuestos por proveedor
- [ ] Sistema de puntuación de proveedores
- [ ] Chat en vivo con proveedores
- [ ] Adjuntar documentos (facturas, certificados)

---

## Contacto y Soporte

Para consultas o problemas, contactar al equipo de desarrollo.

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Autor:** Sistema de Auditorías CPCE
