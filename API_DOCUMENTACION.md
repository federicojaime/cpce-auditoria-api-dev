# 📋 DOCUMENTACIÓN API - SISTEMA AUDITORÍAS CPCE
**Versión 1.1 - Actualizada con correcciones de base de datos**

## 🔐 AUTENTICACIÓN

### POST /api/auth/login
Iniciar sesión y obtener JWT token
```json
{
    "username": "tu_usuario",
    "password": "tu_password"
}
```

**Respuesta exitosa:**
```json
{
    "success": true,
    "message": "Login exitoso",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "idauditor": 1,
        "nombre": "Juan",
        "apellido": "Pérez",
        "rol": 10,
        "foto": "foto.jpg",
        "firma": "firma.jpg"
    }
}
```

### GET /api/auth/profile
Obtener perfil del usuario (requiere token)

### GET /api/auth/verify
Verificar si el token es válido
**Headers:** `Authorization: Bearer {token}`

### PUT /api/auth/change-password
Cambiar contraseña usando usuario + DNI
```json
{
    "username": "usuario",
    "dni": "12345678",
    "password_nuevo": "nueva123",
    "password_nuevo_repetir": "nueva123"
}
```

### POST /api/auth/logout
Cerrar sesión (requiere token)

---

## 📊 AUDITORÍAS - LISTADOS

### GET /api/auditorias/pendientes
Obtener auditorías pendientes (filtradas por rol)

**Query Parameters:**
- `search` (opcional): Búsqueda por apellido, nombre, DNI o médico
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Registros por página (default: 10)

**Respuesta:**
```json
{
    "success": true,
    "data": [
        {
            "id": "123",
            "apellido": "Pérez",
            "nombre": "Juan",
            "dni": "12345678",
            "fecha": "01-12-2024",
            "medico": "Dr. García MP-12345",
            "renglones": 3,
            "meses": 6,
            "auditado": null
        }
    ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
}
```

### GET /api/auditorias/historicas
Obtener auditorías ya procesadas

**Query Parameters:**
- `search` (opcional): Búsqueda en múltiples campos
- `page` (opcional): Número de página
- `limit` (opcional): Registros por página

**Respuesta:**
```json
{
    "success": true,
    "data": [
        {
            "id": "123",
            "apellido": "Pérez",
            "nombre": "Juan",
            "dni": "12345678",
            "fecha": "01-12-2024",
            "medico": "Dr. García MP-12345",
            "renglones": 3,
            "meses": 6,
            "auditado": 1,
            "auditor": "Dr. López",
            "fechaAuditoria": "15-12-2024"
        }
    ],
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
}
```

### 🩺 GET /api/auditorias/medicas
Obtener auditorías médicas pendientes (solo para médicos auditores - rol 9)

**Permisos requeridos:** Médico auditor (rol 9)

**Respuesta:**
```json
{
    "success": true,
    "data": [
        {
            "id": "123",
            "apellido": "Pérez",
            "nombre": "Juan",
            "dni": "12345678",
            "fecha": "01-12-2024",
            "medico": "Dr. García MP-12345",
            "renglones": 3,
            "meses": 6,
            "auditado": null,
            "fecha_bloqueo": "15-12-2024 14:30"
        }
    ],
    "message": "Encontradas 5 auditorías médicas pendientes"
}
```

### POST /api/auditorias/listado
Listado con filtros opcionales
```json
{
    "dni": "12345678",
    "fechaDesde": "2024-01-01",
    "fechaHasta": "2024-12-31"
}
```

### POST /api/auditorias/paciente
Historial completo de un paciente *(CORREGIDO - sin campos inexistentes)*
```json
{
    "dni": "12345678",
    "fechaDesde": "2024-01-01",
    "fechaHasta": "2024-12-31"
}
```

**Respuesta actualizada:**
```json
{
    "success": true,
    "data": [
        {
            "pac_apnom": "Pérez Juan",
            "dni": "12345678",
            "sexo": "M",
            "fecnac": "1980-01-01",
            "talla": "175",
            "peso": "80",
            "telefono": "123456789",
            "email": "juan@email.com",
            "id": "123",
            "nro_orden": 1,
            "fecha_auditoria": "15-12-2024",
            "estado_auditoria": 1,
            "medico": "Dr. García MP-12345",
            "fecha": "01-12-2024",
            "renglones": 3,
            "meses": 6,
            "auditor": "Dr. López"
        }
    ]
}
```

