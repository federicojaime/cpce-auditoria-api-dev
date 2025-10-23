# Ejemplos de Uso de API - Sistema de Presupuestos

## Colección de Ejemplos con cURL y Postman

---

## 1. CREAR SOLICITUD DE PRESUPUESTO (Usuario Interno)

### cURL

\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/solicitar-con-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "auditoriaIds": [17, 18],
    "proveedorIds": [1, 2, 3],
    "observaciones": "Solicitud urgente para medicamentos de alto costo"
  }'
\`\`\`

### Respuesta Esperada

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
      "email": "contacto@drogueriadelsud.com",
      "enviado": true,
      "error": null
    },
    {
      "proveedor": "Droguería Mario Luna",
      "email": "marioluna@gmail.com",
      "enviado": true,
      "error": null
    }
  ]
}
\`\`\`

---

## 2. OBTENER SOLICITUD POR TOKEN (Proveedor - Público)

### cURL

\`\`\`bash
curl -X GET http://localhost:3000/api/presupuestos/solicitud/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
\`\`\`

### Respuesta Esperada

\`\`\`json
{
  "solicitud": {
    "loteNumero": "LOTE-20251020-0001",
    "fechaEnvio": "2025-10-20T10:00:00.000Z",
    "fechaExpiracion": "2025-10-23T10:00:00.000Z",
    "observaciones": "Solicitud urgente para medicamentos de alto costo",
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
          "presentacion": "500mg comprimidos",
          "cantidad": 2
        },
        {
          "id": 2,
          "nombre": "Ibuprofeno",
          "presentacion": "600mg comprimidos",
          "cantidad": 1
        }
      ]
    },
    {
      "id": 18,
      "paciente_nombre": "Perez, Juan",
      "paciente_dni": "12345678",
      "medicamentos": [
        {
          "id": 3,
          "nombre": "Amoxicilina",
          "presentacion": "500mg cápsulas",
          "cantidad": 3
        }
      ]
    }
  ],
  "solicitudProveedorId": 1
}
\`\`\`

---

## 3. RESPONDER SOLICITUD (Proveedor - Público)

### cURL - Ejemplo 1: Acepta todos

\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/responder/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6 \
  -H "Content-Type: application/json" \
  -d '{
    "respuestas": [
      {
        "auditoriaId": 17,
        "medicamentoId": 1,
        "acepta": true,
        "precio": 1500.50,
        "fechaRetiro": "2025-10-25",
        "fechaVencimiento": "2026-12-31",
        "comentarios": "Stock disponible, entrega inmediata"
      },
      {
        "auditoriaId": 17,
        "medicamentoId": 2,
        "acepta": true,
        "precio": 850.00,
        "fechaRetiro": "2025-10-25",
        "fechaVencimiento": "2026-11-30",
        "comentarios": "Disponible"
      },
      {
        "auditoriaId": 18,
        "medicamentoId": 3,
        "acepta": true,
        "precio": 2200.00,
        "fechaRetiro": "2025-10-26",
        "fechaVencimiento": "2027-01-15",
        "comentarios": "Disponible para entrega mañana"
      }
    ]
  }'
\`\`\`

### cURL - Ejemplo 2: Acepta algunos, rechaza otros

\`\`\`bash
curl -X POST http://localhost:3000/api/presupuestos/responder/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6 \
  -H "Content-Type: application/json" \
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
      },
      {
        "auditoriaId": 17,
        "medicamentoId": 2,
        "acepta": false,
        "comentarios": "No disponible en stock actualmente"
      },
      {
        "auditoriaId": 18,
        "medicamentoId": 3,
        "acepta": true,
        "precio": 2200.00,
        "fechaRetiro": "2025-10-26",
        "fechaVencimiento": "2027-01-15",
        "comentarios": null
      }
    ]
  }'
\`\`\`

### Respuesta Esperada

\`\`\`json
{
  "mensaje": "Respuesta enviada exitosamente",
  "loteNumero": "LOTE-20251020-0001",
  "proveedor": "Droguería Alta Luna S.R.L.s",
  "respuestasEnviadas": 3
}
\`\`\`

---

## 4. LISTAR SOLICITUDES (Usuario Interno)

### cURL - Sin filtros

\`\`\`bash
curl -X GET http://localhost:3000/api/presupuestos/solicitudes-email \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
\`\`\`

### cURL - Con filtros

\`\`\`bash
curl -X GET "http://localhost:3000/api/presupuestos/solicitudes-email?estado=en_proceso&page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
\`\`\`

### Respuesta Esperada

\`\`\`json
{
  "solicitudes": [
    {
      "id": 1,
      "lote_numero": "LOTE-20251020-0001",
      "fecha_envio": "2025-10-20T10:00:00.000Z",
      "estado": "en_proceso",
      "observaciones": "Solicitud urgente para medicamentos de alto costo",
      "usuario_envia_nombre": "Juan Pérez",
      "total_auditorias": 2,
      "total_proveedores": 3,
      "respuestas_recibidas": 2
    },
    {
      "id": 2,
      "lote_numero": "LOTE-20251019-0042",
      "fecha_envio": "2025-10-19T15:30:00.000Z",
      "estado": "pendiente",
      "observaciones": null,
      "usuario_envia_nombre": "María García",
      "total_auditorias": 1,
      "total_proveedores": 2,
      "respuestas_recibidas": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
\`\`\`

---

## 5. OBTENER DETALLES DE SOLICITUD (Usuario Interno)

### cURL

\`\`\`bash
curl -X GET http://localhost:3000/api/presupuestos/solicitudes-email/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
\`\`\`

### Respuesta Esperada

\`\`\`json
{
  "solicitud": {
    "id": 1,
    "lote_numero": "LOTE-20251020-0001",
    "fecha_envio": "2025-10-20T10:00:00.000Z",
    "estado": "en_proceso",
    "observaciones": "Solicitud urgente para medicamentos de alto costo",
    "usuario_envia_nombre": "Juan Pérez",
    "usuario_envia_email": "juan.perez@example.com"
  },
  "auditorias": [
    {
      "id": 17,
      "paciente_nombre": "Jaime, Federico",
      "paciente_dni": "38437748"
    },
    {
      "id": 18,
      "paciente_nombre": "Perez, Juan",
      "paciente_dni": "12345678"
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
          "comentarios": "Stock disponible, entrega inmediata",
          "fecha_respuesta": "2025-10-21T14:30:00.000Z",
          "medicamento_nombre": "Paracetamol",
          "medicamento_presentacion": "500mg comprimidos"
        },
        {
          "auditoria_id": 17,
          "medicamento_id": 2,
          "acepta": false,
          "precio": null,
          "fecha_retiro": null,
          "fecha_vencimiento": null,
          "comentarios": "No disponible en stock",
          "fecha_respuesta": "2025-10-21T14:30:00.000Z",
          "medicamento_nombre": "Ibuprofeno",
          "medicamento_presentacion": "600mg comprimidos"
        }
      ]
    },
    {
      "solicitud_proveedor_id": 2,
      "estado": "respondido",
      "fecha_expiracion": "2025-10-23T10:00:00.000Z",
      "fecha_respuesta": "2025-10-21T16:00:00.000Z",
      "proveedor_id": 2,
      "proveedor_nombre": "Droguería del Sud S.R.L.s",
      "proveedor_email": "contacto@drogueriadelsud.com",
      "proveedor_telefono": "02657000000",
      "respuestas": [
        {
          "auditoria_id": 17,
          "medicamento_id": 1,
          "acepta": true,
          "precio": "1450.00",
          "fecha_retiro": "2025-10-26",
          "fecha_vencimiento": "2027-01-15",
          "comentarios": "Disponible",
          "fecha_respuesta": "2025-10-21T16:00:00.000Z",
          "medicamento_nombre": "Paracetamol",
          "medicamento_presentacion": "500mg comprimidos"
        }
      ]
    },
    {
      "solicitud_proveedor_id": 3,
      "estado": "pendiente",
      "fecha_expiracion": "2025-10-23T10:00:00.000Z",
      "fecha_respuesta": null,
      "proveedor_id": 3,
      "proveedor_nombre": "Droguería Mario Luna",
      "proveedor_email": "marioluna@gmail.com",
      "proveedor_telefono": null,
      "respuestas": []
    }
  ]
}
\`\`\`

---

## 6. COMPARAR PRESUPUESTOS (Usuario Interno)

### cURL

\`\`\`bash
curl -X GET http://localhost:3000/api/presupuestos/comparar/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
\`\`\`

### Respuesta Esperada

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
        "presentacion": "500mg comprimidos"
      },
      "ofertas": [
        {
          "proveedor_id": 1,
          "proveedor_nombre": "Droguería Alta Luna S.R.L.s",
          "acepta": true,
          "precio": "1500.50",
          "fecha_retiro": "2025-10-25",
          "fecha_vencimiento": "2026-12-31",
          "comentarios": "Stock disponible, entrega inmediata"
        },
        {
          "proveedor_id": 2,
          "proveedor_nombre": "Droguería del Sud S.R.L.s",
          "acepta": true,
          "precio": "1450.00",
          "fecha_retiro": "2025-10-26",
          "fecha_vencimiento": "2027-01-15",
          "comentarios": "Disponible"
        }
      ],
      "mejorOferta": {
        "proveedor_id": 2,
        "proveedor_nombre": "Droguería del Sud S.R.L.s",
        "acepta": true,
        "precio": "1450.00",
        "fecha_retiro": "2025-10-26",
        "fecha_vencimiento": "2027-01-15",
        "comentarios": "Disponible"
      },
      "totalOfertas": 2,
      "ofertasAceptadas": 2
    },
    {
      "auditoria": {
        "id": 17,
        "paciente_nombre": "Jaime, Federico",
        "paciente_dni": "38437748"
      },
      "medicamento": {
        "id": 2,
        "nombre": "Ibuprofeno",
        "presentacion": "600mg comprimidos"
      },
      "ofertas": [
        {
          "proveedor_id": 1,
          "proveedor_nombre": "Droguería Alta Luna S.R.L.s",
          "acepta": false,
          "precio": null,
          "fecha_retiro": null,
          "fecha_vencimiento": null,
          "comentarios": "No disponible en stock"
        }
      ],
      "mejorOferta": null,
      "totalOfertas": 1,
      "ofertasAceptadas": 0
    }
  ]
}
\`\`\`

---

## Colección Postman

### Importar en Postman

Crea una nueva colección en Postman con los siguientes requests:

#### Variables de Colección
- `base_url`: `http://localhost:3000/api`
- `token_jwt`: Tu token JWT
- `token_proveedor`: Token del proveedor (obtenido del email)

