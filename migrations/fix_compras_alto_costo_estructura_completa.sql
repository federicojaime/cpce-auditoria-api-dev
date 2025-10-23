-- ============================================================================
-- MIGRACIÓN COMPLETA: Estructura de Compras de Alto Costo
-- ============================================================================
-- Fecha: 2025-10-22
-- Descripción: Reorganiza la estructura de compras para mantener relaciones correctas
--              entre solicitudes de presupuesto, proveedores adjudicados y órdenes de compra
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 1: Agregar campos faltantes a rec_compras_alto_costo
-- ----------------------------------------------------------------------------

-- Esta tabla representa una ORDEN DE COMPRA para una auditoría específica
-- Debe tener toda la información del proveedor ganador y el monto

ALTER TABLE `rec_compras_alto_costo`
ADD COLUMN `id_proveedor` int(11) DEFAULT NULL COMMENT 'FK al proveedor adjudicado (alt_proveedor.id_proveedor)' AFTER `idreceta`,
ADD COLUMN `id_solicitud_presupuesto` int(11) DEFAULT NULL COMMENT 'FK a la solicitud de presupuesto original (alt_solicitud_presupuesto.id_solicitud)' AFTER `id_proveedor`,
ADD COLUMN `monto_total` decimal(15,2) DEFAULT 0.00 COMMENT 'Monto total de la orden de compra' AFTER `id_solicitud_presupuesto`,
ADD COLUMN `fecha_estimada_entrega` datetime DEFAULT NULL COMMENT 'Fecha estimada de entrega del proveedor' AFTER `fecha_envio_proveedores`,
ADD COLUMN `fecha_entrega_real` datetime DEFAULT NULL COMMENT 'Fecha real de entrega de medicamentos' AFTER `fecha_estimada_entrega`,
ADD COLUMN `lugar_retiro` varchar(255) DEFAULT NULL COMMENT 'Lugar donde se retiran los medicamentos' AFTER `fecha_entrega_real`,
ADD COLUMN `usuario_adjudico` int(11) DEFAULT NULL COMMENT 'Usuario que adjudicó el presupuesto' AFTER `id_usuario_compras`;

-- Actualizar el ENUM de estado_compra para reflejar mejor el flujo
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

-- Crear índices para mejorar performance
CREATE INDEX `idx_proveedor` ON `rec_compras_alto_costo` (`id_proveedor`);
CREATE INDEX `idx_solicitud` ON `rec_compras_alto_costo` (`id_solicitud_presupuesto`);
CREATE INDEX `idx_estado` ON `rec_compras_alto_costo` (`estado_compra`);
CREATE INDEX `idx_fecha_entrega` ON `rec_compras_alto_costo` (`fecha_estimada_entrega`);

-- ----------------------------------------------------------------------------
-- PASO 2: Crear tabla de DETALLE de compras (relación compra-medicamento-precio)
-- ----------------------------------------------------------------------------

-- Esta tabla vincula cada orden de compra con los medicamentos específicos y sus precios
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
  KEY `idx_medicamento` (`id_medicamento`),
  CONSTRAINT `fk_detalle_compra` FOREIGN KEY (`id_compra`) REFERENCES `rec_compras_alto_costo` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detalle de medicamentos por orden de compra';

-- ----------------------------------------------------------------------------
-- PASO 3: Agregar foreign keys para mantener integridad referencial
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

-- ----------------------------------------------------------------------------
-- RESUMEN DE LA ESTRUCTURA
-- ----------------------------------------------------------------------------

/*
FLUJO COMPLETO:

1. SOLICITUD DE PRESUPUESTO (alt_solicitud_presupuesto)
   - Se crea con estado ENVIADO
   - Se envía a múltiples proveedores

2. RESPUESTAS DE PROVEEDORES (alt_presupuesto_respuesta_detalle)
   - Cada proveedor responde con precios
   - Estado cambia a COMPLETADO cuando todos responden

3. ADJUDICACIÓN → ORDEN DE COMPRA (rec_compras_alto_costo)
   - Auditor elige mejor proveedor
   - Se crea UNA orden por cada auditoría
   - Se registra: proveedor ganador, monto total, fecha entrega, lugar retiro
   - Estado inicial: 'adjudicado'

4. DETALLE DE LA ORDEN (rec_compras_alto_costo_detalle)
   - Se registran todos los medicamentos de la orden
   - Con precio unitario, cantidad, precio total
   - Snapshot de nombre y presentación

5. ENTREGA
   - Proveedor confirma → estado 'confirmado'
   - Prepara pedido → estado 'en_preparacion'
   - Listo para retirar → estado 'listo_retiro'
   - Se retira/entrega → estado 'entregado'
   - Se completa → estado 'finalizado'

RELACIONES:
- rec_compras_alto_costo.id_proveedor → alt_proveedor.id_proveedor
- rec_compras_alto_costo.id_solicitud_presupuesto → alt_solicitud_presupuesto.id_solicitud
- rec_compras_alto_costo.idreceta → rec_receta_alto_costo.idreceta
- rec_compras_alto_costo_detalle.id_compra → rec_compras_alto_costo.id
*/

-- FIN DE LA MIGRACIÓN
