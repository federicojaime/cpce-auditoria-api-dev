-- Agregar índice único a rec_compras_alto_costo para evitar duplicados
-- Esto permite usar ON DUPLICATE KEY UPDATE correctamente

ALTER TABLE rec_compras_alto_costo
ADD UNIQUE KEY idx_receta_unique (idreceta);

-- Verificar índices
SHOW INDEX FROM rec_compras_alto_costo;
