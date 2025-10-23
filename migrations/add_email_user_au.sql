-- Migration: Agregar campo email a la tabla user_au
-- Fecha: 2025-10-22
-- Descripción: Permite que los usuarios administradores reciban notificaciones por email cuando los proveedores responden presupuestos

-- Agregar campo email a la tabla user_au
ALTER TABLE `user_au`
ADD COLUMN `email` varchar(255) DEFAULT NULL COMMENT 'Email del usuario para notificaciones'
AFTER `user`;

-- Crear índice para búsquedas por email
CREATE INDEX `idx_email` ON `user_au` (`email`);

-- IMPORTANTE: Después de ejecutar esta migración, debes actualizar los emails de los administradores manualmente:
-- UPDATE user_au SET email = 'admin@ejemplo.com' WHERE id = 1;
-- UPDATE user_au SET email = 'otro_admin@ejemplo.com' WHERE id = 2;
