// server.js

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Importar rutas (solo las que existen)
import authRoutes from './routes/auth.js';
import auditoriasRoutes from './routes/auditorias.js';
import trialRoutes from './routes/trial.js';
import proveedoresRoutes from './routes/proveedores.js';
// Módulo de Compras
import presupuestosRoutes from './routes/presupuestos.js';
import ordenesCompraRoutes from './routes/ordenesCompra.js';
import notificacionesRoutes from './routes/notificaciones.js';
import reportesComprasRoutes from './routes/reportesCompras.js';
// import usuariosRoutes from './routes/usuarios.js'; // ❌ Comentar si no existe

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
    origin: '*', // ⚠️ Solo para desarrollo
    credentials: true
}));
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Middlewares para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/auditorias', auditoriasRoutes);
app.use('/api/trial', trialRoutes);
app.use('/api/proveedores', proveedoresRoutes);
// Módulo de Compras
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/ordenes-compra', ordenesCompraRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/reportes-compras', reportesComprasRoutes);
// app.use('/api/usuarios', usuariosRoutes); // ❌ Comentar si no existe

// Ruta de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        message: 'API de Auditorías CPCE',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            auditorias: '/api/auditorias',
            trial: '/api/trial',
            proveedores: '/api/proveedores',
            // Módulo de Compras
            presupuestos: '/api/presupuestos',
            ordenesCompra: '/api/ordenes-compra',
            notificaciones: '/api/notificaciones',
            reportesCompras: '/api/reportes-compras',
            health: '/health'
        }
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
    });
});

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
});

export default app;