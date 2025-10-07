-- Script de creación de tablas para el Módulo de Compras y Presupuestos
-- Ejecutar solo si las tablas NO existen (verificar con check_compras_setup.sql)

-- ========================================
-- TABLA 1: alt_solicitud_presupuesto
-- Solicitudes de presupuesto enviadas a proveedores
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_solicitud_presupuesto` (
  `id_solicitud` INT(11) NOT NULL AUTO_INCREMENT,
  `codigo_solicitud` VARCHAR(50) NOT NULL COMMENT 'Código único (ej: SOL-2025-001)',

  -- Fechas
  `fecha_envio` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de envío',
  `fecha_limite` DATETIME DEFAULT NULL COMMENT 'Fecha límite de respuesta',

  -- Estado y control
  `estado` ENUM('ENVIADO', 'PARCIAL', 'COMPLETO', 'ADJUDICADO', 'CANCELADO')
    DEFAULT 'ENVIADO' COMMENT 'Estado general de la solicitud',
  `urgencia` ENUM('ALTA', 'MEDIA', 'BAJA') DEFAULT 'MEDIA' COMMENT 'Nivel de urgencia',

  -- Resumen
  `cantidad_auditorias` INT DEFAULT 0 COMMENT 'Cantidad de auditorías incluidas',
  `cantidad_proveedores` INT DEFAULT 0 COMMENT 'Cantidad de proveedores consultados',
  `monto_total_estimado` DECIMAL(15,2) DEFAULT 0 COMMENT 'Monto total estimado',

  -- Adjudicación
  `id_proveedor_adjudicado` INT DEFAULT NULL COMMENT 'Proveedor al que se adjudicó',
  `fecha_adjudicacion` DATETIME DEFAULT NULL COMMENT 'Fecha de adjudicación',
  `motivo_adjudicacion` TEXT DEFAULT NULL COMMENT 'Motivo de la adjudicación',
  `id_orden_compra` INT DEFAULT NULL COMMENT 'Orden de compra generada',

  -- Auditoría
  `id_usuario_creador` INT NOT NULL COMMENT 'Usuario que creó la solicitud',
  `observaciones` TEXT DEFAULT NULL COMMENT 'Observaciones generales',
  `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_solicitud`),
  UNIQUE KEY `uk_codigo_solicitud` (`codigo_solicitud`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_envio` (`fecha_envio`),
  KEY `idx_urgencia` (`urgencia`),
  KEY `idx_proveedor_adjudicado` (`id_proveedor_adjudicado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Solicitudes de presupuesto';

-- ========================================
-- TABLA 2: alt_solicitud_presupuesto_auditoria
-- Relación entre solicitudes y auditorías
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_solicitud_presupuesto_auditoria` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` INT(11) NOT NULL COMMENT 'FK a solicitud',
  `id_auditoria` INT(11) NOT NULL COMMENT 'FK a auditoría de alto costo',
  `monto_estimado` DECIMAL(15,2) DEFAULT 0 COMMENT 'Monto estimado de esta auditoría',
  `fecha_agregado` DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `fk_solicitud_auditoria_solicitud` (`id_solicitud`),
  KEY `fk_solicitud_auditoria_auditoria` (`id_auditoria`),
  UNIQUE KEY `uk_solicitud_auditoria` (`id_solicitud`, `id_auditoria`),

  CONSTRAINT `fk_solicitud_auditoria_solicitud`
    FOREIGN KEY (`id_solicitud`)
    REFERENCES `alt_solicitud_presupuesto` (`id_solicitud`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Auditorías incluidas en solicitudes';

-- ========================================
-- TABLA 3: alt_solicitud_presupuesto_proveedor
-- Relación entre solicitudes y proveedores
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_solicitud_presupuesto_proveedor` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` INT(11) NOT NULL COMMENT 'FK a solicitud',
  `id_proveedor` INT(11) NOT NULL COMMENT 'FK a proveedor',

  -- Estado
  `estado` ENUM('ENVIADO', 'RECIBIDO', 'PENDIENTE', 'VENCIDO', 'ADJUDICADO', 'NO_ADJUDICADO')
    DEFAULT 'ENVIADO' COMMENT 'Estado de este proveedor',

  -- Respuesta
  `fecha_respuesta` DATETIME DEFAULT NULL COMMENT 'Fecha de respuesta del proveedor',
  `id_respuesta` INT DEFAULT NULL COMMENT 'FK a respuesta de presupuesto',

  -- Control
  `fecha_envio` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `fk_solicitud_proveedor_solicitud` (`id_solicitud`),
  KEY `fk_solicitud_proveedor_proveedor` (`id_proveedor`),
  KEY `idx_estado_proveedor` (`estado`),
  UNIQUE KEY `uk_solicitud_proveedor` (`id_solicitud`, `id_proveedor`),

  CONSTRAINT `fk_solicitud_proveedor_solicitud`
    FOREIGN KEY (`id_solicitud`)
    REFERENCES `alt_solicitud_presupuesto` (`id_solicitud`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_solicitud_proveedor_proveedor`
    FOREIGN KEY (`id_proveedor`)
    REFERENCES `alt_proveedor` (`id_proveedor`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Proveedores consultados en solicitudes';

-- ========================================
-- TABLA 4: alt_presupuesto_respuesta
-- Respuestas de presupuestos de proveedores
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_presupuesto_respuesta` (
  `id_respuesta` INT(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` INT(11) NOT NULL COMMENT 'FK a solicitud',
  `id_proveedor` INT(11) NOT NULL COMMENT 'FK a proveedor',

  -- Datos del presupuesto
  `monto_total` DECIMAL(15,2) NOT NULL COMMENT 'Monto total cotizado',
  `descuento` DECIMAL(15,2) DEFAULT 0 COMMENT 'Descuento ofrecido',
  `monto_final` DECIMAL(15,2) NOT NULL COMMENT 'Monto final con descuento',

  -- Condiciones
  `tiempo_entrega` VARCHAR(100) DEFAULT NULL COMMENT 'Tiempo de entrega (ej: 48-72hs)',
  `validez_oferta` VARCHAR(100) DEFAULT NULL COMMENT 'Validez de la oferta (ej: 15 días)',
  `forma_pago` VARCHAR(200) DEFAULT NULL COMMENT 'Forma de pago',
  `observaciones` TEXT DEFAULT NULL COMMENT 'Observaciones del proveedor',

  -- Detalle (JSON)
  `detalle_medicamentos` JSON DEFAULT NULL COMMENT 'Detalle de medicamentos cotizados',

  -- Archivos adjuntos
  `archivo_presupuesto` VARCHAR(500) DEFAULT NULL COMMENT 'URL del archivo PDF/imagen',

  -- Control
  `adjudicado` TINYINT(1) DEFAULT 0 COMMENT '1 si fue adjudicado',
  `fecha_respuesta` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_respuesta`),
  KEY `fk_respuesta_solicitud` (`id_solicitud`),
  KEY `fk_respuesta_proveedor` (`id_proveedor`),
  KEY `idx_adjudicado` (`adjudicado`),

  CONSTRAINT `fk_respuesta_solicitud`
    FOREIGN KEY (`id_solicitud`)
    REFERENCES `alt_solicitud_presupuesto` (`id_solicitud`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_respuesta_proveedor`
    FOREIGN KEY (`id_proveedor`)
    REFERENCES `alt_proveedor` (`id_proveedor`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Respuestas de presupuestos';

-- ========================================
-- TABLA 5: alt_orden_compra
-- Órdenes de compra generadas
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_orden_compra` (
  `id_orden` INT(11) NOT NULL AUTO_INCREMENT,
  `numero_orden` VARCHAR(50) NOT NULL COMMENT 'Número único de orden (OC-2025-001)',

  -- Relaciones
  `id_solicitud` INT(11) NOT NULL COMMENT 'FK a solicitud origen',
  `id_proveedor` INT(11) NOT NULL COMMENT 'FK a proveedor',
  `id_respuesta_presupuesto` INT DEFAULT NULL COMMENT 'FK a presupuesto adjudicado',

  -- Estado
  `estado` ENUM('BORRADOR', 'ENVIADA', 'CONFIRMADA', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADA')
    DEFAULT 'BORRADOR' COMMENT 'Estado de la orden',

  -- Fechas
  `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `fecha_envio` DATETIME DEFAULT NULL COMMENT 'Fecha de envío al proveedor',
  `fecha_confirmacion` DATETIME DEFAULT NULL COMMENT 'Fecha de confirmación del proveedor',
  `fecha_entrega_estimada` DATETIME DEFAULT NULL COMMENT 'Fecha estimada de entrega',
  `fecha_entrega_real` DATETIME DEFAULT NULL COMMENT 'Fecha real de entrega',

  -- Montos
  `subtotal` DECIMAL(15,2) DEFAULT 0,
  `descuento` DECIMAL(15,2) DEFAULT 0,
  `impuestos` DECIMAL(15,2) DEFAULT 0,
  `total` DECIMAL(15,2) NOT NULL,

  -- Tracking y logística
  `tracking_numero` VARCHAR(100) DEFAULT NULL COMMENT 'Número de tracking',
  `tracking_empresa` VARCHAR(200) DEFAULT NULL COMMENT 'Empresa de logística',
  `tracking_estado` VARCHAR(100) DEFAULT NULL COMMENT 'Estado del envío',
  `tracking_url` VARCHAR(500) DEFAULT NULL COMMENT 'URL de seguimiento',

  -- Notificación al paciente
  `notificacion_enviada` TINYINT(1) DEFAULT 0 COMMENT '1 si se notificó al paciente',
  `fecha_notificacion` DATETIME DEFAULT NULL COMMENT 'Fecha de notificación',

  -- Control
  `cantidad_pacientes` INT DEFAULT 0 COMMENT 'Cantidad de pacientes en esta orden',
  `observaciones` TEXT DEFAULT NULL,
  `motivo_cancelacion` TEXT DEFAULT NULL,
  `id_usuario_creador` INT NOT NULL COMMENT 'Usuario que creó la orden',
  `fecha_modificacion` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_orden`),
  UNIQUE KEY `uk_numero_orden` (`numero_orden`),
  KEY `fk_orden_solicitud` (`id_solicitud`),
  KEY `fk_orden_proveedor` (`id_proveedor`),
  KEY `idx_estado_orden` (`estado`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),
  KEY `idx_notificacion` (`notificacion_enviada`),

  CONSTRAINT `fk_orden_solicitud`
    FOREIGN KEY (`id_solicitud`)
    REFERENCES `alt_solicitud_presupuesto` (`id_solicitud`),

  CONSTRAINT `fk_orden_proveedor`
    FOREIGN KEY (`id_proveedor`)
    REFERENCES `alt_proveedor` (`id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Órdenes de compra';

-- ========================================
-- TABLA 6: alt_orden_compra_detalle
-- Detalle de medicamentos por orden
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_orden_compra_detalle` (
  `id_detalle` INT(11) NOT NULL AUTO_INCREMENT,
  `id_orden` INT(11) NOT NULL COMMENT 'FK a orden de compra',
  `id_auditoria` INT(11) NOT NULL COMMENT 'FK a auditoría',
  `id_medicamento` INT DEFAULT NULL COMMENT 'FK a medicamento (si existe tabla)',

  -- Datos del paciente
  `paciente_nombre` VARCHAR(255) NOT NULL,
  `paciente_dni` VARCHAR(20) NOT NULL,
  `paciente_telefono` VARCHAR(50) DEFAULT NULL,
  `paciente_email` VARCHAR(255) DEFAULT NULL,

  -- Datos del medicamento
  `medicamento_nombre` VARCHAR(255) NOT NULL,
  `medicamento_categoria` VARCHAR(100) DEFAULT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(15,2) NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL,

  -- Control
  `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_detalle`),
  KEY `fk_detalle_orden` (`id_orden`),
  KEY `idx_auditoria` (`id_auditoria`),
  KEY `idx_paciente_dni` (`paciente_dni`),

  CONSTRAINT `fk_detalle_orden`
    FOREIGN KEY (`id_orden`)
    REFERENCES `alt_orden_compra` (`id_orden`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Detalle de órdenes de compra';

-- ========================================
-- TABLA 7: alt_orden_compra_historial
-- Historial de cambios de estado de órdenes
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_orden_compra_historial` (
  `id_historial` INT(11) NOT NULL AUTO_INCREMENT,
  `id_orden` INT(11) NOT NULL COMMENT 'FK a orden',

  -- Cambio
  `estado_anterior` VARCHAR(50) DEFAULT NULL,
  `estado_nuevo` VARCHAR(50) NOT NULL,
  `evento` VARCHAR(200) NOT NULL COMMENT 'Descripción del evento',
  `descripcion` TEXT DEFAULT NULL COMMENT 'Descripción detallada',

  -- Control
  `id_usuario` INT NOT NULL COMMENT 'Usuario que realizó el cambio',
  `fecha_evento` DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_historial`),
  KEY `fk_historial_orden` (`id_orden`),
  KEY `idx_fecha_evento` (`fecha_evento`),

  CONSTRAINT `fk_historial_orden`
    FOREIGN KEY (`id_orden`)
    REFERENCES `alt_orden_compra` (`id_orden`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Historial de órdenes de compra';

-- ========================================
-- TABLA 8: alt_notificacion_paciente
-- Notificaciones enviadas a pacientes
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_notificacion_paciente` (
  `id_notificacion` INT(11) NOT NULL AUTO_INCREMENT,
  `id_orden` INT(11) NOT NULL COMMENT 'FK a orden de compra',

  -- Datos del paciente
  `paciente_nombre` VARCHAR(255) NOT NULL,
  `paciente_dni` VARCHAR(20) NOT NULL,
  `paciente_telefono` VARCHAR(50) DEFAULT NULL,
  `paciente_email` VARCHAR(255) DEFAULT NULL,

  -- Tipo de notificación
  `tipo` ENUM('MEDICAMENTOS_DISPONIBLES', 'REENVIO_NOTIFICACION', 'ORDEN_CANCELADA', 'RECORDATORIO')
    DEFAULT 'MEDICAMENTOS_DISPONIBLES',
  `canal` ENUM('EMAIL_SMS', 'EMAIL', 'SMS', 'WHATSAPP') DEFAULT 'EMAIL_SMS',
  `urgencia` ENUM('ALTA', 'MEDIA', 'BAJA') DEFAULT 'MEDIA',

  -- Estado del envío
  `email_enviado` TINYINT(1) DEFAULT 0,
  `email_fecha` DATETIME DEFAULT NULL,
  `email_error` TEXT DEFAULT NULL,

  `sms_enviado` TINYINT(1) DEFAULT 0,
  `sms_fecha` DATETIME DEFAULT NULL,
  `sms_error` TEXT DEFAULT NULL,

  -- Contenido
  `mensaje_email` TEXT DEFAULT NULL COMMENT 'Contenido del email',
  `mensaje_sms` VARCHAR(500) DEFAULT NULL COMMENT 'Contenido del SMS',

  -- Control
  `id_usuario_envio` INT NOT NULL COMMENT 'Usuario que envió la notificación',
  `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_notificacion`),
  KEY `fk_notificacion_orden` (`id_orden`),
  KEY `idx_paciente_dni` (`paciente_dni`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),

  CONSTRAINT `fk_notificacion_orden`
    FOREIGN KEY (`id_orden`)
    REFERENCES `alt_orden_compra` (`id_orden`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Notificaciones a pacientes';

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista: Resumen de solicitudes con contadores
CREATE OR REPLACE VIEW v_solicitudes_resumen AS
SELECT
    s.id_solicitud,
    s.codigo_solicitud,
    s.fecha_envio,
    s.estado,
    s.urgencia,
    s.cantidad_auditorias,
    s.cantidad_proveedores,
    s.monto_total_estimado,
    COUNT(DISTINCT sp.id_proveedor) as proveedores_contactados,
    SUM(CASE WHEN sp.estado = 'RECIBIDO' THEN 1 ELSE 0 END) as respuestas_recibidas,
    p.razon_social as proveedor_adjudicado
FROM alt_solicitud_presupuesto s
LEFT JOIN alt_solicitud_presupuesto_proveedor sp ON s.id_solicitud = sp.id_solicitud
LEFT JOIN alt_proveedor p ON s.id_proveedor_adjudicado = p.id_proveedor
GROUP BY s.id_solicitud;

-- Vista: Órdenes con info completa
CREATE OR REPLACE VIEW v_ordenes_completas AS
SELECT
    o.id_orden,
    o.numero_orden,
    o.estado,
    o.fecha_creacion,
    o.fecha_entrega_estimada,
    o.fecha_entrega_real,
    o.total,
    o.notificacion_enviada,
    o.tracking_numero,
    p.razon_social as proveedor,
    p.telefono_general as proveedor_telefono,
    p.email_general as proveedor_email,
    s.codigo_solicitud,
    COUNT(DISTINCT d.id_detalle) as cantidad_items,
    o.cantidad_pacientes
FROM alt_orden_compra o
INNER JOIN alt_proveedor p ON o.id_proveedor = p.id_proveedor
INNER JOIN alt_solicitud_presupuesto s ON o.id_solicitud = s.id_solicitud
LEFT JOIN alt_orden_compra_detalle d ON o.id_orden = d.id_orden
GROUP BY o.id_orden;

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger: Actualizar estado de solicitud según respuestas
DELIMITER $$

CREATE TRIGGER after_presupuesto_respuesta_insert
AFTER INSERT ON alt_presupuesto_respuesta
FOR EACH ROW
BEGIN
    DECLARE total_proveedores INT;
    DECLARE respuestas_recibidas INT;

    SELECT cantidad_proveedores INTO total_proveedores
    FROM alt_solicitud_presupuesto
    WHERE id_solicitud = NEW.id_solicitud;

    SELECT COUNT(*) INTO respuestas_recibidas
    FROM alt_presupuesto_respuesta
    WHERE id_solicitud = NEW.id_solicitud;

    IF respuestas_recibidas >= total_proveedores THEN
        UPDATE alt_solicitud_presupuesto
        SET estado = 'COMPLETO'
        WHERE id_solicitud = NEW.id_solicitud;
    ELSE
        UPDATE alt_solicitud_presupuesto
        SET estado = 'PARCIAL'
        WHERE id_solicitud = NEW.id_solicitud;
    END IF;

    -- Actualizar estado del proveedor
    UPDATE alt_solicitud_presupuesto_proveedor
    SET estado = 'RECIBIDO',
        fecha_respuesta = NOW(),
        id_respuesta = NEW.id_respuesta
    WHERE id_solicitud = NEW.id_solicitud
      AND id_proveedor = NEW.id_proveedor;
END$$

DELIMITER ;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

SELECT '===========================================' as '';
SELECT '✅ TABLAS DEL MÓDULO DE COMPRAS CREADAS' as '';
SELECT '===========================================' as '';

SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
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
  )
ORDER BY TABLE_NAME;
