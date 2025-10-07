import { executeQuery } from '../config/database.js';

/**
 * Middleware para validar el estado de prueba del usuario en cada petición
 * Se aplica a rutas protegidas que requieren validación de estado de cuenta
 */
export const validateTrialMiddleware = async (req, res, next) => {
    try {
        // El usuario debe estar autenticado (viene del middleware auth.js)
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                error: true,
                message: 'Usuario no autenticado'
            });
        }

        const userId = req.user.id;

        // Obtener información actualizada del usuario
        const query = `
            SELECT id, user, nombre, apellido, es_prueba, fecha_inicio_prueba,
                   fecha_expiracion_prueba, dias_prueba, estado_cuenta, ultimo_acceso
            FROM user_au
            WHERE id = ?
        `;
        const results = await executeQuery(query, [userId]);

        if (results.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Usuario no encontrado'
            });
        }

        const user = results[0];

        // Si la cuenta está suspendida
        if (user.estado_cuenta === 'suspendida') {
            return res.status(403).json({
                error: true,
                message: 'Tu cuenta ha sido suspendida. Contacta al administrador.',
                suspended: true
            });
        }

        // Si es usuario de prueba
        if (user.es_prueba === 1) {
            const now = new Date();
            const fechaExpiracion = user.fecha_expiracion_prueba ? new Date(user.fecha_expiracion_prueba) : null;

            // Verificar si el período de prueba expiró
            if (fechaExpiracion && now > fechaExpiracion) {
                // Actualizar estado a expirado si no lo está
                if (user.estado_cuenta !== 'prueba_expirada') {
                    await executeQuery(
                        "UPDATE user_au SET estado_cuenta = 'prueba_expirada' WHERE id = ?",
                        [userId]
                    );
                }

                return res.status(403).json({
                    error: true,
                    message: 'Tu período de prueba ha expirado. Por favor, contacta al administrador para activar tu cuenta.',
                    expired: true,
                    fechaExpiracion: fechaExpiracion
                });
            }

            // Calcular días restantes
            if (fechaExpiracion) {
                const diasRestantes = Math.ceil((fechaExpiracion - now) / (1000 * 60 * 60 * 24));

                // Agregar información de prueba al objeto req para uso posterior
                req.trialInfo = {
                    esPrueba: true,
                    diasRestantes: diasRestantes,
                    fechaExpiracion: fechaExpiracion,
                    warning: diasRestantes <= 7 ? `Tu período de prueba expira en ${diasRestantes} día(s)` : null
                };
            }
        } else {
            req.trialInfo = {
                esPrueba: false,
                isPermanent: true
            };
        }

        // Actualizar último acceso
        await executeQuery('UPDATE user_au SET ultimo_acceso = NOW() WHERE id = ?', [userId]);

        next();

    } catch (error) {
        console.error('Error en middleware de validación de prueba:', error);
        res.status(500).json({
            error: true,
            message: 'Error al validar estado de cuenta'
        });
    }
};

/**
 * Función helper para obtener información de prueba de un usuario
 * Útil para endpoints que necesitan mostrar información de prueba sin bloquear acceso
 */
export const getTrialInfo = async (userId) => {
    try {
        const query = `
            SELECT
                es_prueba,
                fecha_inicio_prueba,
                fecha_expiracion_prueba,
                dias_prueba,
                estado_cuenta,
                DATEDIFF(fecha_expiracion_prueba, NOW()) as dias_restantes
            FROM user_au
            WHERE id = ?
        `;
        const results = await executeQuery(query, [userId]);

        if (results.length === 0) {
            return null;
        }

        const user = results[0];

        if (user.es_prueba === 1) {
            return {
                esPrueba: true,
                fechaInicio: user.fecha_inicio_prueba,
                fechaExpiracion: user.fecha_expiracion_prueba,
                diasPrueba: user.dias_prueba,
                diasRestantes: user.dias_restantes || 0,
                estadoCuenta: user.estado_cuenta,
                activo: user.estado_cuenta === 'prueba_activa'
            };
        }

        return {
            esPrueba: false,
            estadoCuenta: user.estado_cuenta,
            isPermanent: true
        };

    } catch (error) {
        console.error('Error obteniendo información de prueba:', error);
        throw error;
    }
};

export default validateTrialMiddleware;