### POST /api/auditorias/excel
Generar reporte Excel por mes
```json
{
    "fecha": "2024-12"
}
```

---

## ⚙️ AUDITORÍAS - PROCESAMIENTO

### GET /api/auditorias/:id
Obtener datos completos para auditar (paciente, diagnóstico, medicamentos)

**Query Parameters:**
- `tipo` (opcional): 'pendiente' o 'historica' (default: 'pendiente')

**Respuesta:**
```json
{
    "success": true,
    "data": {
        "auditoria": {
            "id": "123",
            "fecha_origen": "01-12-2024",
            "fecha_auditoria": "15-12-2024",
            "renglones": 3,
            "cantmeses": 6,
            "auditado": 1,
            "nota": "Auditoría aprobada"
        },
        "paciente": {
            "apellido": "Pérez",
            "nombre": "Juan",
            "dni": "12345678",
            "sexo": "M",
            "fecha_nacimiento": "01-01-1980",
            "talla": "175",
            "peso": "80",
            "telefono": "123456789",
            "email": "juan@email.com"
        },
        "medico": {
            "nombre": "Dr. García",
            "matricula": "12345"
        },
        "auditor": "Dr. López",
        "recetas": {
            "123": {
                "idreceta": 123,
                "medicamentos": [
                    {
                        "id": 1,
                        "idmedicamento": 456,
                        "nombrecomercial": "Medicamento 456",
                        "cantidad": 2,
                        "estado": 1
                    }
                ]
            }
        },
        "tipo": "pendiente"
    }
}
```

### POST /api/auditorias/:id/procesar
Procesar auditoría (aprobar/denegar medicamentos)
```json
{
   "chequedos": "123-1,124-2,125-1",
    "nochequeados": "126-1,127-2",
    "cobert1": "70",
    "cobert2": "80",
    "cobert3": "90",
    "cobert4": "60",
    "cobert2_1": "BIAC",
    "cobert2_2": "CE",
    "cobert2_3": "ONC",
    "cobert2_4": "PAMI",
    "nota": "Auditoría procesada correctamente - Algunos medicamentos aprobados",
    "estadoIdentidad": 0,
    "enviarMedico": false
}
```
**Respuesta:**
```json

{
    "success": true,
    "message": "Auditoría procesada correctamente - Estado: OBSERVADO (REPROCESADA)",
    "data": {
        "id": "1000795",
        "estado": 3,
        "estadoTexto": "OBSERVADO",
        "medicamentosAprobados": 3,
        "medicamentosRechazados": 2,
        "nota": "Auditoría procesada correctamente - Algunos medicamentos aprobados",
        "reprocesada": true
}

```

### POST /api/auditorias/generar-excel-datos
genera excel con los datos de la lista  historial y pendientes
```json
 {
  "datos": [
    {
      "id": 1,
      "apellido": "GARCIA",
      "nombre": "JUAN", 
      "dni": "12345678",
      "fecha": "15-01-2025",
      "medico": "Dr. PEREZ CARLOS MP-1234",
      "renglones": 2,
      "meses": 6,
      "auditado": 1,
      "auditadoX": "RODRIGUEZ MARIA",
      "fecha_auditoria": "16-01-2025"
    },
    {
      "id": 2,
      "apellido": "LOPEZ",
      "nombre": "ANA",
      "dni": "87654321", 
      "fecha": "14-01-2025",
      "medico": "Dr. MARTINEZ LUIS MP-5678",
      "renglones": 1,
      "meses": 3,
      "auditado": 2,
      "auditadoX": "GONZALEZ PEDRO",
      "fecha_auditoria": "15-01-2025"
    }
  ],
  "filtros": {
    "dni": "",
    "fechaDesde": "2025-01-01", 
    "fechaHasta": "2025-01-31"
  },
  "timestamp": "2025-01-16T10:30:00.000Z"
}

```
**Respuesta:**
```json

{
    "success": true,
    "message": "excel generado con exito",
 
}

```

**Explicación de campos:**
- `chequedos`: Medicamentos aprobados (formato: "idreceta-renglon,...")
- `nochequeados`: Medicamentos rechazados
- `cobert1-4`: Porcentaje cobertura por renglón (50, 70, 100)
- `cobert2_1-4`: Tipo cobertura (BIAC, CE, DSC, HO, etc.)
- `nota`: Observaciones de la auditoría
- `estadoIdentidad`: 0=normal, 1=identidad reservada
 
