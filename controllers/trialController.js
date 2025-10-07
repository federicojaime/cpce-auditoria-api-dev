import { executeQuery } from '../config/database.js';
import { getTrialInfo } from '../middleware/trialValidation.js';

/**
 * Obtener información de prueba del usuario actual
 */
export const getMyTrialInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const trialInfo = await getTrialInfo(userId);

        if (!trialInfo) {
            return res.status(404).json({
                error: true,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            trial: trialInfo
        });

    } catch (error) {
        console.error('Error obteniendo información de prueba:', error);
        res.status(500).json({
            error: true,
            message: 'Error al obtener información de prueba'
        });
    }
};

/**
 * Listar todos los usuarios de prueba (solo admin)
 */
export const listTrialUsers = async (req, res) => {
    try {
        const query = `
            SELECT
                id,
                user,
                nombre,
                apellido,
                dni,
                es_prueba,
                fecha_inicio_prueba,
                fecha_expiracion_prueba,
                dias_prueba,
                ultimo_acceso,
                estado_cuenta,
                DATEDIFF(fecha_expiracion_prueba, NOW()) as dias_restantes
            FROM user_au
            WHERE es_prueba = 1
            ORDER BY fecha_expiracion_prueba ASC
        `;

        const users = await executeQuery(query);

        const usersFormatted = users.map(user => ({
            id: user.id,
            username: user.user,
            nombre: user.nombre,
            apellido: user.apellido,
            dni: user.dni,
            fechaInicio: user.fecha_inicio_prueba,
            fechaExpiracion: user.fecha_expiracion_prueba,
            diasPrueba: user.dias_prueba,
            diasRestantes: user.dias_restantes || 0,
            ultimoAcceso: user.ultimo_acceso,
            estadoCuenta: user.estado_cuenta,
            expirado: user.dias_restantes < 0
        }));

        res.json({
            success: true,
            total: usersFormatted.length,
            users: usersFormatted
        });

    } catch (error) {
        console.error('Error listando usuarios de prueba:', error);
        res.status(500).json({
            error: true,
            message: 'Error al listar usuarios de prueba'
        });
    }
};

/**
 * Crear o convertir un usuario a modo prueba (solo admin)
 */
export const setUserTrial = async (req, res) => {
    try {
        const { userId, diasPrueba } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'El ID de usuario es requerido'
            });
        }

        const dias = diasPrueba || 30;

        // Verificar que el usuario existe
        const checkQuery = 'SELECT id, user FROM user_au WHERE id = ?';
        const userCheck = await executeQuery(checkQuery, [userId]);

        if (userCheck.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Usuario no encontrado'
            });
        }

        // Actualizar usuario a modo prueba
        const updateQuery = `
            UPDATE user_au
            SET es_prueba = 1,
                fecha_inicio_prueba = NOW(),
                dias_prueba = ?,
                fecha_expiracion_prueba = DATE_ADD(NOW(), INTERVAL ? DAY),
                estado_cuenta = 'prueba_activa'
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [dias, dias, userId]);

        res.json({
            success: true,
            message: `Usuario configurado como prueba con ${dias} días`,
            user: {
                id: userCheck[0].id,
                username: userCheck[0].user,
                diasPrueba: dias
            }
        });

    } catch (error) {
        console.error('Error configurando usuario de prueba:', error);
        res.status(500).json({
            error: true,
            message: 'Error al configurar usuario de prueba'
        });
    }
};

/**
 * Extender días de prueba de un usuario (solo admin)
 */
export const extendTrial = async (req, res) => {
    try {
        const { userId, diasAdicionales } = req.body;

        if (!userId || !diasAdicionales) {
            return res.status(400).json({
                error: true,
                message: 'El ID de usuario y los días adicionales son requeridos'
            });
        }

        // Verificar que el usuario existe y es de prueba
        const checkQuery = 'SELECT id, user, es_prueba, fecha_expiracion_prueba FROM user_au WHERE id = ?';
        const userCheck = await executeQuery(checkQuery, [userId]);

        if (userCheck.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Usuario no encontrado'
            });
        }

        if (userCheck[0].es_prueba !== 1) {
            return res.status(400).json({
                error: true,
                message: 'El usuario no es de prueba'
            });
        }

        // Extender fecha de expiración
        const updateQuery = `
            UPDATE user_au
            SET fecha_expiracion_prueba = DATE_ADD(fecha_expiracion_prueba, INTERVAL ? DAY),
                dias_prueba = dias_prueba + ?,
                estado_cuenta = 'prueba_activa'
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [diasAdicionales, diasAdicionales, userId]);

        // Obtener nueva fecha de expiración
        const newInfo = await executeQuery(
            'SELECT fecha_expiracion_prueba, dias_prueba FROM user_au WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: `Prueba extendida por ${diasAdicionales} días adicionales`,
            user: {
                id: userCheck[0].id,
                username: userCheck[0].user,
                nuevaFechaExpiracion: newInfo[0].fecha_expiracion_prueba,
                totalDiasPrueba: newInfo[0].dias_prueba
            }
        });

    } catch (error) {
        console.error('Error extendiendo prueba:', error);
        res.status(500).json({
            error: true,
            message: 'Error al extender período de prueba'
        });
    }
};

