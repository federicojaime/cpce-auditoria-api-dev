import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    dotenv.config({ path: envPath });
}

export { loadEnvironment };