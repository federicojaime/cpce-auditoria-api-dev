-- Script para verificar los emails de los proveedores

-- 1. Ver todos los proveedores con sus emails
SELECT
    p.id_proveedor,
    p.razon_social,
    p.email_general as email_proveedor,
    c.email as email_contacto_principal,
    c.principal,
    COALESCE(c.email, p.email_general) as email_que_se_usara
FROM alt_proveedor p
LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor AND c.principal = 1
ORDER BY p.id_proveedor;

-- 2. Ver TODOS los contactos de cada proveedor (no solo principales)
SELECT
    p.razon_social,
    c.nombre,
    c.apellido,
    c.email,
    c.principal,
    c.cargo
FROM alt_proveedor p
LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor
ORDER BY p.id_proveedor, c.principal DESC;

-- 3. Proveedores SIN contacto principal
SELECT
    p.id_proveedor,
    p.razon_social,
    p.email_general,
    COUNT(c.id_contacto) as total_contactos,
    SUM(CASE WHEN c.principal = 1 THEN 1 ELSE 0 END) as contactos_principales
FROM alt_proveedor p
LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor
GROUP BY p.id_proveedor
HAVING contactos_principales = 0;

-- 4. Si quieres marcar UN contacto como principal para un proveedor específico:
-- (Descomenta y cambia los IDs)
/*
-- Primero quitar todos los principales de ese proveedor
UPDATE alt_contacto_proveedor
SET principal = 0
WHERE id_proveedor = 1;  -- CAMBIAR POR EL ID DEL PROVEEDOR

-- Luego marcar uno como principal
UPDATE alt_contacto_proveedor
SET principal = 1
WHERE id_contacto = 123;  -- CAMBIAR POR EL ID DEL CONTACTO QUE QUIERES
*/
