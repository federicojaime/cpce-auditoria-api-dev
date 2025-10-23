-- ============================================================================
-- MIGRACIÓN COMPLETA Y SEGURA: Estructura de Compras de Alto Costo
-- ============================================================================
-- Fecha: 2025-10-22
-- Descripción: Reorganiza la estructura de compras para mantener relaciones correctas
--              Esta versión es IDEMPOTENTE - se puede ejecutar múltiples veces sin errores
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 0: Eliminar índices y constraints que podrían existir
-- ----------------------------------------------------------------------------

-- Eliminar índices si existen (para poder recrearlos)
DROP INDEX IF EXISTS `idx_proveedor` ON `rec_compras_alto_costo`;
DROP INDEX IF EXISTS `idx_solicitud` ON `rec_compras_alto_costo`;
DROP INDEX IF EXISTS `idx_estado` ON `rec_compras_alto_costo`;
DROP INDEX IF EXISTS `idx_fecha_entrega` ON `rec_compras_alto_costo`;

-- Eliminar foreign keys si existen (MySQL requiere nombre exacto)
SET @dbname = DATABASE();
SET @tablename = "rec_compras_alto_costo";
SET @fk1 = "fk_compra_proveedor";
SET @fk2 = "fk_compra_solicitud";
SET @fk3 = "fk_compra_receta";

