# Documentación: Campo Email en Tabla user_au

## Fecha: 2025-10-22

## Descripción General
Se agregó el campo `email` a la tabla `user_au` para permitir que los usuarios administradores reciban notificaciones por email cuando los proveedores responden a solicitudes de presupuesto.

---

## 🗄️ Cambios en Base de Datos

### Script de Migración
Ubicación: `/migrations/add_email_user_au.sql`

```sql
-- Agregar campo email a la tabla user_au
ALTER TABLE `user_au`
ADD COLUMN `email` varchar(255) DEFAULT NULL COMMENT 'Email del usuario para notificaciones'
AFTER `user`;

-- Crear índice para búsquedas por email
CREATE INDEX `idx_email` ON `user_au` (`email`);
```

### Cómo aplicar la migración
```bash
mysql -u tu_usuario -p tu_base_de_datos < migrations/add_email_user_au.sql
```

---

## 📝 Configuración Post-Migración

### IMPORTANTE: Actualizar emails de administradores

Después de ejecutar la migración, debes actualizar los emails de los usuarios administradores manualmente:

```sql
-- Ver todos los administradores (rol = 1)
SELECT id, nombre, apellido, user, rol FROM user_au WHERE rol = 1;

-- Actualizar email de cada administrador
UPDATE user_au SET email = 'admin@ejemplo.com' WHERE id = 1;
UPDATE user_au SET email = 'otro_admin@ejemplo.com' WHERE id = 2;
UPDATE user_au SET email = 'supervisor@ejemplo.com' WHERE id = 3;

-- Verificar que los emails se guardaron correctamente
SELECT id, nombre, apellido, user, email, rol FROM user_au WHERE rol = 1;
```

---

## 🔔 Funcionalidad de Notificaciones

### Cuándo se envían notificaciones

Cuando un proveedor responde a una solicitud de presupuesto (acepta o rechaza medicamentos), el sistema automáticamente:

1. Busca todos los usuarios con `rol = 1` (administradores) que tengan email configurado
2. Les envía un email de notificación con:
   - Nombre del proveedor que respondió
   - Número de lote
   - Resumen: cantidad de medicamentos aceptados y rechazados

### Query utilizado

```javascript
SELECT email FROM user_au
WHERE rol = 1
AND email IS NOT NULL
AND email != ''
```

### Mensaje si no hay admins con email

Si ningún administrador tiene email configurado, el sistema registra en el log:

```
⚠️ No hay administradores con email configurado para notificar
```

**Esto NO detiene el proceso** - la respuesta del proveedor se guarda correctamente de todas formas.

---

## 🔌 Cambios en API

### Endpoint Afectado
**POST** `/api/presupuestos/responder/:token`

### Flujo Actualizado

1. Proveedor envía su respuesta (acepta/rechaza medicamentos)
2. Sistema guarda la respuesta en la base de datos
3. Sistema actualiza estados de la solicitud
4. **NUEVO:** Sistema busca admins con email y les notifica
5. Si hay error en el email (admins sin email configurado), solo registra warning
6. Respuesta exitosa al proveedor

### Código Actualizado

```javascript
// Enviar notificación interna
try {
    // Obtener emails de usuarios administradores (rol 1 = admin) que tengan email configurado
    const [admins] = await connection.query(
        `SELECT email FROM user_au WHERE rol = 1 AND email IS NOT NULL AND email != ''`
    );

    if (admins.length > 0) {
        const emailsAdmins = admins.map(a => a.email).join(',');

        // Crear resumen
        const aceptadas = respuestas.filter(r => r.acepta).length;
        const rechazadas = respuestas.length - aceptadas;
        const resumen = `${aceptadas} medicamento(s) aceptado(s), ${rechazadas} rechazado(s)`;

        await notificarRespuestaPresupuesto({
            emailsDestinatarios: emailsAdmins,
            proveedorNombre: solicitud.proveedor_nombre,
            loteNumero: solicitud.lote_numero,
            auditoriaId: respuestas[0].auditoriaId,
            resumen: resumen
        });
    } else {
        console.log('⚠️ No hay administradores con email configurado para notificar');
    }
} catch (emailError) {
    console.error('❌ Error enviando notificación:', emailError);
}
```

---

## 📧 Ejemplo de Email de Notificación

### Asunto
```
🔔 Nueva Respuesta de Presupuesto - Droguería del Sud S.R.Ls
```

### Cuerpo del Email
```
Se ha recibido una respuesta de presupuesto

Proveedor: Droguería del Sud S.R.Ls
Lote: LOTE-20251022-1142
Auditoría: #18

Resumen: 2 medicamento(s) aceptado(s), 0 rechazado(s)

Por favor, ingrese al sistema para revisar los detalles completos del presupuesto.

---
Sistema de Auditoría - Demo Alta Luna
```

---

## 🎨 Frontend - Panel de Usuarios

### Formulario de Creación/Edición de Usuario

Agregar campo email al formulario de usuarios:

```jsx
<form onSubmit={handleSubmit}>
  <input
    type="text"
    name="nombre"
    placeholder="Nombre"
    required
  />

  <input
    type="text"
    name="apellido"
    placeholder="Apellido"
    required
  />

  <input
    type="text"
    name="user"
    placeholder="Usuario"
    required
  />

  {/* NUEVO CAMPO */}
  <input
    type="email"
    name="email"
    placeholder="Email (para notificaciones)"
    maxLength={255}
  />

  <input
    type="password"
    name="password"
    placeholder="Contraseña"
    required
  />

  <select name="rol" required>
    <option value="">Seleccione rol</option>
    <option value="1">Administrador</option>
    <option value="2">Auditor</option>
    <option value="3">Usuario</option>
  </select>

  <button type="submit">Guardar Usuario</button>
</form>
```

