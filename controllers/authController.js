import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { executeQuery } from '../config/database.js';

// Función para llamar a la API externa
const callExternalAPI = async (username, password) => {
    try {
        const credentials = JSON.stringify({
            username: username,
            password: password
        });

        const response = await fetch(process.env.EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': credentials.length
            },
            body: credentials
        });

        if (response.status === 200) {
            const data = await response.json();
            return data.access_token;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error en API externa:', error);
        return null;
    }
};

// Función para generar MD5
const generateMD5 = (password) => {
    return crypto.createHash('md5').update(password).digest('hex');
};

// Función para generar JWT token
const generateJWT = (user, externalToken = null) => {
    const payload = {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        foto: user.foto,
        firma: user.firma,
        token: externalToken || 'no token found'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.SESSION_EXPIRE || '24h'
    });
};

// Función para validar el estado de prueba del usuario
const validateTrialStatus = async (user) => {
    const now = new Date();

    // Si es usuario de prueba
    if (user.es_prueba === 1) {
        // Si no tiene fecha de inicio, establecerla ahora
        if (!user.fecha_inicio_prueba) {
            const updateQuery = `
                UPDATE user_au
                SET fecha_inicio_prueba = NOW(),
                    fecha_expiracion_prueba = DATE_ADD(NOW(), INTERVAL dias_prueba DAY),
                    ultimo_acceso = NOW()
                WHERE id = ?
            `;
            await executeQuery(updateQuery, [user.id]);

            // Recalcular fecha de expiración
            const diasPrueba = user.dias_prueba || 30;
            user.fecha_expiracion_prueba = new Date(now.getTime() + diasPrueba * 24 * 60 * 60 * 1000);
            user.dias_restantes = diasPrueba;
            user.estado_cuenta = 'prueba_activa';

            return {
                valid: true,
                isFirstAccess: true,
                diasRestantes: diasPrueba,
                fechaExpiracion: user.fecha_expiracion_prueba
            };
        }

        // Actualizar último acceso
        await executeQuery('UPDATE user_au SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

        const fechaExpiracion = new Date(user.fecha_expiracion_prueba);

        // Verificar si el período de prueba expiró
        if (now > fechaExpiracion) {
            // Actualizar estado a expirado
            await executeQuery(
                "UPDATE user_au SET estado_cuenta = 'prueba_expirada' WHERE id = ?",
                [user.id]
            );

            return {
                valid: false,
                expired: true,
                message: 'Tu período de prueba ha expirado. Por favor, contacta al administrador para activar tu cuenta.',
                fechaExpiracion: fechaExpiracion
            };
        }

        // Calcular días restantes
        const diasRestantes = Math.ceil((fechaExpiracion - now) / (1000 * 60 * 60 * 24));

        return {
            valid: true,
            diasRestantes: diasRestantes,
            fechaExpiracion: fechaExpiracion,
            warning: diasRestantes <= 7 ? `Tu período de prueba expira en ${diasRestantes} día(s)` : null
        };
    }

    // Usuario definitivo (no es de prueba)
    // Actualizar último acceso
    await executeQuery('UPDATE user_au SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

    return {
        valid: true,
        isPermanent: true
    };
};

// LOGIN - Reemplaza validar.php
export const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: true,
                message: 'Datos inválidos',
                details: errors.array()
            });
        }

        const { username, password } = req.body;
        const hashedPassword = generateMD5(password);

        const query = 'SELECT * FROM user_au WHERE user = ? AND password = ?';
        const results = await executeQuery(query, [username, hashedPassword]);

        if (results.length === 0) {
            return res.status(401).json({
                error: true,
                message: 'Usuario y/o contraseña incorrectos.'
            });
        }

        const user = results[0];

        // Validar estado de prueba
        const trialStatus = await validateTrialStatus(user);

        if (!trialStatus.valid) {
            return res.status(403).json({
                error: true,
                message: trialStatus.message,
                expired: true,
                fechaExpiracion: trialStatus.fechaExpiracion
            });
        }

        const externalToken = await callExternalAPI(username, password);
        const token = generateJWT(user, externalToken);

        // Preparar respuesta con información de prueba si aplica
        const response = {
            success: true,
            message: 'Login exitoso',
            token: token,
            user: {
                idauditor: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                rol: user.rol,
                foto: user.foto,
                firma: user.firma,
                esPrueba: user.es_prueba === 1,
                estadoCuenta: user.estado_cuenta
            }
        };

        // Agregar información de prueba si corresponde
        if (user.es_prueba === 1) {
            response.trial = {
                diasRestantes: trialStatus.diasRestantes,
                fechaExpiracion: trialStatus.fechaExpiracion,
                warning: trialStatus.warning,
                isFirstAccess: trialStatus.isFirstAccess || false
            };
        }

        res.json(response);

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            error: true,
            message: 'Error interno del servidor'
        });
    }
};

// LOGOUT
export const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            error: true,
            message: 'Error al cerrar sesión'
        });
    }
};

// CAMBIO DE CONTRASEÑA
export const changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: true,
                message: 'Datos inválidos',
                details: errors.array()
            });
        }

        const { username, dni, password_nuevo, password_nuevo_repetir } = req.body;

        if (password_nuevo !== password_nuevo_repetir) {
            return res.status(400).json({
                error: true,
                message: 'Las contraseñas no coinciden'
            });
        }

        const query = 'SELECT * FROM user_au WHERE user = ? AND dni = ?';
        const results = await executeQuery(query, [username, dni]);

        if (results.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Usuario o DNI incorrectos'
            });
        }

        const newPasswordHash = generateMD5(password_nuevo);
        const updateQuery = 'UPDATE user_au SET password = ? WHERE user = ? AND dni = ?';
        await executeQuery(updateQuery, [newPasswordHash, username, dni]);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error en cambio de contraseña:', error);
        res.status(500).json({
            error: true,
            message: 'Error interno del servidor'
        });
    }
};

// OBTENER PERFIL
export const getProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            error: true,
            message: 'Error al obtener perfil'
        });
    }
};