SELECT COUNT(*) INTO @exist FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = @tablename AND CONSTRAINT_NAME = @fk1 AND CONSTRAINT_TYPE = 'FOREIGN KEY';
SET @sqlstmt = IF(@exist > 0, CONCAT('ALTER TABLE ', @tablename, ' DROP FOREIGN KEY ', @fk1), 'SELECT ''FK no existe''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;

SELECT COUNT(*) INTO @exist FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = @tablename AND CONSTRAINT_NAME = @fk2 AND CONSTRAINT_TYPE = 'FOREIGN KEY';
SET @sqlstmt = IF(@exist > 0, CONCAT('ALTER TABLE ', @tablename, ' DROP FOREIGN KEY ', @fk2), 'SELECT ''FK no existe''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;

SELECT COUNT(*) INTO @exist FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = @tablename AND CONSTRAINT_NAME = @fk3 AND CONSTRAINT_TYPE = 'FOREIGN KEY';
SET @sqlstmt = IF(@exist > 0, CONCAT('ALTER TABLE ', @tablename, ' DROP FOREIGN KEY ', @fk3), 'SELECT ''FK no existe''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;

-- ----------------------------------------------------------------------------
-- PASO 1: Agregar campos faltantes a rec_compras_alto_costo (si no existen)
-- ----------------------------------------------------------------------------

-- Agregar id_proveedor si no existe
SET @dbname = DATABASE();
SET @tablename = 'rec_compras_alto_costo';
SET @columnname = 'id_proveedor';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column id_proveedor already exists' AS msg;",
  "ALTER TABLE `rec_compras_alto_costo` ADD COLUMN `id_proveedor` int(11) DEFAULT NULL COMMENT 'FK al proveedor adjudicado' AFTER `idreceta`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar id_solicitud_presupuesto si no existe
SET @columnname = 'id_solicitud_presupuesto';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column id_solicitud_presupuesto already exists' AS msg;",
  "ALTER TABLE `rec_compras_alto_costo` ADD COLUMN `id_solicitud_presupuesto` int(11) DEFAULT NULL COMMENT 'FK a la solicitud de presupuesto original' AFTER `id_proveedor`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar monto_total si no existe
SET @columnname = 'monto_total';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column monto_total already exists' AS msg;",
  "ALTER TABLE `rec_compras_alto_costo` ADD COLUMN `monto_total` decimal(15,2) DEFAULT 0.00 COMMENT 'Monto total de la orden de compra' AFTER `id_solicitud_presupuesto`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar fecha_estimada_entrega si no existe
SET @columnname = 'fecha_estimada_entrega';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column fecha_estimada_entrega already exists' AS msg;",
  "ALTER TABLE `rec_compras_alto_costo` ADD COLUMN `fecha_estimada_entrega` datetime DEFAULT NULL COMMENT 'Fecha estimada de entrega del proveedor' AFTER `fecha_envio_proveedores`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar fecha_entrega_real si no existe
SET @columnname = 'fecha_entrega_real';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column fecha_entrega_real already exists' AS msg;",
  "ALTER TABLE `rec_compras_alto_costo` ADD COLUMN `fecha_entrega_real` datetime DEFAULT NULL COMMENT 'Fecha real de entrega de medicamentos' AFTER `fecha_estimada_entrega`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar lugar_retiro si no existe
SET @columnname = 'lugar_retiro';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column lugar_retiro already exists' AS msg;",
  "ALTER TABLE `rec_compras_alto_costo` ADD COLUMN `lugar_retiro` varchar(255) DEFAULT NULL COMMENT 'Lugar donde se retiran los medicamentos' AFTER `fecha_entrega_real`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar usuario_adjudico si no existe
SET @columnname = 'usuario_adjudico';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column usuario_adjudico already exists' AS msg;",
  "ALTER TABLE `rec_compras_alto_costo` ADD COLUMN `usuario_adjudico` int(11) DEFAULT NULL COMMENT 'Usuario que adjudicó el presupuesto' AFTER `id_usuario_compras`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ----------------------------------------------------------------------------
-- PASO 2: Actualizar el ENUM de estado_compra para reflejar mejor el flujo
-- ----------------------------------------------------------------------------

ALTER TABLE `rec_compras_alto_costo`
MODIFY COLUMN `estado_compra` enum(
    'pendiente_envio',
    'enviado_proveedores',
    'con_presupuestos',
    'adjudicado',          -- NUEVO: Cuando se adjudica a un proveedor
    'confirmado',          -- NUEVO: Cuando el proveedor confirma
    'en_preparacion',      -- NUEVO: Proveedor está preparando el pedido
    'listo_retiro',        -- NUEVO: Listo para retirar
    'entregado',           -- NUEVO: Ya fue entregado/retirado
    'cancelado',           -- NUEVO: Orden cancelada
    'finalizado'
) DEFAULT 'pendiente_envio' COMMENT 'Estado actual de la orden de compra';

-- ----------------------------------------------------------------------------
-- PASO 3: Crear índices para mejorar performance
-- ----------------------------------------------------------------------------

CREATE INDEX `idx_proveedor` ON `rec_compras_alto_costo` (`id_proveedor`);
CREATE INDEX `idx_solicitud` ON `rec_compras_alto_costo` (`id_solicitud_presupuesto`);
CREATE INDEX `idx_estado` ON `rec_compras_alto_costo` (`estado_compra`);
CREATE INDEX `idx_fecha_entrega` ON `rec_compras_alto_costo` (`fecha_estimada_entrega`);

-- ----------------------------------------------------------------------------
-- PASO 4: Crear tabla de DETALLE de compras (si no existe)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rec_compras_alto_costo_detalle` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_compra` int(11) NOT NULL COMMENT 'FK a rec_compras_alto_costo.id',
  `id_medicamento` int(11) NOT NULL COMMENT 'FK al medicamento (rec_prescrmedicamento_alto_costo.idmedicamento)',
  `codigo_medicamento` varchar(50) DEFAULT NULL COMMENT 'Código del medicamento del vademécum',
  `nombre_medicamento` varchar(255) DEFAULT NULL COMMENT 'Nombre comercial (snapshot)',
  `presentacion` varchar(255) DEFAULT NULL COMMENT 'Presentación (snapshot)',
  `cantidad` int(11) NOT NULL COMMENT 'Cantidad solicitada',
  `precio_unitario` decimal(10,2) NOT NULL COMMENT 'Precio unitario adjudicado',
  `precio_total` decimal(10,2) NOT NULL COMMENT 'Precio total (cantidad × precio_unitario)',
  `fecha_vencimiento` date DEFAULT NULL COMMENT 'Fecha de vencimiento del medicamento',
  `lote_medicamento` varchar(100) DEFAULT NULL COMMENT 'Número de lote del medicamento entregado',
  `observaciones` text DEFAULT NULL COMMENT 'Observaciones específicas del medicamento',
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_compra` (`id_compra`),
  KEY `idx_medicamento` (`id_medicamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detalle de medicamentos por orden de compra';

-- ----------------------------------------------------------------------------
-- PASO 5: Agregar foreign keys para mantener integridad referencial
-- ----------------------------------------------------------------------------

-- FK hacia alt_proveedor
ALTER TABLE `rec_compras_alto_costo`
ADD CONSTRAINT `fk_compra_proveedor`
FOREIGN KEY (`id_proveedor`)
REFERENCES `alt_proveedor` (`id_proveedor`)
ON DELETE SET NULL;

-- FK hacia alt_solicitud_presupuesto
ALTER TABLE `rec_compras_alto_costo`
ADD CONSTRAINT `fk_compra_solicitud`
FOREIGN KEY (`id_solicitud_presupuesto`)
REFERENCES `alt_solicitud_presupuesto` (`id_solicitud`)
ON DELETE SET NULL;

-- FK hacia rec_receta_alto_costo
ALTER TABLE `rec_compras_alto_costo`
ADD CONSTRAINT `fk_compra_receta`
FOREIGN KEY (`idreceta`)
REFERENCES `rec_receta_alto_costo` (`idreceta`)
ON DELETE CASCADE;

-- FK desde detalle hacia compras (solo si no existe)
SET @dbname = DATABASE();
SET @tablename = "rec_compras_alto_costo_detalle";
SET @fkname = "fk_detalle_compra";

SELECT COUNT(*) INTO @exist FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = @tablename AND CONSTRAINT_NAME = @fkname AND CONSTRAINT_TYPE = 'FOREIGN KEY';

SET @sqlstmt = IF(@exist = 0,
    'ALTER TABLE `rec_compras_alto_costo_detalle` ADD CONSTRAINT `fk_detalle_compra` FOREIGN KEY (`id_compra`) REFERENCES `rec_compras_alto_costo` (`id`) ON DELETE CASCADE',
    'SELECT ''FK fk_detalle_compra ya existe''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN FINAL
-- ----------------------------------------------------------------------------

SELECT 'MIGRACIÓN COMPLETADA EXITOSAMENTE' AS status;

SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'rec_compras_alto_costo'
ORDER BY ORDINAL_POSITION;

-- FIN DE LA MIGRACIÓN SEGURA