### Validación en Frontend

```javascript
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const handleSubmit = (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const email = formData.get('email');

  // Email es opcional, pero si se ingresa debe ser válido
  if (email && !validateEmail(email)) {
    alert('Por favor ingrese un email válido');
    return;
  }

  // Continuar con el envío...
};
```

---

## 🧪 Testing

### Test 1: Respuesta sin admins con email (warning en log)
```bash
# 1. Asegurarse de que ningún admin tiene email
mysql -u usuario -p -e "UPDATE user_au SET email = NULL WHERE rol = 1;"

# 2. Proveedor responde presupuesto
curl -X POST http://localhost:3000/api/presupuestos/responder/TOKEN \
-H "Content-Type: application/json" \
-d '{
  "respuestas": [{
    "auditoriaId": 18,
    "medicamentoId": 101,
    "acepta": true,
    "precio": 1250.50,
    "fechaRetiro": "2025-10-25",
    "fechaVencimiento": "2026-12-31",
    "lugarRetiro": "Sucursal Centro",
    "comentarios": "Stock disponible"
  }]
}'

# Resultado esperado:
# - 200 OK (respuesta guardada correctamente)
# - Log: "⚠️ No hay administradores con email configurado para notificar"
```

### Test 2: Respuesta con admins con email (email enviado)
```bash
# 1. Configurar email de un admin
mysql -u usuario -p -e "UPDATE user_au SET email = 'admin@ejemplo.com' WHERE id = 1 AND rol = 1;"

# 2. Proveedor responde presupuesto (mismo comando anterior)

# Resultado esperado:
# - 200 OK (respuesta guardada correctamente)
# - Email enviado a admin@ejemplo.com
# - Log: Email enviado exitosamente
```

### Test 3: Verificar estructura de tabla
```sql
DESCRIBE user_au;

-- Debe mostrar el campo email:
-- | email | varchar(255) | YES | | NULL | Email del usuario para notificaciones |
```

---

## 🚀 Despliegue

### Pasos completos para aplicar en producción:

1. **Backup de base de datos**
   ```bash
   mysqldump -u usuario -p base_datos > backup_antes_email_$(date +%Y%m%d).sql
   ```

2. **Aplicar migración SQL**
   ```bash
   mysql -u usuario -p base_datos < migrations/add_email_user_au.sql
   ```

3. **Verificar que el campo se creó**
   ```bash
   mysql -u usuario -p base_datos -e "DESCRIBE user_au;"
   ```

4. **Configurar emails de administradores**
   ```sql
   -- Conectarse a la base de datos
   mysql -u usuario -p base_datos

   -- Actualizar emails (ajustar según tus usuarios)
   UPDATE user_au SET email = 'admin1@tuempresa.com' WHERE id = 1;
   UPDATE user_au SET email = 'admin2@tuempresa.com' WHERE id = 5;

   -- Verificar
   SELECT id, nombre, apellido, user, email, rol FROM user_au WHERE rol = 1;
   ```

5. **Reiniciar servidor Node.js**
   ```bash
   pm2 restart api
   # o
   npm restart
   ```

6. **Actualizar frontend** con el campo email en el formulario de usuarios

7. **Testing**
   - Crear una solicitud de presupuesto
   - Hacer que un proveedor responda
   - Verificar que los admins reciben el email

---

## 📊 Estructura de Tabla Actualizada

### Tabla: `user_au`

| Campo | Tipo | Null | Default | Descripción |
|-------|------|------|---------|-------------|
| id | int(11) | NO | - | ID único del usuario |
| nombre | varchar(45) | NO | - | Nombre del usuario |
| apellido | varchar(45) | NO | - | Apellido del usuario |
| user | varchar(18) | NO | - | Nombre de usuario para login |
| **email** | **varchar(255)** | **YES** | **NULL** | **Email para notificaciones (NUEVO)** |
| password | varchar(36) | NO | - | Contraseña encriptada |
| rol | int(11) | NO | - | Rol (1=Admin, 2=Auditor, 3=Usuario) |
| dni | int(11) | YES | NULL | DNI del usuario |
| ... | ... | ... | ... | ... (otros campos) |

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si un admin no tiene email configurado?
El sistema solo envía notificaciones a los admins que tengan email configurado. Los que no tengan email, simplemente no recibirán la notificación. El proceso continúa normalmente.

### ¿El email es obligatorio para todos los usuarios?
No, el email es opcional. Sin embargo, es **altamente recomendado** configurarlo para los usuarios con rol de administrador (rol = 1) para que puedan recibir notificaciones importantes.

### ¿Puedo recibir notificaciones múltiples admins?
Sí, todos los admins con email configurado recibirán una copia del email de notificación.

### ¿Qué pasa si el email está mal escrito?
Si el email tiene formato inválido, el envío fallará pero el sistema registrará el error en el log y continuará funcionando. La respuesta del proveedor se guardará correctamente.

### ¿Puedo cambiar mi email después?
Sí, simplemente actualiza el registro en la base de datos:
```sql
UPDATE user_au SET email = 'nuevo_email@ejemplo.com' WHERE id = TU_ID;
```

---

## 📞 Soporte

Para consultas sobre esta funcionalidad, contactar al equipo de desarrollo.
