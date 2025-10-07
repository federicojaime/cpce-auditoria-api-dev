-- Script para agregar funcionalidad de período de prueba a usuarios
-- Ejecutar en la base de datos cpce_auditoria

-- Agregar columnas necesarias para el sistema de prueba
ALTER TABLE user_au
ADD COLUMN es_prueba TINYINT(1) DEFAULT 0 COMMENT 'Indica si el usuario es de prueba (1) o definitivo (0)',
ADD COLUMN fecha_inicio_prueba DATETIME DEFAULT NULL COMMENT 'Fecha en que inició el período de prueba',
ADD COLUMN dias_prueba INT DEFAULT 30 COMMENT 'Cantidad de días de prueba asignados',
ADD COLUMN fecha_expiracion_prueba DATETIME DEFAULT NULL COMMENT 'Fecha en que expira el período de prueba (calculado automáticamente)',
ADD COLUMN ultimo_acceso DATETIME DEFAULT NULL COMMENT 'Última fecha de acceso al sistema para el contador',
ADD COLUMN estado_cuenta ENUM('activa', 'prueba_activa', 'prueba_expirada', 'suspendida') DEFAULT 'activa' COMMENT 'Estado actual de la cuenta';

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_es_prueba ON user_au(es_prueba);
CREATE INDEX idx_estado_cuenta ON user_au(estado_cuenta);
CREATE INDEX idx_fecha_expiracion ON user_au(fecha_expiracion_prueba);

-- Trigger para calcular automáticamente la fecha de expiración cuando se establece fecha_inicio_prueba
DELIMITER $$

CREATE TRIGGER before_user_trial_insert
BEFORE INSERT ON user_au
FOR EACH ROW
BEGIN
    IF NEW.es_prueba = 1 AND NEW.fecha_inicio_prueba IS NOT NULL THEN
        SET NEW.fecha_expiracion_prueba = DATE_ADD(NEW.fecha_inicio_prueba, INTERVAL NEW.dias_prueba DAY);
        SET NEW.estado_cuenta = 'prueba_activa';
    END IF;
END$$

CREATE TRIGGER before_user_trial_update
BEFORE UPDATE ON user_au
FOR EACH ROW
BEGIN
    IF NEW.es_prueba = 1 THEN
        IF NEW.fecha_inicio_prueba IS NOT NULL AND
           (OLD.fecha_inicio_prueba IS NULL OR
            OLD.fecha_inicio_prueba != NEW.fecha_inicio_prueba OR
            OLD.dias_prueba != NEW.dias_prueba) THEN
            SET NEW.fecha_expiracion_prueba = DATE_ADD(NEW.fecha_inicio_prueba, INTERVAL NEW.dias_prueba DAY);
        END IF;

        -- Actualizar estado según la fecha de expiración
        IF NEW.fecha_expiracion_prueba IS NOT NULL THEN
            IF NOW() < NEW.fecha_expiracion_prueba THEN
                SET NEW.estado_cuenta = 'prueba_activa';
            ELSE
                SET NEW.estado_cuenta = 'prueba_expirada';
            END IF;
        END IF;
    ELSE
        -- Si no es prueba, la cuenta está activa
        SET NEW.estado_cuenta = 'activa';
    END IF;
END$$

DELIMITER ;

-- Vista para ver fácilmente los usuarios de prueba y sus estados
CREATE OR REPLACE VIEW v_usuarios_prueba AS
SELECT
    id,
    user,
    nombre,
    apellido,
    es_prueba,
    fecha_inicio_prueba,
    dias_prueba,
    fecha_expiracion_prueba,
    ultimo_acceso,
    estado_cuenta,
    DATEDIFF(fecha_expiracion_prueba, NOW()) as dias_restantes,
    CASE
        WHEN fecha_expiracion_prueba IS NULL THEN 'Sin fecha de expiración'
        WHEN NOW() < fecha_expiracion_prueba THEN 'Activo'
        ELSE 'Expirado'
    END as estado_prueba
FROM user_au
WHERE es_prueba = 1;

-- Ejemplo de cómo crear un usuario de prueba (comentado)
/*
INSERT INTO user_au (user, password, nombre, apellido, dni, rol, es_prueba, fecha_inicio_prueba, dias_prueba)
VALUES ('usuario_prueba', MD5('password123'), 'Usuario', 'Prueba', '12345678', 'usuario', 1, NOW(), 30);
*/

-- Ejemplo de cómo convertir un usuario existente a prueba (comentado)
/*
UPDATE user_au
SET es_prueba = 1,
    fecha_inicio_prueba = NOW(),
    dias_prueba = 30
WHERE user = 'usuario_existente';
*/

-- Consulta para ver usuarios de prueba que expiran pronto (próximos 7 días)
/*
SELECT * FROM v_usuarios_prueba
WHERE dias_restantes <= 7 AND dias_restantes >= 0
ORDER BY dias_restantes ASC;
*/

-- Consulta para ver usuarios de prueba expirados
/*
SELECT * FROM v_usuarios_prueba
WHERE dias_restantes < 0
ORDER BY dias_restantes ASC;
*/