#### Request 1: Crear Solicitud
- **Method:** POST
- **URL:** `{{base_url}}/presupuestos/solicitar-con-email`
- **Headers:**
  - `Authorization`: `Bearer {{token_jwt}}`
  - `Content-Type`: `application/json`
- **Body (raw JSON):**
\`\`\`json
{
  "auditoriaIds": [17, 18],
  "proveedorIds": [1, 2, 3],
  "observaciones": "Solicitud urgente"
}
\`\`\`

#### Request 2: Ver Solicitud (Proveedor)
- **Method:** GET
- **URL:** `{{base_url}}/presupuestos/solicitud/{{token_proveedor}}`

#### Request 3: Responder Solicitud (Proveedor)
- **Method:** POST
- **URL:** `{{base_url}}/presupuestos/responder/{{token_proveedor}}`
- **Headers:**
  - `Content-Type`: `application/json`
- **Body (raw JSON):**
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
      "comentarios": "Disponible"
    }
  ]
}
\`\`\`

#### Request 4: Listar Solicitudes
- **Method:** GET
- **URL:** `{{base_url}}/presupuestos/solicitudes-email`
- **Headers:**
  - `Authorization`: `Bearer {{token_jwt}}`

#### Request 5: Detalles de Solicitud
- **Method:** GET
- **URL:** `{{base_url}}/presupuestos/solicitudes-email/1`
- **Headers:**
  - `Authorization`: `Bearer {{token_jwt}}`

#### Request 6: Comparar Presupuestos
- **Method:** GET
- **URL:** `{{base_url}}/presupuestos/comparar/1`
- **Headers:**
  - `Authorization`: `Bearer {{token_jwt}}`

---

## Errores Comunes y Soluciones

### Error 404 - Token no válido
\`\`\`json
{
  "error": "Solicitud no encontrada o token inválido"
}
\`\`\`
**Solución:** Verificar que el token es correcto y existe en la base de datos.

### Error 410 - Solicitud expirada
\`\`\`json
{
  "error": "Esta solicitud ha expirado",
  "fechaExpiracion": "2025-10-23T10:00:00.000Z"
}
\`\`\`
**Solución:** La solicitud expiró. Contactar con CPCE para una nueva solicitud.

### Error 400 - Ya respondió
\`\`\`json
{
  "error": "Ya ha respondido a esta solicitud",
  "fechaRespuesta": "2025-10-21T14:30:00.000Z"
}
\`\`\`
**Solución:** No se puede modificar la respuesta. Contactar con CPCE si necesita cambios.

### Error 400 - Campos faltantes
\`\`\`json
{
  "error": "Si acepta la solicitud debe proporcionar precio, fechaRetiro y fechaVencimiento"
}
\`\`\`
**Solución:** Completar todos los campos obligatorios cuando acepta=true.

---

## Scripts de Testing Automático

### Bash script para testing completo

\`\`\`bash
#!/bin/bash

API_URL="http://localhost:3000/api"
JWT_TOKEN="TU_TOKEN_JWT"

echo "=== Testing Sistema de Presupuestos ==="
echo ""

# 1. Crear solicitud
echo "1. Creando solicitud..."
RESPONSE=$(curl -s -X POST "$API_URL/presupuestos/solicitar-con-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "auditoriaIds": [17],
    "proveedorIds": [1],
    "observaciones": "Test"
  }')

echo "$RESPONSE"
LOTE=$(echo "$RESPONSE" | jq -r '.loteNumero')
echo "Lote creado: $LOTE"
echo ""

# 2. Listar solicitudes
echo "2. Listando solicitudes..."
curl -s -X GET "$API_URL/presupuestos/solicitudes-email" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq .
echo ""

# 3. Ver detalles
echo "3. Viendo detalles de solicitud..."
curl -s -X GET "$API_URL/presupuestos/solicitudes-email/1" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq .
echo ""

echo "=== Testing completado ==="
\`\`\`

---

**Nota:** Reemplaza `TU_TOKEN_JWT` con tu token real de autenticación.
