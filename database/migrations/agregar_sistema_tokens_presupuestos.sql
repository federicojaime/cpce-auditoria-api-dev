-- ============================================================
-- SISTEMA DE TOKENS PARA PRESUPUESTOS - MIGRACIÓN
-- Este script agrega el sistema de tokens a las tablas existentes
-- NO BORRA NADA - Solo agrega lo necesario
-- ============================================================

-- ============================================================
-- 1. AGREGAR COLUMNAS A TABLA EXISTENTE: alt_solicitud_presupuesto_proveedor
-- ============================================================

-- Agregar columna de token (único por proveedor)
ALTER TABLE `alt_solicitud_presupuesto_proveedor`
ADD COLUMN `token` VARCHAR(255) NULL COMMENT 'Token único para acceso sin login' AFTER `id_proveedor`,
ADD COLUMN `fecha_expiracion` DATETIME NULL COMMENT 'Fecha de expiración del token (72 horas)' AFTER `token`,
ADD UNIQUE KEY `unique_token` (`token`);

-- ============================================================
-- 2. CREAR TABLA PARA RESPUESTAS DETALLADAS POR MEDICAMENTO
-- ============================================================

-- Esta tabla guardará las respuestas individuales por cada medicamento
CREATE TABLE IF NOT EXISTS `alt_presupuesto_respuesta_detalle` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `id_solicitud_proveedor` INT(11) NOT NULL COMMENT 'Referencia a alt_solicitud_presupuesto_proveedor',
    `id_auditoria` INT(11) NOT NULL COMMENT 'ID de la auditoría',
    `id_medicamento` INT(11) NOT NULL COMMENT 'ID del medicamento',
    `acepta` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Acepta, 0=Rechaza',
    `precio` DECIMAL(10,2) NULL COMMENT 'Precio del medicamento (si acepta)',
    `fecha_retiro` DATE NULL COMMENT 'Fecha en que puede entregar',
    `fecha_vencimiento` DATE NULL COMMENT 'Fecha de vencimiento del medicamento',
    `comentarios` TEXT NULL COMMENT 'Comentarios adicionales del proveedor',
    `fecha_respuesta` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_solicitud_proveedor` (`id_solicitud_proveedor`),
    INDEX `idx_auditoria` (`id_auditoria`),
    INDEX `idx_medicamento` (`id_medicamento`),
    INDEX `idx_acepta` (`acepta`),
    UNIQUE KEY `unique_respuesta` (`id_solicitud_proveedor`, `id_auditoria`, `id_medicamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci
COMMENT='Respuestas detalladas por medicamento de cada proveedor';

-- ============================================================
-- 3. CREAR TABLA DE NOTIFICACIONES (OPCIONAL)
-- ============================================================

CREATE TABLE IF NOT EXISTS `alt_presupuesto_notificaciones` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `id_solicitud` INT(11) NOT NULL COMMENT 'Referencia a alt_solicitud_presupuesto',
    `id_proveedor` INT(11) NULL COMMENT 'Referencia a alt_proveedor',
    `tipo` ENUM('respuesta_recibida', 'expiracion_proxima', 'solicitud_enviada') NOT NULL,
    `mensaje` TEXT NOT NULL,
    `leido` TINYINT(1) DEFAULT 0,
    `fecha_notificacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_solicitud` (`id_solicitud`),
    INDEX `idx_proveedor` (`id_proveedor`),
    INDEX `idx_leido` (`leido`),
    INDEX `idx_fecha` (`fecha_notificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci
COMMENT='Log de notificaciones del sistema de presupuestos';

-- ============================================================
-- 4. ACTUALIZAR ESTADOS PARA INCLUIR NUEVOS VALORES
-- ============================================================

-- Agregar nuevo estado 'RESPONDIDO' si no existe
ALTER TABLE `alt_solicitud_presupuesto_proveedor`
MODIFY COLUMN `estado` ENUM('ENVIADO','RECIBIDO','PENDIENTE','VENCIDO','ADJUDICADO','NO_ADJUDICADO','RESPONDIDO','EXPIRADO')
DEFAULT 'ENVIADO'
COMMENT 'Estado de la solicitud al proveedor';

-- ============================================================
-- 5. ÍNDICES ADICIONALES PARA OPTIMIZAR CONSULTAS
-- ============================================================

-- Índice para búsqueda por fecha de expiración
ALTER TABLE `alt_solicitud_presupuesto_proveedor`
ADD INDEX `idx_fecha_expiracion` (`fecha_expiracion`);

-- Índice para búsqueda de tokens activos
ALTER TABLE `alt_solicitud_presupuesto_proveedor`
ADD INDEX `idx_estado_expiracion` (`estado`, `fecha_expiracion`);

-- ============================================================
-- 6. SCRIPT DE VERIFICACIÓN (Comentado - Descomenta para probar)
-- ============================================================

/*
-- Verificar columnas agregadas
SHOW COLUMNS FROM alt_solicitud_presupuesto_proveedor LIKE '%token%';
SHOW COLUMNS FROM alt_solicitud_presupuesto_proveedor LIKE '%expiracion%';

-- Verificar tabla creada
SHOW TABLES LIKE 'alt_presupuesto_respuesta_detalle';

-- Ver estructura completa
DESCRIBE alt_solicitud_presupuesto_proveedor;
DESCRIBE alt_presupuesto_respuesta_detalle;
DESCRIBE alt_presupuesto_notificaciones;
*/

-- ============================================================
-- FIN DEL SCRIPT DE MIGRACIÓN
-- ============================================================

-- NOTAS:
-- 1. Este script NO borra ninguna tabla existente
-- 2. Solo agrega columnas y crea tablas nuevas
-- 3. Los datos existentes se mantienen intactos
-- 4. Ejecutar UNA SOLA VEZ
-- 5. Si ya ejecutaste este script, comentar las líneas ALTER TABLE
--    antes de volver a ejecutar para evitar errores de columna duplicada
