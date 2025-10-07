// services/emailService.js - Servicio de envío de emails usando nodemailer

import nodemailer from 'nodemailer';

// Configuración del transporter con las credenciales de Hostinger
const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: 'envios@codeo.site',
        pass: 'D^z2ZL70$13b'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verificar conexión al iniciar
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Error en configuración de email:', error);
    } else {
        console.log('✅ Servidor de email listo para enviar mensajes');
    }
});

/**
 * Enviar email de notificación de medicamentos disponibles
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.pacienteNombre - Nombre del paciente
 * @param {string} options.numeroOrden - Número de orden
 * @param {string} options.proveedor - Nombre del proveedor
 * @param {string} options.fechaEntrega - Fecha de entrega
 * @param {string} options.tracking - Número de tracking
 * @param {Array} options.medicamentos - Lista de medicamentos
 */
export const enviarNotificacionMedicamentosDisponibles = async (options) => {
    const {
        to,
        pacienteNombre,
        numeroOrden,
        proveedor,
        fechaEntrega,
        tracking,
        medicamentos = []
    } = options;

    // Formatear fecha
    const fechaFormateada = new Date(fechaEntrega).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Generar lista de medicamentos en HTML
    const listaMedicamentos = medicamentos.map(med =>
        `<li><strong>${med.nombre}</strong> - Cantidad: ${med.cantidad}</li>`
    ).join('');

    // Plantilla HTML del email
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Medicamentos Disponibles</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .header {
                background-color: #0066cc;
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                margin: -30px -30px 20px -30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .alert-box {
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .info-section {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
            }
            .info-section h3 {
                margin-top: 0;
                color: #0066cc;
            }
            .medicamentos-list {
                background-color: #fff;
                padding: 15px;
                border-left: 3px solid #0066cc;
                margin: 15px 0;
            }
            .medicamentos-list ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            .medicamentos-list li {
                margin: 8px 0;
            }
            .tracking-info {
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
                text-align: center;
            }
            .button {
                display: inline-block;
                background-color: #0066cc;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏥 CPCE Salud</h1>
                <p>Medicamentos Disponibles para Retiro</p>
            </div>

            <div class="alert-box">
                <strong>✅ ¡Buenas noticias ${pacienteNombre}!</strong><br>
                Sus medicamentos ya están disponibles para retiro en CPCE.
            </div>

            <div class="info-section">
                <h3>📋 Información de la Orden</h3>
                <p><strong>Número de Orden:</strong> ${numeroOrden}</p>
                <p><strong>Proveedor:</strong> ${proveedor}</p>
                <p><strong>Fecha de Entrega:</strong> ${fechaFormateada}</p>
                ${tracking ? `<p><strong>Tracking:</strong> ${tracking}</p>` : ''}
            </div>

            ${medicamentos.length > 0 ? `
            <div class="medicamentos-list">
                <h3>💊 Medicamentos Recibidos</h3>
                <ul>
                    ${listaMedicamentos}
                </ul>
            </div>
            ` : ''}

            <div class="tracking-info">
                <strong>📍 ¿Dónde retirar?</strong><br>
                Por favor, acérquese a la sede de CPCE con su DNI para retirar sus medicamentos.<br>
                <strong>Horario de atención:</strong> Lunes a Viernes de 8:00 a 16:00 hs
            </div>

            <div style="text-align: center;">
                <p>Si tiene alguna consulta, no dude en comunicarse con nosotros.</p>
            </div>

            <div class="footer">
                <p>Este es un mensaje automático, por favor no responder a este email.</p>
                <p><strong>CPCE Salud</strong> | Colegio Profesional de Ciencias Económicas</p>
                <p>© ${new Date().getFullYear()} Todos los derechos reservados</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Texto plano alternativo
    const textContent = `
CPCE Salud - Medicamentos Disponibles

Estimado/a ${pacienteNombre},

Sus medicamentos ya están disponibles para retiro en CPCE.

Información de la Orden:
- Número de Orden: ${numeroOrden}
- Proveedor: ${proveedor}
- Fecha de Entrega: ${fechaFormateada}
${tracking ? `- Tracking: ${tracking}` : ''}

${medicamentos.length > 0 ? `
Medicamentos Recibidos:
${medicamentos.map(m => `- ${m.nombre} - Cantidad: ${m.cantidad}`).join('\n')}
` : ''}

Por favor, acérquese a la sede de CPCE con su DNI para retirar sus medicamentos.
Horario de atención: Lunes a Viernes de 8:00 a 16:00 hs

Este es un mensaje automático, por favor no responder a este email.
CPCE Salud | Colegio Profesional de Ciencias Económicas
    `.trim();

    try {
        const info = await transporter.sendMail({
            from: '"CPCE Salud" <envios@codeo.site>',
            to: to,
            subject: `🏥 Medicamentos Disponibles - Orden ${numeroOrden}`,
            text: textContent,
            html: htmlContent
        });

        console.log('✅ Email enviado:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            destinatario: to,
            fecha: new Date()
        };

    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return {
            success: false,
            error: error.message,
            destinatario: to,
            fecha: new Date()
        };
    }
};

/**
 * Enviar email de orden cancelada
 */
export const enviarNotificacionOrdenCancelada = async (options) => {
    const {
        to,
        pacienteNombre,
        numeroOrden,
        motivo
    } = options;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .content { background-color: #ffffff; padding: 30px; border-radius: 10px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px; margin-bottom: 20px; }
            .alert { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="content">
                <div class="header">
                    <h1>⚠️ Orden Cancelada</h1>
                </div>

                <p>Estimado/a ${pacienteNombre},</p>

                <div class="alert">
                    <strong>Información:</strong><br>
                    La orden <strong>${numeroOrden}</strong> ha sido cancelada.
                </div>

                <p><strong>Motivo:</strong> ${motivo || 'No especificado'}</p>

                <p>Por favor, contacte con CPCE para más información.</p>

                <div class="footer">
                    <p>CPCE Salud | Colegio Profesional de Ciencias Económicas</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: '"CPCE Salud" <envios@codeo.site>',
            to: to,
            subject: `⚠️ Orden Cancelada - ${numeroOrden}`,
            html: htmlContent
        });

        return {
            success: true,
            messageId: info.messageId,
            destinatario: to,
            fecha: new Date()
        };
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return {
            success: false,
            error: error.message,
            destinatario: to,
            fecha: new Date()
        };
    }
};

/**
 * Enviar email genérico
 */
export const enviarEmailGenerico = async (options) => {
    const { to, subject, html, text } = options;

    try {
        const info = await transporter.sendMail({
            from: '"CPCE Salud" <envios@codeo.site>',
            to: to,
            subject: subject,
            text: text,
            html: html
        });

        return {
            success: true,
            messageId: info.messageId,
            destinatario: to,
            fecha: new Date()
        };
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return {
            success: false,
            error: error.message,
            destinatario: to,
            fecha: new Date()
        };
    }
};

export default {
    enviarNotificacionMedicamentosDisponibles,
    enviarNotificacionOrdenCancelada,
    enviarEmailGenerico
};
