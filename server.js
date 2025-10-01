const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS PRIMERO - antes que Helmet
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Helmet configuración más permisiva para desarrollo
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "http://localhost:5173", "http://127.0.0.1:5173"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
});
app.use('/api/', limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auditorias', require('./routes/auditorias')); // Asegúrate de que las rutas de auditorías estén registradas
app.use('/api/proveedores', require('./routes/proveedores'));



const vademecumRoutes = require('./routes/vademecum');
app.use('/api/vademecum', vademecumRoutes);
// Ruta de salud (health check)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Agrega esta ruta temporal después de las otras rutas
app.get('/api/debug/tables', async (req, res) => {
    try {
        const pool = require('./config/database');
        const [tables] = await pool.query('SHOW TABLES');
        res.json({ tables });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: true,
        message: 'Ruta no encontrada'
    });
});

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: true,
        message: 'Error interno del servidor'
    });
});

app.listen(PORT, () => {
    console.log('🚀 Servidor corriendo en puerto ' + PORT);
    console.log('📱 Health check: http://localhost:' + PORT + '/api/health');
});