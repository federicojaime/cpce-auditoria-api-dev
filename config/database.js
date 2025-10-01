import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Crear el pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cpce_auditoria',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Función helper para ejecutar consultas
const executeQuery = async (sql, params = []) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Error ejecutando consulta SQL:', error);
        throw error;
    }
};

// Función para obtener conexión del pool
const getConnection = async () => {
    try {
        return await pool.getConnection();
    } catch (error) {
        console.error('Error obteniendo conexión:', error);
        throw error;
    }
};

// Verificar la conexión
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión a la base de datos establecida');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error conectando a la base de datos:', err);
    });

// Exportar usando named exports
export { pool, executeQuery, getConnection };