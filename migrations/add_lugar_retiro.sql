-- Migration: Agregar campo lugar_retiro a la tabla alt_presupuesto_respuesta_detalle
-- Fecha: 2025-10-22
-- Descripción: Permite a los proveedores especificar el lugar de retiro por cada medicamento

-- Verificar si la tabla existe, si no, crearla
CREATE TABLE IF NOT EXISTS `alt_presupuesto_respuesta_detalle` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud_proveedor` int(11) NOT NULL COMMENT 'FK a alt_solicitud_presupuesto_proveedor',
  `id_auditoria` int(11) NOT NULL COMMENT 'FK a rec_receta_alto_costo.idreceta',
  `id_medicamento` int(11) NOT NULL COMMENT 'FK a rec_prescrmedicamento_alto_costo.idmedicamento',
  `acepta` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1=Acepta cotizar, 0=No acepta',
  `precio` decimal(10,2) DEFAULT NULL COMMENT 'Precio unitario ofrecido',
  `fecha_retiro` date DEFAULT NULL COMMENT 'Fecha en que estará disponible para retiro',
  `fecha_vencimiento` date DEFAULT NULL COMMENT 'Fecha de vencimiento del medicamento',
  `comentarios` text DEFAULT NULL COMMENT 'Observaciones del proveedor',
  `fecha_respuesta` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_solicitud_proveedor` (`id_solicitud_proveedor`),
  KEY `idx_auditoria` (`id_auditoria`),
  KEY `idx_medicamento` (`id_medicamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar campo lugar_retiro si no existe
ALTER TABLE `alt_presupuesto_respuesta_detalle`
ADD COLUMN IF NOT EXISTS `lugar_retiro` varchar(255) DEFAULT NULL COMMENT 'Dirección o sucursal donde se retira el medicamento'
AFTER `fecha_vencimiento`;