```
```
### POST /api/auditorias/:id/enviar-medico
Enviar auditoría a médico auditor (bloquear para otros roles )

```json
{
    "success": true,
    "message": "Auditoría enviada a médico auditor correctamente"
}


```
### POST /auditorias/historicos-pendientes
trae un listado de todas las autorias pendientes e historicas por dni de paciente
```json
{
    "dni": "16410809",
    "fechaDesde": "2022-06-01",
    "fechaHasta": "2025-07-31"
}
```
**Respuesta:**
```json
{
    "success": true,
    {
            "id": 590580,
            "apellido": "GARRIDO",
            "nombre": "JOSE IGNACIO",
            "dni": 16410809,
            "fecha": "31-01-2025",
            "medico": "RICARDO DANIEL OLIVA MP-227793",
            "renglones": 1,
            "meses": 6,
            "auditado": 1,
            "auditadoX": "José Garrido",
            "fecha_auditoria": "31-01-2025"
        }
}

```
### POST /auditorias/896416/generar-pdf
Genera PDF autoria 
```json

```
**Respuesta:**
```json

 {
    "success": true,
    "message": "PDF generado correctamente",
    "data": {
        "nombreArchivo": "audinro896416.pdf",
        "url": "https://cpce.recetasalud.ar/audi/tmp/audinro896416.pdf",
        "medicamentosAutorizados": 0
    }
}


```

### GET /auditorias/1029264/historica
devuelve los datos para ver una autoria historica 
```json{
    "success": true,
    "data": {
        "auditoria": {
            "id": 1029264,
            "fecha_origen": "28/07/2025",
            "fecha_auditoria": "28/07/2025 00:00",
            "renglones": 1,
            "cantmeses": 4,
            "auditado": 1,
            "nota": "Revertir por error en el procesamiento",
            "estado_texto": "APROBADO"
        },
        "paciente": {
            "apellido": "Garrido",
            "nombre": "Jose ignacio",
            "dni": 16410809,
            "sexo": "M",
            "edad": 61,
            "fecha_nacimiento": "01/09/1963",
            "telefono": "21341234134",
            "email": "federiconj@gmail.com",
            "talla": 195,
            "peso": 97,
            "fecnac": "1963-09-01T03:00:00.000Z"
        },
        "medico": {
            "nombre": "Ricardo daniel Oliva",
            "matricula": 227793,
            "especialidad": ""
        },
        "obra_social": {
            "nombre": "CPCE",
            "nro_afiliado": "164108090000"
        },
        "diagnostico": {
            "principal": "TEST",
            "secundario": "TEST",
            "fecha_emision": "28/07/2025"
        },
        "auditor": "Maria lorena  Villarreal",
        "recetas": {
            "1430418": {
                "nroreceta": 1430418,
                "medicamentos": [
                    {
                        "id": "1430418-1",
                        "nro_orden": 1,
                        "nombrecomercial": "DAYAMINERAL",
                        "monodroga": "vit.+minerales",
                        "presentacion": "Filmtab comp.x 30",
                        "cantidad": 1,
                        "posologia": "1",
                        "cobertura": "0",
                        "cobertura2": "0",
                        "estado": 2,
                        "estado_texto": "RECHAZADO",
                        "observacion": "",
                        "fecha_auditoria": "29/07/2025 08:05",
                        "tipod": "0",
                        "tipo_venta": "1",
                        "condicion": 2
                    }
                ]
            },
        "estadisticas": {
            "total_medicamentos": 3,
            "medicamentos_aprobados": 0,
            "medicamentos_rechazados": 3,
            "medicamentos_observados": 0
        },
        "metadata": {
            "readonly": true,
            "tipo": "historica",
            "tabla_vademecum": "vad_020"
        }
    }
}

```

### PUT /api/auditorias/:id/revertir
Revertir auditoria cambiando el valor de la variable auditado
```json
{
    
       "nota": "Revertir por error en el procesamiento"
}
```
**Respuesta:**
```json
{
    "success": true,
    "idauditoria": "1000795",
    "mensaje": "Revertido con éxito",
    "action": "revert"
}

```
### PUT /api/auditorias/:id/borrar
Borrar auditoria cambiando el valor de la variable Estado
```json
{
    "nota": "borrar por error en el procesamiento",
    "rol":"userRole"
}
```
**Respuesta:**
```json
{
    "success": true,
    "idauditoria": "1000795",
    "mensaje": "auditoria borrada con éxito",
    "action": "delate"
}
```
### GET /api/auditorias/:id/resumen-auditoria
Trae un resumen de la auditoria antes de borrar o revertir


