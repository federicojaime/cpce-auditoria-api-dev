-- ============================================
-- SCRIPT DE CREACIÓN DE TABLAS
-- MÓDULO DE ALTO COSTO - COMPRAS Y PROVEEDORES
-- ============================================

-- Tabla principal para gestionar el proceso de compras
CREATE TABLE IF NOT EXISTS rec_compras_alto_costo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idreceta INT NOT NULL,
    estado_compra ENUM('pendiente_envio', 'enviado_proveedores', 'con_presupuestos', 'finalizado') DEFAULT 'pendiente_envio',
    fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_envio_proveedores DATETIME NULL,
    id_usuario_compras INT NULL,
    observaciones TEXT NULL,
    FOREIGN KEY (idreceta) REFERENCES rec_receta_alto_costo(idreceta),
    FOREIGN KEY (id_usuario_compras) REFERENCES user_au(id),
    INDEX idx_estado (estado_compra),
    INDEX idx_receta (idreceta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS rec_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NULL,
    direccion TEXT NULL,
    cuit VARCHAR(20) NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_email (email),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla que relaciona qué proveedores se contactaron para cada medicamento
CREATE TABLE IF NOT EXISTS rec_compras_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    idreceta INT NOT NULL,
    nro_orden INT NOT NULL,
    id_proveedor INT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('enviado', 'presupuesto_recibido', 'rechazado') DEFAULT 'enviado',
    FOREIGN KEY (id_compra) REFERENCES rec_compras_alto_costo(id) ON DELETE CASCADE,
    FOREIGN KEY (id_proveedor) REFERENCES rec_proveedores(id),
    INDEX idx_estado (estado),
    INDEX idx_receta_orden (idreceta, nro_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de usuarios proveedores (para login)
CREATE TABLE IF NOT EXISTS rec_proveedores_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso DATETIME NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES rec_proveedores(id) ON DELETE CASCADE,
    INDEX idx_email (email),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de presupuestos de proveedores
CREATE TABLE IF NOT EXISTS rec_presupuestos_alto_costo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_compra_proveedor INT NOT NULL,
    idreceta INT NOT NULL,
    nro_orden INT NOT NULL,
    id_proveedor INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad_disponible INT NOT NULL,
    tiempo_entrega_dias INT NULL,
    observaciones TEXT NULL,
    fecha_presupuesto DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario_proveedor INT NOT NULL,
    FOREIGN KEY (id_compra_proveedor) REFERENCES rec_compras_proveedores(id) ON DELETE CASCADE,
    FOREIGN KEY (id_proveedor) REFERENCES rec_proveedores(id),
    FOREIGN KEY (id_usuario_proveedor) REFERENCES rec_proveedores_usuarios(id),
    INDEX idx_receta_orden (idreceta, nro_orden),
    INDEX idx_proveedor (id_proveedor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para marcar qué presupuesto fue seleccionado
CREATE TABLE IF NOT EXISTS rec_presupuestos_seleccionados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_presupuesto INT NOT NULL UNIQUE,
    idreceta INT NOT NULL,
    nro_orden INT NOT NULL,
    fecha_seleccion DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario_seleccion INT NOT NULL,
    pdf_generado BOOLEAN DEFAULT FALSE,
    pdf_url VARCHAR(500) NULL,
    fecha_pdf DATETIME NULL,
    FOREIGN KEY (id_presupuesto) REFERENCES rec_presupuestos_alto_costo(id),
    FOREIGN KEY (id_usuario_seleccion) REFERENCES user_au(id),
    INDEX idx_receta (idreceta),
    INDEX idx_pdf_generado (pdf_generado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS DE EJEMPLO PARA PROVEEDORES
-- ============================================

-- Insertar proveedores de ejemplo
INSERT INTO rec_proveedores (nombre, email, telefono, cuit, direccion, activo) VALUES
('Farmacia Central', 'compras@farmaciacentral.com.ar', '351-1234567', '30-12345678-9', 'Av. Colón 123, Córdoba', TRUE),
('Droguería del Sur', 'presupuestos@drogueriadelsur.com', '351-7654321', '30-87654321-0', 'Av. Vélez Sarsfield 456, Córdoba', TRUE),
('Distribuidora Médica SA', 'ventas@distmedica.com.ar', '351-9876543', '30-11223344-5', 'Bv. San Juan 789, Córdoba', TRUE),
('Farmacorp SRL', 'cotizaciones@farmacorp.com', '351-5555555', '30-55667788-9', 'Av. Rafael Núñez 321, Córdoba', TRUE),
('Droguería Norte', 'info@droguerianorte.com.ar', '351-4444444', '30-99887766-5', 'Rondeau 654, Córdoba', TRUE)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- ============================================
-- SCRIPT PARA VERIFICAR TABLAS CREADAS
-- ============================================

-- Verificar estructura de tablas
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'cpce_auditoria'
  AND TABLE_NAME LIKE 'rec_%alto_costo%'
     OR TABLE_NAME LIKE 'rec_compras%'
     OR TABLE_NAME LIKE 'rec_proveedores%'
     OR TABLE_NAME LIKE 'rec_presupuestos%'
ORDER BY TABLE_NAME;

-- ============================================
-- QUERIES ÚTILES PARA DESARROLLO
-- ============================================

-- Ver todas las recetas aprobadas pendientes de enviar a proveedores
SELECT
    r.idreceta,
    p.apellido,
    p.nombre,
    COUNT(DISTINCT pm.nro_orden) as medicamentos_aprobados,
    c.estado_compra,
    c.fecha_recepcion
FROM rec_receta_alto_costo r
INNER JOIN rec_paciente p ON r.idpaciente = p.id
INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
LEFT JOIN rec_compras_alto_costo c ON r.idreceta = c.idreceta
WHERE pm.estado_auditoria = 1
  AND (c.estado_compra = 'pendiente_envio' OR c.estado_compra IS NULL)
GROUP BY r.idreceta, p.apellido, p.nombre, c.estado_compra, c.fecha_recepcion;

-- Ver estado de compras por receta
SELECT
    c.idreceta,
    c.estado_compra,
    c.fecha_recepcion,
    c.fecha_envio_proveedores,
    COUNT(DISTINCT cp.id_proveedor) as proveedores_contactados,
    COUNT(DISTINCT pre.id) as presupuestos_recibidos
FROM rec_compras_alto_costo c
LEFT JOIN rec_compras_proveedores cp ON c.id = cp.id_compra
LEFT JOIN rec_presupuestos_alto_costo pre ON cp.id = pre.id_compra_proveedor
GROUP BY c.idreceta, c.estado_compra, c.fecha_recepcion, c.fecha_envio_proveedores;

-- Ver presupuestos por medicamento
SELECT
    pm.idreceta,
    pm.nro_orden,
    v.monodroga,
    v.nombre_comercial,
    prov.nombre as proveedor,
    pre.precio_unitario,
    pre.cantidad_disponible,
    pre.tiempo_entrega_dias,
    pre.fecha_presupuesto,
    ps.id as seleccionado
FROM rec_prescrmedicamento_alto_costo pm
INNER JOIN vad_020 v ON pm.codigo = v.codigo
INNER JOIN rec_compras_proveedores cp ON pm.idreceta = cp.idreceta AND pm.nro_orden = cp.nro_orden
INNER JOIN rec_proveedores prov ON cp.id_proveedor = prov.id
LEFT JOIN rec_presupuestos_alto_costo pre ON cp.id = pre.id_compra_proveedor
LEFT JOIN rec_presupuestos_seleccionados ps ON pre.id = ps.id_presupuesto
WHERE pm.estado_auditoria = 1
ORDER BY pm.idreceta, pm.nro_orden, pre.precio_unitario;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
