// controllers/proveedoresController.js - VERSIÓN CORREGIDA
const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Función helper para manejar errores de validación
const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errors: errors.array()
        });
    }
    return null;
};

// Obtener todos los proveedores con paginación y filtros
const getProveedores = async (req, res) => {
    console.log('GET /api/proveedores - Query params:', req.query);

    try {
        // ✅ AGREGADO: Validar errores de express-validator
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const tipo = req.query.tipo || '';
        const activo = req.query.activo;

        console.log('Parámetros procesados:', { page, limit, offset, search, tipo, activo });

        // Construir la consulta base
        let whereConditions = ['1=1'];
        let queryParams = [];

        // Agregar condición de búsqueda
        if (search) {
            whereConditions.push('(p.razon_social LIKE ? OR p.cuit LIKE ? OR p.email_general LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Agregar filtro de tipo
        if (tipo && tipo !== '' && tipo !== 'todos') {
            whereConditions.push('p.tipo_proveedor = ?');
            queryParams.push(tipo);
        }

        // Agregar filtro de estado activo
        if (activo !== undefined && activo !== '' && activo !== null) {
            const activoValue = activo === 'true' || activo === true ? 1 : 0;
            whereConditions.push('p.activo = ?');
            queryParams.push(activoValue);
        }

        const whereClause = whereConditions.join(' AND ');

        // Obtener el total de registros
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM alt_proveedor p
            WHERE ${whereClause}
        `;

        const [countResult] = await pool.query(countQuery, queryParams);
        const total = countResult[0].total;

        // Obtener los proveedores con paginación
        const dataQuery = `
            SELECT 
                p.id_proveedor,
                p.razon_social,
                p.cuit,
                p.tipo_proveedor,
                CONCAT(
                    COALESCE(p.direccion_calle, ''), ' ',
                    COALESCE(p.direccion_numero, ''), ', ',
                    COALESCE(p.localidad, ''), ', ',
                    COALESCE(p.provincia, '')
                ) AS direccion,
                p.telefono_general,
                p.email_general,
                p.activo,
                p.fecha_alta as created_at,
                p.fecha_modificacion as updated_at,
                (SELECT COUNT(*) FROM alt_contacto_proveedor WHERE id_proveedor = p.id_proveedor) as total_contactos
            FROM alt_proveedor p
            WHERE ${whereClause}
            ORDER BY p.razon_social ASC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...queryParams, limit, offset];
        const [proveedores] = await pool.query(dataQuery, dataParams);

        const response = {
            success: true,
            data: proveedores,
            page: page, // ✅ CORREGIDO: Era currentPage, ahora es page
            totalPages: Math.ceil(total / limit),
            total: total, // ✅ CORREGIDO: Cambié totalRecords por total para consistencia
            limit
        };

        res.json(response);

    } catch (error) {
        console.error('Error detallado en getProveedores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener proveedores',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Obtener un proveedor por ID
const getProveedorById = async (req, res) => {
    try {
        // ✅ AGREGADO: Validar errores
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { id } = req.params;

        const query = `
            SELECT 
                p.id_proveedor,
                p.razon_social,
                p.cuit,
                p.tipo_proveedor,
                p.direccion_calle,
                p.direccion_numero,
                p.barrio,
                p.localidad,
                p.provincia,
                p.telefono_general,
                p.email_general,
                p.activo,
                p.fecha_alta as created_at
            FROM alt_proveedor p
            WHERE p.id_proveedor = ?
        `;

        const [rows] = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }

        // Obtener contactos del proveedor
        const contactosQuery = `
            SELECT 
                id_contacto,
                nombre,
                apellido,
                cargo,
                email,
                telefono,
                principal,
                fecha_alta
            FROM alt_contacto_proveedor
            WHERE id_proveedor = ?
            ORDER BY principal DESC, nombre ASC
        `;

        const [contactos] = await pool.query(contactosQuery, [id]);

        const proveedor = {
            ...rows[0],
            contactos: contactos
        };

        res.json({
            success: true,
            data: proveedor
        });

    } catch (error) {
        console.error('Error al obtener proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener proveedor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Crear un nuevo proveedor
const createProveedor = async (req, res) => {
    // ✅ AGREGADO: Validar errores primero
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    let connection;

    try {
        const {
            razon_social,
            cuit,
            tipo_proveedor,
            email_general,
            telefono_general,
            direccion_calle,
            direccion_numero,
            barrio,
            localidad,
            provincia,
            contactos = []
        } = req.body;

        // Verificar si ya existe un proveedor con el mismo CUIT
        const [existing] = await pool.query(
            'SELECT id_proveedor FROM alt_proveedor WHERE cuit = ?',
            [cuit]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un proveedor con ese CUIT'
            });
        }

        // ✅ MEJORADO: Manejo de conexión más seguro
        connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Insertar proveedor
            const insertProveedorQuery = `
                INSERT INTO alt_proveedor (
                    razon_social, 
                    cuit, 
                    tipo_proveedor, 
                    email_general,
                    telefono_general,
                    direccion_calle,
                    direccion_numero,
                    barrio,
                    localidad,
                    provincia,
                    activo,
                    fecha_alta,
                    fecha_modificacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            `;

            const [result] = await connection.query(insertProveedorQuery, [
                razon_social,
                cuit,
                tipo_proveedor || 'Laboratorio',
                email_general,
                telefono_general,
                direccion_calle,
                direccion_numero,
                barrio,
                localidad,
                provincia
            ]);

            const proveedorId = result.insertId;

            // Insertar contactos si los hay
            if (contactos && contactos.length > 0) {
                // ✅ MEJORADO: Validar que solo haya un contacto principal
                const principalCount = contactos.filter(c => c.principal).length;
                if (principalCount > 1) {
                    throw new Error('Solo puede haber un contacto principal');
                }

                for (const contacto of contactos) {
                    const insertContactoQuery = `
                        INSERT INTO alt_contacto_proveedor (
                            id_proveedor,
                            nombre,
                            apellido,
                            cargo,
                            email,
                            telefono,
                            principal,
                            fecha_alta,
                            fecha_modificacion
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    `;

                    await connection.query(insertContactoQuery, [
                        proveedorId,
                        contacto.nombre,
                        contacto.apellido,
                        contacto.cargo,
                        contacto.email,
                        contacto.telefono,
                        contacto.principal || false
                    ]);
                }
            }

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Proveedor creado exitosamente',
                data: {
                    id_proveedor: proveedorId
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error al crear proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear proveedor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    } finally {
        // ✅ CRÍTICO: Siempre liberar la conexión
        if (connection) connection.release();
    }
};

// Actualizar un proveedor
const updateProveedor = async (req, res) => {
    try {
        // ✅ AGREGADO: Validar errores
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { id } = req.params;
        const updates = req.body;

        // Verificar si el proveedor existe
        const [existing] = await pool.query(
            'SELECT id_proveedor FROM alt_proveedor WHERE id_proveedor = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }

        // Verificar si el CUIT ya existe en otro proveedor
        if (updates.cuit) {
            const [cuitExists] = await pool.query(
                'SELECT id_proveedor FROM alt_proveedor WHERE cuit = ? AND id_proveedor != ?',
                [updates.cuit, id]
            );

            if (cuitExists.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El CUIT ya está registrado en otro proveedor'
                });
            }
        }

        const updateFields = [];
        const values = [];

        // Construir query dinámicamente
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && updates[key] !== null) {
                updateFields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }

        updateFields.push('fecha_modificacion = NOW()');
        values.push(id);

        const query = `
            UPDATE alt_proveedor 
            SET ${updateFields.join(', ')}
            WHERE id_proveedor = ?
        `;

        await pool.query(query, values);

        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar proveedor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Eliminar (desactivar) un proveedor
const deleteProveedor = async (req, res) => {
    try {
        // ✅ AGREGADO: Validar errores
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { id } = req.params;

        const [result] = await pool.query(
            'UPDATE alt_proveedor SET activo = 0, fecha_modificacion = NOW() WHERE id_proveedor = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Proveedor desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar proveedor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Obtener contactos de un proveedor
const getContactosProveedor = async (req, res) => {
    try {
        // ✅ AGREGADO: Validar errores
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { id } = req.params;

        const query = `
            SELECT 
                c.id_contacto,
                c.id_proveedor,
                c.nombre,
                c.apellido,
                c.cargo,
                c.email,
                c.telefono,
                c.principal,
                c.fecha_alta,
                p.razon_social
            FROM alt_contacto_proveedor c
            INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
            WHERE c.id_proveedor = ?
            ORDER BY c.principal DESC, c.nombre ASC
        `;

        const [contactos] = await pool.query(query, [id]);

        res.json({
            success: true,
            data: contactos
        });

    } catch (error) {
        console.error('Error al obtener contactos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener contactos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Crear un contacto para un proveedor
const createContacto = async (req, res) => {
    // ✅ AGREGADO: Validar errores
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    let connection;

    try {
        const { id } = req.params;
        const {
            nombre,
            apellido,
            cargo,
            email,
            telefono,
            principal = false
        } = req.body;

        // Verificar que el proveedor existe
        const [proveedor] = await pool.query(
            'SELECT id_proveedor FROM alt_proveedor WHERE id_proveedor = ?',
            [id]
        );

        if (proveedor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }

        // ✅ MEJORADO: Manejo de conexión más seguro
        connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Si es principal, desmarcar otros contactos principales
            if (principal) {
                await connection.query(
                    'UPDATE alt_contacto_proveedor SET principal = false WHERE id_proveedor = ?',
                    [id]
                );
            }

            const query = `
                INSERT INTO alt_contacto_proveedor (
                    id_proveedor,
                    nombre,
                    apellido,
                    cargo,
                    email,
                    telefono,
                    principal,
                    fecha_alta,
                    fecha_modificacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;

            const [result] = await connection.query(query, [
                id,
                nombre,
                apellido,
                cargo,
                email,
                telefono,
                principal
            ]);

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Contacto creado exitosamente',
                data: {
                    id_contacto: result.insertId
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error al crear contacto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear contacto',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    } finally {
        // ✅ CRÍTICO: Siempre liberar la conexión
        if (connection) connection.release();
    }
};

// Actualizar un contacto
const updateContacto = async (req, res) => {
    // ✅ AGREGADO: Validar errores
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    let connection;

    try {
        const { id, contactoId } = req.params;
        const updates = req.body;

        // ✅ MEJORADO: Manejo de conexión más seguro
        connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Si se está marcando como principal, desmarcar otros
            if (updates.principal === true) {
                await connection.query(
                    'UPDATE alt_contacto_proveedor SET principal = false WHERE id_proveedor = ? AND id_contacto != ?',
                    [id, contactoId]
                );
            }

            const updateFields = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined && updates[key] !== null) {
                    updateFields.push(`${key} = ?`);
                    values.push(updates[key]);
                }
            });

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se proporcionaron campos para actualizar'
                });
            }

            updateFields.push('fecha_modificacion = NOW()');
            values.push(contactoId);

            const query = `
                UPDATE alt_contacto_proveedor 
                SET ${updateFields.join(', ')}
                WHERE id_contacto = ?
            `;

            const [result] = await connection.query(query, values);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contacto no encontrado'
                });
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'Contacto actualizado exitosamente'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error al actualizar contacto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar contacto',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    } finally {
        // ✅ CRÍTICO: Siempre liberar la conexión
        if (connection) connection.release();
    }
};

// Eliminar un contacto
const deleteContacto = async (req, res) => {
    try {
        // ✅ AGREGADO: Validar errores
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { contactoId } = req.params;

        const [result] = await pool.query(
            'DELETE FROM alt_contacto_proveedor WHERE id_contacto = ?',
            [contactoId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contacto no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Contacto eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar contacto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar contacto',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Obtener tipos de proveedores
const getTiposProveedores = async (req, res) => {
    try {
        const tipos = [
            { value: 'Laboratorio', label: 'Laboratorio' },
            { value: 'Droguería', label: 'Droguería' },
            { value: 'Ambos', label: 'Ambos' }
        ];

        res.json({
            success: true,
            data: tipos
        });

    } catch (error) {
        console.error('Error al obtener tipos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tipos de proveedores',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Obtener estadísticas
const getEstadisticas = async (req, res) => {
    try {
        const queries = {
            total: 'SELECT COUNT(*) as count FROM alt_proveedor',
            activos: 'SELECT COUNT(*) as count FROM alt_proveedor WHERE activo = 1',
            inactivos: 'SELECT COUNT(*) as count FROM alt_proveedor WHERE activo = 0',
            laboratorios: 'SELECT COUNT(*) as count FROM alt_proveedor WHERE tipo_proveedor = "Laboratorio"',
            droguerias: 'SELECT COUNT(*) as count FROM alt_proveedor WHERE tipo_proveedor = "Droguería"',
            ambos: 'SELECT COUNT(*) as count FROM alt_proveedor WHERE tipo_proveedor = "Ambos"',
            contactos: 'SELECT COUNT(*) as count FROM alt_contacto_proveedor'
        };

        const results = {};

        for (const [key, query] of Object.entries(queries)) {
            const [rows] = await pool.query(query);
            results[key] = rows[0].count;
        }

        res.json({
            success: true,
            data: {
                total_proveedores: results.total,
                proveedores_activos: results.activos,
                proveedores_inactivos: results.inactivos,
                laboratorios: results.laboratorios,
                droguerias: results.droguerias,
                ambos: results.ambos,
                total_contactos: results.contactos
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

// Búsqueda rápida
const buscarProveedores = async (req, res) => {
    try {
        // ✅ AGREGADO: Validar errores de express-validator
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { q, limit = 10 } = req.query;

        // ✅ AGREGADO: Validación adicional en controlador
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'La búsqueda debe tener al menos 2 caracteres'
            });
        }

        const query = `
            SELECT 
                id_proveedor,
                razon_social,
                cuit,
                tipo_proveedor,
                email_general,
                telefono_general
            FROM alt_proveedor
            WHERE activo = 1 AND (
                razon_social LIKE ? OR 
                cuit LIKE ? OR 
                email_general LIKE ?
            )
            ORDER BY razon_social ASC
            LIMIT ?
        `;

        const searchPattern = `%${q.trim()}%`;
        const [proveedores] = await pool.query(query, [
            searchPattern,
            searchPattern,
            searchPattern,
            parseInt(limit)
        ]);

        res.json({
            success: true,
            data: proveedores
        });

    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({
            success: false,
            message: 'Error en la búsqueda',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

module.exports = {
    getProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    getContactosProveedor,
    createContacto,
    updateContacto,
    deleteContacto,
    getTiposProveedores,
    getEstadisticas,
    buscarProveedores
};