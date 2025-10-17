# DOCUMENTACIÓN COMPLETA - MÓDULO ALTO COSTO

## ÍNDICE
1. [Flujo Completo del Sistema](#flujo-completo-del-sistema)
2. [Tablas de Base de Datos](#tablas-de-base-de-datos)
3. [Estados y Valores](#estados-y-valores)
4. [API Endpoints](#api-endpoints)
5. [Estructura de Datos](#estructura-de-datos)

---

## FLUJO COMPLETO DEL SISTEMA

### 1. AUDITORÍA (Módulo Actual - COMPLETADO ✅)

**Actor:** Auditor Farmacéutico/Médico Auditor

**Proceso:**
1. El auditor ve las recetas pendientes (estado_auditoria = 0 o NULL)
2. El auditor revisa cada medicamento de la receta
3. El auditor APRUEBA o RECHAZA cada medicamento individualmente:
   - **APROBAR**: estado_auditoria = 1 (Autorizado)
   - **RECHAZAR**: estado_auditoria = 2 (Denegado)
   - **OBSERVAR**: estado_auditoria = 3 (Requiere información adicional)

**Tablas involucradas:**
- `rec_receta_alto_costo` - Datos de la receta
- `rec_prescrmedicamento_alto_costo` - Medicamentos con campo `estado_auditoria`

**IMPORTANTE:**
- NO se genera PDF en esta etapa
- La receta pasa automáticamente a COMPRAS cuando tiene medicamentos aprobados

---

### 2. COMPRAS (Módulo a CREAR 🔨)

**Actor:** Personal de Compras

**Proceso:**
1. Compras ve las recetas APROBADAS pendientes de enviar a proveedores
2. Compras selecciona proveedores para cada medicamento aprobado
3. Compras ENVÍA la solicitud a los proveedores seleccionados
4. Proveedores reciben notificación por email/sistema
5. El estado cambia a "Enviado a Proveedores"

**Tablas NUEVAS necesarias:**

```sql
-- Tabla para gestionar el proceso de compras
CREATE TABLE rec_compras_alto_costo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idreceta INT NOT NULL,
    estado_compra ENUM('pendiente_envio', 'enviado_proveedores', 'con_presupuestos', 'finalizado') DEFAULT 'pendiente_envio',
    fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_envio_proveedores DATETIME NULL,
    id_usuario_compras INT NULL,
    observaciones TEXT NULL,
    FOREIGN KEY (idreceta) REFERENCES rec_receta_alto_costo(idreceta),
    FOREIGN KEY (id_usuario_compras) REFERENCES user_au(id)
);

-- Tabla de proveedores
CREATE TABLE rec_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NULL,
    direccion TEXT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla que relaciona qué proveedores se contactaron para cada medicamento
CREATE TABLE rec_compras_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    idreceta INT NOT NULL,
    nro_orden INT NOT NULL,
    id_proveedor INT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('enviado', 'presupuesto_recibido', 'rechazado') DEFAULT 'enviado',
    FOREIGN KEY (id_compra) REFERENCES rec_compras_alto_costo(id),
    FOREIGN KEY (id_proveedor) REFERENCES rec_proveedores(id)
);
```

---

### 3. PROVEEDORES (Módulo a CREAR 🔨)

**Actor:** Proveedores externos

**Proceso:**
1. Proveedor recibe notificación con los medicamentos solicitados
2. Proveedor ingresa al sistema con credenciales
3. Proveedor carga PRESUPUESTO para cada medicamento:
   - Precio unitario
   - Stock disponible
   - Tiempo de entrega
   - Observaciones
4. El presupuesto queda registrado y notifica a Compras

**Tablas NUEVAS necesarias:**

```sql
-- Tabla de usuarios proveedores (login)
CREATE TABLE rec_proveedores_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso DATETIME NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES rec_proveedores(id)
);

-- Tabla de presupuestos de proveedores
CREATE TABLE rec_presupuestos_alto_costo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_compra_proveedor INT NOT NULL,
    idreceta INT NOT NULL,
    nro_orden INT NOT NULL,
    id_proveedor INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad_disponible INT NOT NULL,
    tiempo_entrega_dias INT NULL,
    observaciones TEXT NULL,
    fecha_presupuesto DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario_proveedor INT NOT NULL,
    FOREIGN KEY (id_compra_proveedor) REFERENCES rec_compras_proveedores(id),
    FOREIGN KEY (id_proveedor) REFERENCES rec_proveedores(id),
    FOREIGN KEY (id_usuario_proveedor) REFERENCES rec_proveedores_usuarios(id)
);
```

---

### 4. GENERACIÓN DE RECETA FINAL (Módulo a CREAR 🔨)

**Actor:** Sistema automático o Personal de Compras

**Proceso:**
1. Cuando se reciben presupuestos de los proveedores
2. Compras selecciona el mejor presupuesto para cada medicamento
3. Se marca el presupuesto como "SELECCIONADO"
4. **RECIÉN AQUÍ** se genera el PDF de la receta
5. El paciente puede buscar/descargar la receta

**Tabla NUEVA necesaria:**

```sql
-- Tabla para marcar qué presupuesto fue seleccionado
CREATE TABLE rec_presupuestos_seleccionados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_presupuesto INT NOT NULL UNIQUE,
    idreceta INT NOT NULL,
    nro_orden INT NOT NULL,
    fecha_seleccion DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario_seleccion INT NOT NULL,
    pdf_generado BOOLEAN DEFAULT FALSE,
    pdf_url VARCHAR(500) NULL,
    fecha_pdf DATETIME NULL,
    FOREIGN KEY (id_presupuesto) REFERENCES rec_presupuestos_alto_costo(id),
    FOREIGN KEY (id_usuario_seleccion) REFERENCES user_au(id)
);
```

---

## ESTADOS Y VALORES

### Estado de Auditoría (campo `estado_auditoria` en `rec_prescrmedicamento_alto_costo`)
```
0 o NULL = Pendiente de auditar
1 = Autorizado (APROBADO)
2 = Denegado (RECHAZADO)
3 = Requiere información adicional (OBSERVADO)
```

### Estado de Compras (campo `estado_compra` en `rec_compras_alto_costo`)
```
'pendiente_envio' = Receta aprobada, esperando envío a proveedores
'enviado_proveedores' = Ya se envió a proveedores, esperando presupuestos
'con_presupuestos' = Se recibieron presupuestos, pendiente selección
'finalizado' = Presupuesto seleccionado y PDF generado
```

### Estado de Envío a Proveedores (campo `estado` en `rec_compras_proveedores`)
```
'enviado' = Solicitud enviada al proveedor
'presupuesto_recibido' = Proveedor ya envió presupuesto
'rechazado' = Proveedor rechazó la solicitud
```

---

## API ENDPOINTS

### AUDITORÍA (ACTUAL - COMPLETADO ✅)

#### GET /api/alto-costo/pendientes
**Descripción:** Lista recetas pendientes de auditar
**Filtro:** estado_auditoria = 0 o NULL
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 20,
      "apellido": "García",
      "nombre": "Juan",
      "dni": "12345678",
      "fecha": "15-10-2025",
      "medico": "Dr. Pérez MP-1234",
      "renglones": 3
    }
  ],
  "pagination": { "page": 1, "limit": 15, "total": 4, "totalPages": 1 }
}
```

#### GET /api/alto-costo/historicas
**Descripción:** Lista recetas ya auditadas
**Filtro:** estado_auditoria != 0 y NOT NULL
**Response:** Similar a pendientes + fecha y auditor

#### GET /api/alto-costo/:id
**Descripción:** Obtiene detalles completos de una receta
**Response:**
```json
{
  "success": true,
  "auditoria": {
    "id": 20,
    "idreceta": 20,
    "fecha_origen": "15/10/2025",
    "diagnostico": "Hipertensión arterial",
    "paciente": { "dni": "12345678", "apellido": "García", ... },
    "medico": { "matricula": "1234", "nombre_completo": "Dr. Pérez", ... },
    "medicamentos": [
      {
        "nro_orden": 1,
        "codigo": "12345",
        "monodroga": "ENALAPRIL",
        "nombre_comercial": "RENITEC",
        "cantprescripta": 30,
        "estado_auditoria": 0,
        ...
      }
    ]
  }
}
```

#### POST /api/alto-costo/:id/procesar
**Descripción:** Aprueba o rechaza medicamentos de una receta
**Body:**
```json
{
  "chequedos": "20_1,20_2",     // medicamentos aprobados (formato: idreceta_nroorden)
  "nochequeados": "20_3",        // medicamentos rechazados
  "cobert1": 50,                 // porcentaje cobertura
  "cobert2_1": "CE",             // tipo cobertura
  "nota": "Observaciones"
}
```
**Acción:**
- Actualiza `estado_auditoria` = 1 para aprobados
- Actualiza `estado_auditoria` = 2 para rechazados
- Guarda auditor, fecha y observaciones

**IMPORTANTE:** NO debe generar PDF aquí, debe crear registro en `rec_compras_alto_costo`

#### POST /api/alto-costo/:id/generar-pdf
**Descripción:** Genera PDF de la receta (SOLO después de seleccionar presupuesto)
**Body:** `{ "estado": "0" }`
**Response:**
```json
{
  "success": true,
  "message": "PDF de alto costo generado correctamente",
  "data": {
    "nombreArchivo": "receta_alto_costo_20.pdf",
    "url": "http://localhost:3000/pdfs/receta_alto_costo_20.pdf",
    "medicamentosAutorizados": 2
  }
}
```

---

### COMPRAS (A CREAR 🔨)

#### GET /api/compras/pendientes
**Descripción:** Lista recetas aprobadas pendientes de enviar a proveedores
**Filtro:**
- Recetas con medicamentos en estado_auditoria = 1
- estado_compra = 'pendiente_envio' o no existe registro en rec_compras_alto_costo

#### GET /api/compras/enviadas
**Descripción:** Lista recetas enviadas a proveedores esperando presupuestos
**Filtro:** estado_compra = 'enviado_proveedores'

#### GET /api/compras/:id
**Descripción:** Detalle de una receta en compras con medicamentos aprobados

#### POST /api/compras/:id/enviar-proveedores
**Descripción:** Envía solicitud a proveedores seleccionados
**Body:**
```json
{
  "medicamentos": [
    {
      "nro_orden": 1,
      "proveedores": [1, 3, 5]  // IDs de proveedores a contactar
    },
    {
      "nro_orden": 2,
      "proveedores": [2, 4]
    }
  ],
  "observaciones": "Urgente"
}
```
**Acción:**
- Crea/actualiza registro en `rec_compras_alto_costo`
- Crea registros en `rec_compras_proveedores` para cada proveedor
- Envía emails a los proveedores
- Cambia estado_compra a 'enviado_proveedores'

#### GET /api/compras/proveedores
**Descripción:** Lista todos los proveedores activos

---

### PROVEEDORES (A CREAR 🔨)

#### POST /api/proveedores/login
**Descripción:** Login de proveedores
**Body:** `{ "email": "proveedor@example.com", "password": "..." }`

#### GET /api/proveedores/solicitudes
**Descripción:** Lista solicitudes de medicamentos para el proveedor logueado
**Filtro:** estado = 'enviado'

#### GET /api/proveedores/solicitudes/:id
**Descripción:** Detalle de una solicitud específica

#### POST /api/proveedores/solicitudes/:id/presupuesto
**Descripción:** Proveedor carga presupuesto para un medicamento
**Body:**
```json
{
  "precio_unitario": 150.50,
  "cantidad_disponible": 100,
  "tiempo_entrega_dias": 3,
  "observaciones": "Stock disponible"
}
```
**Acción:**
- Crea registro en `rec_presupuestos_alto_costo`
- Actualiza estado en `rec_compras_proveedores` a 'presupuesto_recibido'
- Notifica a Compras

#### GET /api/proveedores/historial
**Descripción:** Historial de presupuestos enviados por el proveedor

---

### SELECCIÓN DE PRESUPUESTOS (A CREAR 🔨)

#### GET /api/compras/:id/presupuestos
**Descripción:** Lista todos los presupuestos recibidos para una receta
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "nro_orden": 1,
      "monodroga": "ENALAPRIL",
      "presupuestos": [
        {
          "id": 10,
          "proveedor": "Farmacia Central",
          "precio_unitario": 150.50,
          "cantidad_disponible": 100,
          "tiempo_entrega_dias": 3,
          "fecha_presupuesto": "16/10/2025"
        },
        {
          "id": 11,
          "proveedor": "Droguería del Sur",
          "precio_unitario": 145.00,
          "cantidad_disponible": 50,
          "tiempo_entrega_dias": 5,
          "fecha_presupuesto": "16/10/2025"
        }
      ]
    }
  ]
}
```

#### POST /api/compras/:id/seleccionar-presupuestos
**Descripción:** Selecciona los mejores presupuestos y GENERA PDF
**Body:**
```json
{
  "presupuestos_seleccionados": [
    { "nro_orden": 1, "id_presupuesto": 11 },
    { "nro_orden": 2, "id_presupuesto": 23 }
  ]
}
```
**Acción:**
1. Guarda en `rec_presupuestos_seleccionados`
2. Actualiza `estado_compra` a 'finalizado'
3. **GENERA EL PDF** llamando a `generarPDF()`
4. Guarda URL del PDF en `rec_presupuestos_seleccionados`
5. Notifica que la receta está lista para el paciente

---

## RESUMEN DEL FLUJO

```
1. MÉDICO
   ↓
   Prescribe medicamento de alto costo
   ↓
2. AUDITOR
   ↓
   Ve pendientes (estado_auditoria = 0 o NULL)
   ↓
   Aprueba/Rechaza medicamentos
   ↓
   UPDATE estado_auditoria = 1 (aprobado) o 2 (rechazado)
   ↓
   INSERT en rec_compras_alto_costo (estado = 'pendiente_envio')
   ↓
3. COMPRAS
   ↓
   Ve recetas aprobadas pendientes
   ↓
   Selecciona proveedores para cada medicamento
   ↓
   Envía solicitud a proveedores
   ↓
   INSERT en rec_compras_proveedores
   ↓
   UPDATE estado_compra = 'enviado_proveedores'
   ↓
   Email a proveedores
   ↓
4. PROVEEDORES
   ↓
   Reciben notificación
   ↓
   Ingresan al sistema
   ↓
   Cargan presupuestos (precio, stock, tiempo)
   ↓
   INSERT en rec_presupuestos_alto_costo
   ↓
   UPDATE estado en rec_compras_proveedores = 'presupuesto_recibido'
   ↓
   UPDATE estado_compra = 'con_presupuestos'
   ↓
5. COMPRAS (NUEVAMENTE)
   ↓
   Ve presupuestos recibidos
   ↓
   Compara precios, tiempos, disponibilidad
   ↓
   Selecciona el mejor presupuesto para cada medicamento
   ↓
   INSERT en rec_presupuestos_seleccionados
   ↓
   **GENERA PDF** ← ÚNICA VEZ QUE SE GENERA PDF
   ↓
   UPDATE estado_compra = 'finalizado'
   ↓
   UPDATE pdf_generado = TRUE, pdf_url = '...'
   ↓
6. PACIENTE
   ↓
   Puede descargar/imprimir la receta
   ↓
   Va a la farmacia con la receta
```

---

## PRÓXIMOS PASOS

### 1. CREAR TABLAS (SQL)
Ejecutar todos los CREATE TABLE mencionados arriba

### 2. MODIFICAR ENDPOINT DE PROCESAR AUDITORÍA
Cuando se aprueba una receta, debe crear registro en `rec_compras_alto_costo`:

```javascript
// En altoCostoController.js -> procesarAuditoria()
// Después de aprobar medicamentos, agregar:

if (aprobados.length > 0) {
    // Crear registro en compras
    const sqlCompras = `
        INSERT INTO rec_compras_alto_costo (idreceta, estado_compra, id_usuario_compras)
        VALUES (?, 'pendiente_envio', ?)
        ON DUPLICATE KEY UPDATE estado_compra = 'pendiente_envio'
    `;
    await connection.execute(sqlCompras, [id, userId]);
}
```

### 3. CREAR CONTROLADOR DE COMPRAS
Nuevo archivo: `controllers/comprasController.js`

### 4. CREAR CONTROLADOR DE PROVEEDORES
Nuevo archivo: `controllers/proveedoresController.js`

### 5. CREAR RUTAS
- `routes/compras.js`
- `routes/proveedores.js`

### 6. FRONTEND
Crear interfaces para:
- Módulo de Compras (lista, envío a proveedores, selección de presupuestos)
- Portal de Proveedores (login, carga de presupuestos)

---

## NOTAS IMPORTANTES

❌ **NO HACER:**
- NO generar PDF al aprobar la auditoría
- NO permitir que el paciente vea la receta antes de que se seleccione presupuesto

✅ **SÍ HACER:**
- Generar PDF SOLO después de seleccionar presupuestos
- Mantener log de todos los presupuestos recibidos
- Enviar notificaciones por email en cada paso
- Validar que todos los medicamentos aprobados tengan presupuesto seleccionado

---

## TABLAS EXISTENTES (NO MODIFICAR)

- `rec_receta_alto_costo` - Recetas de alto costo
- `rec_prescrmedicamento_alto_costo` - Medicamentos con estado_auditoria
- `rec_paciente` - Datos de pacientes
- `tmp_person` - Datos de médicos
- `user_au` - Usuarios del sistema (auditores, compras)
- `vad_020` - Vademécum obra social 20
- `vad_muni` - Vademécum obra social 156

---

Última actualización: 2025-10-17
