-- Script de creación de tablas para Proveedores y Contactos
-- Ejecutar solo si las tablas NO existen (verificar con check_proveedores_setup.sql)

-- ========================================
-- TABLA: alt_proveedor
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_proveedor` (
  `id_proveedor` INT(11) NOT NULL AUTO_INCREMENT,
  `razon_social` VARCHAR(255) NOT NULL COMMENT 'Razón social del proveedor',
  `cuit` VARCHAR(13) NOT NULL COMMENT 'CUIT del proveedor (formato: 20-12345678-9)',
  `tipo_proveedor` ENUM('Laboratorio', 'Droguería', 'Ambos') DEFAULT 'Laboratorio' COMMENT 'Tipo de proveedor',

  -- Datos de contacto generales
  `email_general` VARCHAR(255) DEFAULT NULL COMMENT 'Email general del proveedor',
  `telefono_general` VARCHAR(50) DEFAULT NULL COMMENT 'Teléfono general',

  -- Dirección
  `direccion_calle` VARCHAR(255) DEFAULT NULL COMMENT 'Calle',
  `direccion_numero` VARCHAR(20) DEFAULT NULL COMMENT 'Número',
  `barrio` VARCHAR(100) DEFAULT NULL COMMENT 'Barrio',
  `localidad` VARCHAR(100) DEFAULT NULL COMMENT 'Localidad',
  `provincia` VARCHAR(100) DEFAULT NULL COMMENT 'Provincia',

  -- Estado y fechas
  `activo` TINYINT(1) DEFAULT 1 COMMENT '1 = activo, 0 = inactivo',
  `fecha_alta` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
  `fecha_modificacion` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última modificación',

  PRIMARY KEY (`id_proveedor`),
  UNIQUE KEY `uk_cuit` (`cuit`),
  KEY `idx_razon_social` (`razon_social`),
  KEY `idx_tipo` (`tipo_proveedor`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tabla de proveedores (laboratorios y droguerías)';

-- ========================================
-- TABLA: alt_contacto_proveedor
-- ========================================

CREATE TABLE IF NOT EXISTS `alt_contacto_proveedor` (
  `id_contacto` INT(11) NOT NULL AUTO_INCREMENT,
  `id_proveedor` INT(11) NOT NULL COMMENT 'FK al proveedor',

  -- Datos del contacto
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del contacto',
  `apellido` VARCHAR(100) NOT NULL COMMENT 'Apellido del contacto',
  `cargo` VARCHAR(100) DEFAULT NULL COMMENT 'Cargo o función',
  `email` VARCHAR(255) DEFAULT NULL COMMENT 'Email del contacto',
  `telefono` VARCHAR(50) DEFAULT NULL COMMENT 'Teléfono del contacto',

  -- Control
  `principal` TINYINT(1) DEFAULT 0 COMMENT '1 = contacto principal, 0 = secundario',
  `fecha_alta` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
  `fecha_modificacion` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última modificación',

  PRIMARY KEY (`id_contacto`),
  KEY `fk_proveedor` (`id_proveedor`),
  KEY `idx_principal` (`principal`),
  KEY `idx_nombre_apellido` (`nombre`, `apellido`),

  CONSTRAINT `fk_contacto_proveedor`
    FOREIGN KEY (`id_proveedor`)
    REFERENCES `alt_proveedor` (`id_proveedor`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Contactos de proveedores';

-- ========================================
-- VISTA: Proveedores con contactos
-- ========================================

CREATE OR REPLACE VIEW v_proveedores_completo AS
SELECT
    p.id_proveedor,
    p.razon_social,
    p.cuit,
    p.tipo_proveedor,
    p.email_general,
    p.telefono_general,
    CONCAT(
        COALESCE(p.direccion_calle, ''), ' ',
        COALESCE(p.direccion_numero, ''), ', ',
        COALESCE(p.localidad, ''), ', ',
        COALESCE(p.provincia, '')
    ) AS direccion_completa,
    p.activo,
    p.fecha_alta,
    COUNT(c.id_contacto) as total_contactos,
    GROUP_CONCAT(
        CONCAT(c.nombre, ' ', c.apellido,
               CASE WHEN c.principal = 1 THEN ' (Principal)' ELSE '' END)
        SEPARATOR '; '
    ) as contactos
FROM alt_proveedor p
LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor
GROUP BY p.id_proveedor;

-- ========================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ========================================

-- Descomentar para insertar datos de prueba

/*
-- Proveedor 1
INSERT INTO alt_proveedor (razon_social, cuit, tipo_proveedor, email_general, telefono_general, direccion_calle, direccion_numero, localidad, provincia)
VALUES ('Laboratorio Roemmers S.A.', '30-50279317-5', 'Laboratorio', 'info@roemmers.com.ar', '011-4555-5555', 'Av. Corrientes', '1234', 'CABA', 'Buenos Aires');

INSERT INTO alt_contacto_proveedor (id_proveedor, nombre, apellido, cargo, email, telefono, principal)
VALUES (LAST_INSERT_ID(), 'Juan', 'Pérez', 'Gerente de Ventas', 'jperez@roemmers.com.ar', '011-4555-5556', 1);

-- Proveedor 2
INSERT INTO alt_proveedor (razon_social, cuit, tipo_proveedor, email_general, telefono_general, direccion_calle, direccion_numero, localidad, provincia)
VALUES ('Droguería del Sud S.A.', '30-58351891-4', 'Droguería', 'contacto@delsud.com.ar', '011-4666-6666', 'Av. Belgrano', '5678', 'CABA', 'Buenos Aires');

INSERT INTO alt_contacto_proveedor (id_proveedor, nombre, apellido, cargo, email, telefono, principal)
VALUES (LAST_INSERT_ID(), 'María', 'González', 'Responsable de Compras', 'mgonzalez@delsud.com.ar', '011-4666-6667', 1);

-- Proveedor 3
INSERT INTO alt_proveedor (razon_social, cuit, tipo_proveedor, email_general, telefono_general, direccion_calle, direccion_numero, localidad, provincia)
VALUES ('Laboratorio Bagó S.A.', '30-50120190-4', 'Ambos', 'ventas@bago.com.ar', '011-4777-7777', 'Av. San Martín', '9012', 'CABA', 'Buenos Aires');

INSERT INTO alt_contacto_proveedor (id_proveedor, nombre, apellido, cargo, email, telefono, principal)
VALUES (LAST_INSERT_ID(), 'Carlos', 'Rodríguez', 'Director Comercial', 'crodriguez@bago.com.ar', '011-4777-7778', 1);
*/

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

SELECT '===========================================' as '';
SELECT '✅ TABLAS CREADAS EXITOSAMENTE' as '';
SELECT '===========================================' as '';

SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('alt_proveedor', 'alt_contacto_proveedor');
