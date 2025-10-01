// config/loadEnv.js
const path = require('path');

function loadEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    
    let envFile;
    switch (env) {
        case 'production':
            envFile = '.env.production';
            break;
        case 'test':
            envFile = '.env.test';
            break;
        default:
            envFile = '.env';
    }
    
    const envPath = path.resolve(process.cwd(), envFile);
    
    console.log(`🔧 Cargando entorno: ${env}`);
    console.log(`📄 Archivo: ${envFile}`);
    
    require('dotenv').config({ path: envPath });
}

module.exports = { loadEnvironment };