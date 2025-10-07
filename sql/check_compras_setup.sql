-- Script de verificación para el módulo de Compras y Presupuestos
-- Ejecutar en MySQL para verificar si las tablas existen y están correctamente configuradas

-- ========================================
-- 1. VERIFICAR SI EXISTEN LAS TABLAS
-- ========================================

SELECT 'Verificando existencia de tablas del módulo de compras...' as Estado;

SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME,
    TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'alt_solicitud_presupuesto',
    'alt_solicitud_presupuesto_auditoria',
    'alt_solicitud_presupuesto_proveedor',
    'alt_presupuesto_respuesta',
    'alt_orden_compra',
    'alt_orden_compra_detalle',
    'alt_orden_compra_historial',
    'alt_notificacion_paciente'
  );

-- Si esta consulta devuelve menos de 8 filas, faltan tablas

-- ========================================
-- 2. VERIFICAR ESTRUCTURA DE TABLAS
-- ========================================

-- Solicitudes de Presupuesto
SELECT 'Verificando estructura de alt_solicitud_presupuesto...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_solicitud_presupuesto'
ORDER BY ORDINAL_POSITION;

-- Relación Solicitud-Auditoría
SELECT 'Verificando estructura de alt_solicitud_presupuesto_auditoria...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_solicitud_presupuesto_auditoria'
ORDER BY ORDINAL_POSITION;

-- Relación Solicitud-Proveedor
SELECT 'Verificando estructura de alt_solicitud_presupuesto_proveedor...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_solicitud_presupuesto_proveedor'
ORDER BY ORDINAL_POSITION;

-- Respuestas de Presupuesto
SELECT 'Verificando estructura de alt_presupuesto_respuesta...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_presupuesto_respuesta'
ORDER BY ORDINAL_POSITION;

-- Órdenes de Compra
SELECT 'Verificando estructura de alt_orden_compra...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_orden_compra'
ORDER BY ORDINAL_POSITION;

-- Detalle de Órdenes
SELECT 'Verificando estructura de alt_orden_compra_detalle...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_orden_compra_detalle'
ORDER BY ORDINAL_POSITION;

-- Historial de Órdenes
SELECT 'Verificando estructura de alt_orden_compra_historial...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_orden_compra_historial'
ORDER BY ORDINAL_POSITION;

-- Notificaciones a Pacientes
SELECT 'Verificando estructura de alt_notificacion_paciente...' as Estado;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_notificacion_paciente'
ORDER BY ORDINAL_POSITION;

-- ========================================
-- 3. VERIFICAR FOREIGN KEYS
-- ========================================

SELECT 'Verificando claves foráneas...' as Estado;

SELECT
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'alt_solicitud_presupuesto_auditoria',
    'alt_solicitud_presupuesto_proveedor',
    'alt_presupuesto_respuesta',
    'alt_orden_compra',
    'alt_orden_compra_detalle',
    'alt_orden_compra_historial',
    'alt_notificacion_paciente'
  )
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- ========================================
-- 4. VERIFICAR ÍNDICES
-- ========================================

SELECT 'Verificando índices...' as Estado;

SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'alt_solicitud_presupuesto',
    'alt_solicitud_presupuesto_auditoria',
    'alt_solicitud_presupuesto_proveedor',
    'alt_presupuesto_respuesta',
    'alt_orden_compra',
    'alt_orden_compra_detalle',
    'alt_orden_compra_historial',
    'alt_notificacion_paciente'
  )
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ========================================
-- 5. CONTAR REGISTROS
-- ========================================

SELECT 'Contando registros existentes...' as Estado;

-- Solo ejecutar si las tablas existen
SELECT
    'Solicitudes' as Tipo,
    COUNT(*) as Total,
    SUM(CASE WHEN estado = 'ENVIADO' THEN 1 ELSE 0 END) as Enviadas,
    SUM(CASE WHEN estado = 'ADJUDICADO' THEN 1 ELSE 0 END) as Adjudicadas
FROM alt_solicitud_presupuesto
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_solicitud_presupuesto')

UNION ALL

SELECT
    'Órdenes de Compra' as Tipo,
    COUNT(*) as Total,
    SUM(CASE WHEN estado = 'ENTREGADO' THEN 1 ELSE 0 END) as Entregadas,
    SUM(CASE WHEN notificacion_enviada = 1 THEN 1 ELSE 0 END) as Notificadas
FROM alt_orden_compra
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_orden_compra')

UNION ALL

SELECT
    'Notificaciones' as Tipo,
    COUNT(*) as Total,
    SUM(CASE WHEN email_enviado = 1 THEN 1 ELSE 0 END) as Emails_Enviados,
    SUM(CASE WHEN sms_enviado = 1 THEN 1 ELSE 0 END) as SMS_Enviados
FROM alt_notificacion_paciente
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_notificacion_paciente');

-- ========================================
-- 6. VERIFICAR INTEGRIDAD DE DATOS
-- ========================================

SELECT 'Verificando integridad de datos...' as Estado;

-- Solicitudes sin auditorías
SELECT
    'Solicitudes sin auditorías' as Problema,
    COUNT(*) as Cantidad
FROM alt_solicitud_presupuesto sp
WHERE NOT EXISTS (
    SELECT 1 FROM alt_solicitud_presupuesto_auditoria spa
    WHERE spa.id_solicitud = sp.id_solicitud
)
AND EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_solicitud_presupuesto')

UNION ALL

-- Órdenes sin detalles
SELECT
    'Órdenes sin detalles' as Problema,
    COUNT(*) as Cantidad
FROM alt_orden_compra oc
WHERE NOT EXISTS (
    SELECT 1 FROM alt_orden_compra_detalle ocd
    WHERE ocd.id_orden = oc.id_orden
)
AND EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_orden_compra')

UNION ALL

-- Órdenes entregadas sin notificación
SELECT
    'Órdenes entregadas sin notificar' as Problema,
    COUNT(*) as Cantidad
FROM alt_orden_compra
WHERE estado = 'ENTREGADO' AND notificacion_enviada = 0
AND EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alt_orden_compra');

-- ========================================
-- RESUMEN DE VERIFICACIÓN
-- ========================================

SELECT '===========================================' as '';
SELECT 'RESUMEN DE VERIFICACIÓN - MÓDULO DE COMPRAS' as '';
SELECT '===========================================' as '';

SELECT
    CASE
        WHEN COUNT(*) = 8 THEN '✅ TODAS LAS TABLAS EXISTEN'
        WHEN COUNT(*) > 0 THEN CONCAT('⚠️ FALTAN ', 8 - COUNT(*), ' TABLAS')
        ELSE '❌ NINGUNA TABLA EXISTE - Ejecutar script de creación'
    END as Estado_Tablas,
    COUNT(*) as Tablas_Encontradas,
    8 as Tablas_Esperadas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'alt_solicitud_presupuesto',
    'alt_solicitud_presupuesto_auditoria',
    'alt_solicitud_presupuesto_proveedor',
    'alt_presupuesto_respuesta',
    'alt_orden_compra',
    'alt_orden_compra_detalle',
    'alt_orden_compra_historial',
    'alt_notificacion_paciente'
  );

-- Si las tablas NO existen o están incompletas, ejecutar el siguiente script:
-- Ver archivo: sql/create_compras_tables.sql
