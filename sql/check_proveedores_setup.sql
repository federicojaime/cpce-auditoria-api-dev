-- Script de verificación para la estructura de Proveedores y Contactos
-- Ejecutar en MySQL para verificar si las tablas existen y están correctamente configuradas

-- ========================================
-- 1. VERIFICAR SI EXISTEN LAS TABLAS
-- ========================================

SELECT
    'Verificando existencia de tablas...' as Estado;

SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME,
    TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('alt_proveedor', 'alt_contacto_proveedor');

-- Si esta consulta devuelve 0 filas, las tablas NO existen

-- ========================================
-- 2. VERIFICAR ESTRUCTURA DE alt_proveedor
-- ========================================

SELECT
    'Verificando estructura de alt_proveedor...' as Estado;

SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY,
    EXTRA,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'alt_proveedor'
ORDER BY ORDINAL_POSITION;

-- ========================================
-- 3. VERIFICAR ESTRUCTURA DE alt_contacto_proveedor
-- ========================================

SELECT
    'Verificando estructura de alt_contacto_proveedor...' as Estado;

SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY,
    EXTRA,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'alt_contacto_proveedor'
ORDER BY ORDINAL_POSITION;

-- ========================================
-- 4. VERIFICAR ÍNDICES
-- ========================================

SELECT
    'Verificando índices...' as Estado;

SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('alt_proveedor', 'alt_contacto_proveedor')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ========================================
-- 5. VERIFICAR FOREIGN KEYS
-- ========================================

SELECT
    'Verificando claves foráneas...' as Estado;

SELECT
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('alt_proveedor', 'alt_contacto_proveedor')
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ========================================
-- 6. CONTAR REGISTROS
-- ========================================

SELECT
    'Contando registros existentes...' as Estado;

SELECT
    'alt_proveedor' as Tabla,
    COUNT(*) as Total_Registros,
    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as Activos,
    SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as Inactivos
FROM alt_proveedor
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_proveedor')
UNION ALL
SELECT
    'alt_contacto_proveedor' as Tabla,
    COUNT(*) as Total_Registros,
    SUM(CASE WHEN principal = 1 THEN 1 ELSE 0 END) as Principales,
    COUNT(*) - SUM(CASE WHEN principal = 1 THEN 1 ELSE 0 END) as Secundarios
FROM alt_contacto_proveedor
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_contacto_proveedor');

-- ========================================
-- RESUMEN DE VERIFICACIÓN
-- ========================================

SELECT '===========================================' as '';
SELECT 'RESUMEN DE VERIFICACIÓN' as '';
SELECT '===========================================' as '';

SELECT
    CASE
        WHEN COUNT(*) = 2 THEN '✅ TODAS LAS TABLAS EXISTEN'
        ELSE '❌ FALTAN TABLAS - Ejecutar script de creación'
    END as Estado_Tablas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('alt_proveedor', 'alt_contacto_proveedor');

-- Si las tablas NO existen, ejecutar el siguiente script:
-- Ver archivo: sql/create_proveedores_tables.sql