/**
 * Convertir usuario de prueba a usuario definitivo (solo admin)
 */
export const convertToPermament = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'El ID de usuario es requerido'
            });
        }

        // Verificar que el usuario existe
        const checkQuery = 'SELECT id, user FROM user_au WHERE id = ?';
        const userCheck = await executeQuery(checkQuery, [userId]);

        if (userCheck.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Usuario no encontrado'
            });
        }

        // Convertir a usuario definitivo
        const updateQuery = `
            UPDATE user_au
            SET es_prueba = 0,
                estado_cuenta = 'activa'
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [userId]);

        res.json({
            success: true,
            message: 'Usuario convertido a cuenta definitiva exitosamente',
            user: {
                id: userCheck[0].id,
                username: userCheck[0].user
            }
        });

    } catch (error) {
        console.error('Error convirtiendo a usuario definitivo:', error);
        res.status(500).json({
            error: true,
            message: 'Error al convertir usuario'
        });
    }
};

/**
 * Suspender cuenta de usuario (solo admin)
 */
export const suspendUser = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'El ID de usuario es requerido'
            });
        }

        const updateQuery = "UPDATE user_au SET estado_cuenta = 'suspendida' WHERE id = ?";
        await executeQuery(updateQuery, [userId]);

        res.json({
            success: true,
            message: 'Usuario suspendido exitosamente'
        });

    } catch (error) {
        console.error('Error suspendiendo usuario:', error);
        res.status(500).json({
            error: true,
            message: 'Error al suspender usuario'
        });
    }
};

/**
 * Reactivar cuenta de usuario (solo admin)
 */
export const reactivateUser = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'El ID de usuario es requerido'
            });
        }

        // Obtener información del usuario
        const checkQuery = 'SELECT es_prueba, fecha_expiracion_prueba FROM user_au WHERE id = ?';
        const userCheck = await executeQuery(checkQuery, [userId]);

        if (userCheck.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Usuario no encontrado'
            });
        }

        const user = userCheck[0];
        let newStatus = 'activa';

        // Si es de prueba, verificar si está vigente
        if (user.es_prueba === 1 && user.fecha_expiracion_prueba) {
            const now = new Date();
            const expiracion = new Date(user.fecha_expiracion_prueba);
            newStatus = now < expiracion ? 'prueba_activa' : 'prueba_expirada';
        }

        const updateQuery = 'UPDATE user_au SET estado_cuenta = ? WHERE id = ?';
        await executeQuery(updateQuery, [newStatus, userId]);

        res.json({
            success: true,
            message: 'Usuario reactivado exitosamente',
            estadoCuenta: newStatus
        });

    } catch (error) {
        console.error('Error reactivando usuario:', error);
        res.status(500).json({
            error: true,
            message: 'Error al reactivar usuario'
        });
    }
};
