const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { executeQuery } = require('../config/database');

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

const authController = {
    
    // LOGIN - Reemplaza validar.php
    login: async (req, res) => {
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
            const externalToken = await callExternalAPI(username, password);
            const token = generateJWT(user, externalToken);

            res.json({
                success: true,
                message: 'Login exitoso',
                token: token,
                user: {
                    idauditor: user.id,
                    nombre: user.nombre,
                    apellido: user.apellido,
                    rol: user.rol,
                    foto: user.foto,
                    firma: user.firma
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                error: true,
                message: 'Error interno del servidor'
            });
        }
    },

    // LOGOUT
    logout: async (req, res) => {
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
    },

    // CAMBIO DE CONTRASEÑA - Reemplaza validarcambio.php
    changePassword: async (req, res) => {
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
    },

    // OBTENER PERFIL
    getProfile: async (req, res) => {
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
    }
};

module.exports = authController;
