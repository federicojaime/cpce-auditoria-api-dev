# Corrección de Emails de Proveedores

## Problema Detectado

Los emails se estaban enviando a direcciones incorrectas. Por ejemplo:a
- Se enviba a: `compras@farmaciacentral.com.ar`
- Se enviaba a: `presupuestos@drogueriadelsur.com`

Cuando el email correcto del proveedor es: `federiconj@gmail.com`

## Causa

El sistema estaba usando la columna `email_general` de la tabla `alt_proveedor`, pero esa columna puede estar vacía o tener emails institucionales genéricos.

Los emails reales de los contactos están en la tabla `alt_contacto_proveedor`.

## Solución Implementada

Se modificó el controlador para usar un `LEFT JOIN` con la tabla `alt_contacto_proveedor` y obtener el email del contacto principal:

```sql
SELECT
    p.id_proveedor as id,
    p.razon_social as nombre,
    COALESCE(c.email, p.email_general) as email,  -- Primero intenta contacto, luego email_general
    COALESCE(c.telefono, p.telefono_general) as telefono
FROM alt_proveedor p
LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor AND c.principal = 1
WHERE p.id_proveedor IN (?)
```

### Explicación de COALESCE:

`COALESCE(c.email, p.email_general)` significa:
1. Primero intenta usar `c.email` (email del contacto principal)
2. Si es NULL, usa `p.email_general` (email general del proveedor)
3. Así aseguramos que siempre haya un email

## Archivos Modificados

- ✅ `controllers/presupuestoTokenController.js`
  - Función `crearSolicitudPresupuesto()` - línea 104-114
  - Función `obtenerSolicitudPorToken()` - línea 198-217
  - Función `responderSolicitud()` - línea 345-360
  - Función `obtenerDetalleSolicitud()` - línea 601-616

## Cómo Verificar que Está Funcionando

### 1. Ver qué email se usará para cada proveedor:

```sql
SELECT
    p.id_proveedor,
    p.razon_social,
    p.email_general as email_tabla_proveedor,
    c.email as email_contacto_principal,
    COALESCE(c.email, p.email_general) as email_que_se_usara
FROM alt_proveedor p
LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor AND c.principal = 1;
```

### 2. Ver contactos de un proveedor específico:

```sql
SELECT
    id_contacto,
    nombre,
    apellido,
    email,
    telefono,
    cargo,
    principal
FROM alt_contacto_proveedor
WHERE id_proveedor = 1;  -- Cambiar por el ID del proveedor
```

### 3. Marcar un contacto como principal:

Si un proveedor no tiene contacto principal, puedes marcarlo así:

```sql
-- Primero, quitar el principal de todos los contactos del proveedor
UPDATE alt_contacto_proveedor
SET principal = 0
WHERE id_proveedor = 1;

-- Luego, marcar uno como principal
UPDATE alt_contacto_proveedor
SET principal = 1
WHERE id_contacto = 123;  -- ID del contacto que quieres que sea principal
```

## Resultado

Ahora los emails se enviarán correctamente a:
- ✅ Email del contacto principal (si existe y `principal = 1`)
- ✅ Email general del proveedor (si no hay contacto principal)

## Prueba

Después de esta corrección, al crear una nueva solicitud:

```bash
curl -X POST http://localhost:3000/api/presupuestos/solicitar-con-email \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auditoriaIds": [1],
    "proveedorIds": [1, 2, 3],
    "observaciones": "Test con emails correctos"
  }'
```

Los emails deberían enviarse a las direcciones correctas (las del contacto principal).

---

**Fecha de corrección:** 20 de Octubre 2025
**Impacto:** Los emails ahora llegarán a las personas correctas