**Respuesta:**
```json
{
   {
    "success": true,
    "auditoria": {
        "id": 1000795,
        "idpaciente": 8181,
        "idprescriptor": 227793,
        "matricespec_prescr": 99999,
        "fecha_origen": "2025-07-16T03:00:00.000Z",
        "idobrasoc": 20,
        "cantmeses": 6,
        "renglones": 2,
        "idreceta1": 1390193,
        "idreceta2": 1390194,
        "idreceta3": 1390195,
        "idreceta4": 1390196,
        "idreceta5": 1390197,
        "idreceta6": 1390198,
        "bloqueadaxauditor": null,
        "fechahora_bloqueo": null,
        "auditado": null,
        "estado": null,
        "nota": "",
        "auditadopor": 26,
        "altocosto": null,
        "necesita_farmalink": 0,
        "ultima_modificacion": "2025-07-31T17:21:54.000Z",
        "recetas_auditadas": 0,
        "total_recetas": 12
    }
}
}
```
---


## 🔧 ROLES Y PERMISOS

| **Rol** | **Descripción** | **Permisos Especiales** |
|---------|----------------|------------------------|
| **9** | Médico auditor | Solo ve auditorías bloqueadas (`/medicas`) |
| **10** | Auditor farmacéutico | Puede enviar a médico auditor |
| **Otros** | Usuarios estándar | Acceso completo según permisos |

---

## 🎯 FLUJO TÍPICO DE USO

### **Para Auditor Farmacéutico (Rol 10):**
1. **Login** → `POST /api/auth/login`
2. **Ver pendientes** → `GET /api/auditorias/pendientes`
3. **Seleccionar auditoría** → `GET /api/auditorias/:id`
4. **Opción A: Procesar** → `POST /api/auditorias/:id/procesar`
5. **Opción B: Enviar a médico** → `POST /api/auditorias/:id/enviar-medico`

### **Para Médico Auditor (Rol 9):**
1. **Login** → `POST /api/auth/login`
2. **Ver auditorías médicas** → `GET /api/auditorias/medicas`
3. **Seleccionar auditoría** → `GET /api/auditorias/:id`
4. **Procesar** → `POST /api/auditorias/:id/procesar`

---

## 🛠️ CORRECCIONES APLICADAS (v1.1)

### **❌ Problemas Resueltos:**
- **Error SQL**: `Unknown column 'e.estado'` → Corregido a `e.estado_auditoria`
- **Campo inexistente**: `e.observacion` → Removido de consultas
- **Falta endpoint**: Agregado `/api/auditorias/medicas` para médicos auditores

### **✅ Mejoras Implementadas:**
- Paginación en endpoints de listado
- Búsqueda mejorada con múltiples campos
- Control estricto de roles
- Normalización de nombres (Primera letra mayúscula)
- Manejo mejorado de errores

---

## 📝 NOTAS IMPORTANTES

- Todos los endpoints (excepto login y health) requieren JWT token
- Los filtros por rol se aplican automáticamente
- Las auditorías bloqueadas solo pueden ser vistas por médicos auditores
- El sistema mantiene compatibilidad completa con el PHP original
- **Fechas en formato DD-MM-YYYY**
- **Paginación disponible en listados principales**

---

## 🚀 EQUIVALENCIAS PHP → API

| **Archivo PHP** | **Endpoint API** | **Estado** |
|----------------|------------------|------------|
| `validar.php` | `POST /api/auth/login` | ✅ Funcionando |
| `auditar.php` | `GET /api/auditorias/pendientes` | ✅ Corregido |
| `historico_s.php` | `GET /api/auditorias/historicas` | ✅ Corregido |
| `historialpaciente_s.php` | `POST /api/auditorias/paciente` | ✅ Corregido |
| `audi_trataprolongado.php` | `GET /api/auditorias/:id` | ✅ Funcionando |
| `audi_grabar_s.php` | `POST /api/auditorias/:id/procesar` |✅ Funcionando |
| `back_excel1.php` | `POST /api/auditorias/excel` | ✅ Funcionando |
| **NUEVO** | `GET /api/auditorias/medicas` | ✅ Agregado |

---

## 🏥 HEALTH CHECK

### GET /api/health
Verificar estado del servidor
```json
{
    "status": "OK",
    "message": "API funcionando correctamente",
    "timestamp": "2024-12-16T15:30:00.000Z"
}
```