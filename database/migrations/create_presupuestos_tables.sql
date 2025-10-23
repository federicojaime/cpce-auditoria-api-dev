-- Tabla principal de solicitudes de presupuesto
CREATE TABLE IF NOT EXISTS presupuesto_solicitudes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_numero VARCHAR(50) UNIQUE NOT NULL,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_envia INT NOT NULL,
    estado ENUM('pendiente', 'en_proceso', 'finalizada', 'cancelada') DEFAULT 'pendiente',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_envia) REFERENCES usuarios(id),
    INDEX idx_lote_numero (lote_numero),
    INDEX idx_estado (estado),
    INDEX idx_fecha_envio (fecha_envio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de proveedores incluidos en cada solicitud
CREATE TABLE IF NOT EXISTS presupuesto_solicitud_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    fecha_expiracion DATETIME NOT NULL,
    fecha_respuesta DATETIME NULL,
    estado ENUM('pendiente', 'respondido', 'expirado') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES presupuesto_solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    INDEX idx_token (token),
    INDEX idx_solicitud (solicitud_id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_estado (estado),
    UNIQUE KEY unique_solicitud_proveedor (solicitud_id, proveedor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de auditorías incluidas en cada solicitud
CREATE TABLE IF NOT EXISTS presupuesto_solicitud_auditorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    auditoria_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES presupuesto_solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (auditoria_id) REFERENCES auditorias(id),
    INDEX idx_solicitud (solicitud_id),
    INDEX idx_auditoria (auditoria_id),
    UNIQUE KEY unique_solicitud_auditoria (solicitud_id, auditoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de respuestas de proveedores
CREATE TABLE IF NOT EXISTS presupuesto_respuestas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_proveedor_id INT NOT NULL,
    auditoria_id INT NOT NULL,
    medicamento_id INT NOT NULL,
    acepta BOOLEAN NOT NULL,
    precio DECIMAL(10, 2) NULL,
    fecha_retiro DATE NULL,
    fecha_vencimiento DATE NULL,
    comentarios TEXT NULL,
    fecha_respuesta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_proveedor_id) REFERENCES presupuesto_solicitud_proveedores(id) ON DELETE CASCADE,
    FOREIGN KEY (auditoria_id) REFERENCES auditorias(id),
    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id),
    INDEX idx_solicitud_proveedor (solicitud_proveedor_id),
    INDEX idx_auditoria (auditoria_id),
    INDEX idx_medicamento (medicamento_id),
    INDEX idx_acepta (acepta),
    UNIQUE KEY unique_respuesta (solicitud_proveedor_id, auditoria_id, medicamento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS presupuesto_notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    tipo ENUM('respuesta_recibida', 'expiracion_proxima', 'solicitud_enviada') NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    fecha_notificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES presupuesto_solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    INDEX idx_solicitud (solicitud_id),
    INDEX idx_leido (leido),
    INDEX idx_fecha (fecha_notificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
