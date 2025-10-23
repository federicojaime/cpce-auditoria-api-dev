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
                <h1>🏥 Sistema de Auditoría - Demo Alta Luna</h1>
                <p>Medicamentos Disponibles para Retiro</p>
            </div>

            <div class="alert-box">
                <strong>✅ ¡Buenas noticias ${pacienteNombre}!</strong><br>
                Sus medicamentos ya están disponibles para retiro.
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
                Por favor, acérquese con su DNI para retirar sus medicamentos.<br>
                <strong>Horario de atención:</strong> Lunes a Viernes de 8:00 a 16:00 hs
            </div>

            <div style="text-align: center;">
                <p>Si tiene alguna consulta, no dude en comunicarse con nosotros.</p>
            </div>

            <div class="footer">
                <p>Este es un mensaje automático, por favor no responder a este email.</p>
                <p><strong>Sistema de Auditoría - Demo Alta Luna</strong></p>
                <p>© ${new Date().getFullYear()} Todos los derechos reservados</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Texto plano alternativo
    const textContent = `
Sistema de Auditoría - Demo Alta Luna - Medicamentos Disponibles

Estimado/a ${pacienteNombre},

Sus medicamentos ya están disponibles para retiro.

Información de la Orden:
- Número de Orden: ${numeroOrden}
- Proveedor: ${proveedor}
- Fecha de Entrega: ${fechaFormateada}
${tracking ? `- Tracking: ${tracking}` : ''}

${medicamentos.length > 0 ? `
Medicamentos Recibidos:
${medicamentos.map(m => `- ${m.nombre} - Cantidad: ${m.cantidad}`).join('\n')}
` : ''}

Por favor, acérquese con su DNI para retirar sus medicamentos.
Horario de atención: Lunes a Viernes de 8:00 a 16:00 hs

Este es un mensaje automático, por favor no responder a este email.
Sistema de Auditoría - Demo Alta Luna
    `.trim();

    try {
        const info = await transporter.sendMail({
            from: '"Sistema de Auditoría - Demo Alta Luna" <envios@codeo.site>',
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

                <p>Por favor, contacte con nosotros para más información.</p>

                <div class="footer">
                    <p>Sistema de Auditoría - Demo Alta Luna</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: '"Sistema de Auditoría - Demo Alta Luna" <envios@codeo.site>',
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
            from: '"Sistema de Auditoría - Demo Alta Luna" <envios@codeo.site>',
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

/**
 * Envía email de solicitud de presupuesto a un proveedor
 * @param {Object} options - Opciones del email
 * @param {string} options.proveedorEmail - Email del proveedor
 * @param {string} options.proveedorNombre - Nombre del proveedor
 * @param {string} options.token - Token único para acceder al formulario
 * @param {string} options.loteNumero - Número de lote de la solicitud
 * @param {Array} options.auditorias - Array de auditorías con medicamentos
 * @param {Date} options.fechaExpiracion - Fecha de expiración del enlace (72 horas)
 */
export const enviarSolicitudPresupuesto = async (options) => {
    const {
        proveedorEmail,
        proveedorNombre,
        token,
        loteNumero,
        auditorias,
        fechaExpiracion
    } = options;

    const urlFormulario = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/presupuesto/responder/${token}`;

    // Construir lista de medicamentos
    let listaMedicamentos = '';
    auditorias.forEach(auditoria => {
        listaMedicamentos += `
            <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; border-left: 3px solid #0066cc;">
                <p style="margin: 5px 0;"><strong>Auditoría #${auditoria.id}</strong></p>
                <p style="margin: 5px 0; color: #666;">Paciente: ${auditoria.paciente_nombre}</p>
                <p style="margin: 5px 0; color: #666;">DNI: ${auditoria.paciente_dni}</p>
                <p style="margin: 10px 0 5px 0;"><strong>Medicamentos:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
        `;

        auditoria.medicamentos.forEach(med => {
            listaMedicamentos += `
                <li style="margin: 5px 0;">
                    <strong>${med.nombre}</strong><br>
                    <span style="color: #666;">Presentación: ${med.presentacion}</span><br>
                    <span style="color: #666;">Cantidad: ${med.cantidad}</span>
                </li>
            `;
        });

        listaMedicamentos += `
                </ul>
            </div>
        `;
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitud de Presupuesto</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .email-container {
                max-width: 650px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #0066cc 0%, #004999 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 26px;
                font-weight: bold;
            }
            .header p {
                margin: 10px 0 0 0;
                font-size: 16px;
                opacity: 0.95;
            }
            .content {
                padding: 30px;
            }
            .greeting {
                font-size: 16px;
                margin-bottom: 20px;
            }
            .warning-box {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .warning-box strong {
                color: #856404;
            }
            .info-box {
                background-color: #e7f3ff;
                border-left: 4px solid #0066cc;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .medicamentos-section {
                margin: 25px 0;
            }
            .medicamentos-section h3 {
                color: #0066cc;
                font-size: 18px;
                margin-bottom: 15px;
            }
            .requirements {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .requirements h3 {
                color: #0066cc;
                margin-top: 0;
                font-size: 16px;
            }
            .requirements ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            .requirements li {
                margin: 8px 0;
                color: #555;
            }
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #28a745 0%, #20873a 100%);
                color: white !important;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .button:hover {
                background: linear-gradient(135deg, #20873a 0%, #28a745 100%);
            }
            .link-fallback {
                margin-top: 20px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
                font-size: 12px;
                color: #666;
                word-break: break-all;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>📋 Solicitud de Presupuesto</h1>
                <p>Sistema de Auditorías - Alto Costo</p>
            </div>

            <div class="content">
                <p class="greeting">Estimado/a <strong>${proveedorNombre}</strong>,</p>

                <p>Le solicitamos presupuesto para el siguiente lote de medicamentos de alto costo:</p>

                <div class="info-box">
                    <strong>Lote:</strong> ${loteNumero}
                </div>

                <div class="warning-box">
                    <strong>⏰ IMPORTANTE:</strong> Este enlace expira el <strong>${new Date(fechaExpiracion).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</strong> (72 horas desde el envío)
                </div>

                <div class="medicamentos-section">
                    <h3>💊 Medicamentos solicitados:</h3>
                    ${listaMedicamentos}
                </div>

                <div class="requirements">
                    <h3>📝 Para cada medicamento debe indicar:</h3>
                    <ul>
                        <li><strong>Acepta o rechaza</strong> la solicitud</li>
                        <li><strong>Precio</strong> (obligatorio si acepta)</li>
                        <li><strong>Fecha de retiro</strong> - Cuándo puede entregar el medicamento</li>
                        <li><strong>Fecha de vencimiento</strong> del medicamento</li>
                        <li><strong>Comentarios adicionales</strong> (opcional)</li>
                    </ul>
                </div>

                <div class="button-container">
                    <a href="${urlFormulario}" class="button">RESPONDER SOLICITUD</a>
                </div>

                <div class="link-fallback">
                    <p><strong>Si el botón no funciona, copie y pegue este enlace en su navegador:</strong></p>
                    <p><a href="${urlFormulario}" style="color: #0066cc;">${urlFormulario}</a></p>
                </div>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    Este enlace es personal e intransferible. No lo comparta con terceros.
                </p>
            </div>

            <div class="footer">
                <p><strong>Sistema de Auditoría - Demo Alta Luna</strong></p>
                <p>Este es un mensaje automático. Por favor no responda a este correo.</p>
                <p>© ${new Date().getFullYear()}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `
SOLICITUD DE PRESUPUESTO - Sistema de Auditoría - Demo Alta Luna

Estimado/a ${proveedorNombre},

Le solicitamos presupuesto para el siguiente lote de medicamentos de alto costo:

Lote: ${loteNumero}

⏰ IMPORTANTE: Este enlace expira el ${new Date(fechaExpiracion).toLocaleString('es-AR')} (72 horas)

MEDICAMENTOS SOLICITADOS:
${auditorias.map(a => `
Auditoría #${a.id} - ${a.paciente_nombre} (DNI: ${a.paciente_dni})
Medicamentos:
${a.medicamentos.map(m => `  - ${m.nombre} - ${m.presentacion} (Cantidad: ${m.cantidad})`).join('\n')}
`).join('\n')}

Para cada medicamento debe indicar:
- Acepta o rechaza la solicitud
- Precio (obligatorio si acepta)
- Fecha de retiro (cuándo puede entregar)
- Fecha de vencimiento del medicamento
- Comentarios adicionales (opcional)

RESPONDER EN:
${urlFormulario}

Este enlace es personal e intransferible.

--
Sistema de Auditoría - Demo Alta Luna
Este es un mensaje automático. Por favor no responda a este correo.
    `.trim();

    try {
        const info = await transporter.sendMail({
            from: '"Sistema de Auditoría - Demo Alta Luna" <envios@codeo.site>',
            to: proveedorEmail,
            subject: `📋 Solicitud de Presupuesto - Lote ${loteNumero}`,
            text: textContent,
            html: htmlContent
        });

        console.log(`✅ Email de solicitud enviado a ${proveedorNombre} (${proveedorEmail})`);
        return {
            success: true,
            messageId: info.messageId,
            destinatario: proveedorEmail,
            fecha: new Date()
        };

    } catch (error) {
        console.error('❌ Error enviando email de solicitud:', error);
        return {
            success: false,
            error: error.message,
            destinatario: proveedorEmail,
            fecha: new Date()
        };
    }
};

/**
 * Enviar notificación interna cuando un proveedor responde
 */
export const notificarRespuestaPresupuesto = async (options) => {
    const {
        emailsDestinatarios,
        proveedorNombre,
        loteNumero,
        auditoriaId,
        resumen
    } = options;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 26px; }
            .content { padding: 30px; }
            .success-icon { font-size: 50px; text-align: center; margin: 20px 0; }
            .info-box { background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3; }
            .info-box p { margin: 8px 0; }
            .info-box strong { color: #1565C0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Nueva Respuesta de Presupuesto</h1>
            </div>

            <div class="content">
                <div class="success-icon">✓</div>

                <p style="text-align: center; font-size: 18px; color: #2196F3; font-weight: bold;">
                    Se ha recibido una nueva respuesta
                </p>

                <div class="info-box">
                    <p><strong>Proveedor:</strong> ${proveedorNombre}</p>
                    <p><strong>Lote:</strong> ${loteNumero}</p>
                    <p><strong>Auditoría:</strong> #${auditoriaId}</p>
                    <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </div>

                ${resumen ? `
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Resumen de respuesta:</h3>
                    <p style="color: #666;">${resumen}</p>
                </div>
                ` : ''}

                <p style="margin-top: 30px;">
                    Ingrese al sistema de seguimiento para ver los detalles completos de la respuesta,
                    comparar con otros presupuestos y gestionar la solicitud.
                </p>
            </div>

            <div class="footer">
                <p><strong>Sistema de Auditoría - Demo Alta Luna</strong></p>
                <p>© ${new Date().getFullYear()}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `
NUEVA RESPUESTA DE PRESUPUESTO

Se ha recibido una nueva respuesta de presupuesto:

Proveedor: ${proveedorNombre}
Lote: ${loteNumero}
Auditoría: #${auditoriaId}
Fecha: ${new Date().toLocaleString('es-AR')}

${resumen ? `Resumen: ${resumen}\n` : ''}

Ingrese al sistema para ver los detalles completos.

--
Sistema de Auditoría - Demo Alta Luna
    `.trim();

    try {
        const info = await transporter.sendMail({
            from: '"Sistema de Auditoría - Demo Alta Luna" <envios@codeo.site>',
            to: emailsDestinatarios,
            subject: `✅ Nueva Respuesta - ${proveedorNombre} - Lote ${loteNumero}`,
            text: textContent,
            html: htmlContent
        });

        console.log(`✅ Notificación enviada sobre respuesta de ${proveedorNombre}`);
        return {
            success: true,
            messageId: info.messageId,
            fecha: new Date()
        };

    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        return {
            success: false,
            error: error.message,
            fecha: new Date()
        };
    }
};

/**
 * Notificar al paciente sobre cambio de estado de su orden de compra
 * @param {Object} options - Opciones del email
 * @param {string} options.emailPaciente - Email del paciente
 * @param {string} options.nombrePaciente - Nombre completo del paciente
 * @param {number} options.numeroOrden - ID de la orden
 * @param {string} options.estadoNuevo - Nuevo estado de la orden
 * @param {string} options.proveedor - Nombre del proveedor
 * @param {number} options.montoTotal - Monto total de la orden
 * @param {string} options.fechaEntrega - Fecha estimada de entrega
 * @param {string} options.lugarRetiro - Lugar donde se retira
 * @param {Array} options.medicamentos - Lista de medicamentos
 */
export const notificarCambioEstadoOrden = async (options) => {
    const {
        emailPaciente,
        nombrePaciente,
        numeroOrden,
        estadoNuevo,
        proveedor,
        montoTotal,
        fechaEntrega,
        lugarRetiro,
        medicamentos = []
    } = options;

    // Configuración según el estado
    const estadosConfig = {
        'adjudicado': {
            emoji: '✅',
            titulo: 'Presupuesto Adjudicado',
            color: '#28a745',
            mensaje: 'Su solicitud de medicamentos ha sido adjudicada a un proveedor.',
            detalles: 'El proveedor comenzará a preparar su pedido.'
        },
        'confirmado': {
            emoji: '📋',
            titulo: 'Orden Confirmada por el Proveedor',
            color: '#17a2b8',
            mensaje: 'El proveedor ha confirmado su orden y comenzará la preparación.',
            detalles: 'Recibirá una notificación cuando esté lista para retiro.'
        },
        'en_preparacion': {
            emoji: '⚙️',
            titulo: 'Orden en Preparación',
            color: '#ffc107',
            mensaje: 'Su orden está siendo preparada.',
            detalles: 'El proveedor está organizando sus medicamentos.'
        },
        'listo_retiro': {
            emoji: '🎉',
            titulo: 'Orden Lista para Retiro',
            color: '#20c997',
            mensaje: '¡Sus medicamentos ya están listos para retirar!',
            detalles: 'Por favor acérquese al lugar de retiro con su DNI.'
        },
        'entregado': {
            emoji: '✔️',
            titulo: 'Orden Entregada',
            color: '#28a745',
            mensaje: 'Su orden ha sido entregada exitosamente.',
            detalles: 'Gracias por su confianza.'
        },
        'cancelado': {
            emoji: '❌',
            titulo: 'Orden Cancelada',
            color: '#dc3545',
            mensaje: 'Su orden ha sido cancelada.',
            detalles: 'Si tiene dudas, por favor contáctenos.'
        }
    };

    const config = estadosConfig[estadoNuevo] || {
        emoji: '📦',
        titulo: 'Actualización de Orden',
        color: '#6c757d',
        mensaje: 'El estado de su orden ha cambiado.',
        detalles: ''
    };

    // Formatear fecha
    const fechaFormateada = fechaEntrega ? new Date(fechaEntrega).toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'Por confirmar';

    // Formatear monto
    const montoFormateado = montoTotal ? new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(montoTotal) : '';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background-color: ${config.color}; color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .emoji { font-size: 48px; margin-bottom: 10px; }
            .content { padding: 30px; }
            .alert { background-color: #e7f3ff; border-left: 4px solid ${config.color}; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .info-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: bold; color: #495057; }
            .info-value { color: #212529; }
            .medicamentos { margin: 20px 0; }
            .medicamento-item { background-color: #fff; border: 1px solid #dee2e6; padding: 12px; margin-bottom: 10px; border-radius: 6px; }
            .medicamento-nombre { font-weight: bold; color: #495057; }
            .medicamento-cantidad { color: #6c757d; font-size: 14px; }
            .highlight { background-color: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 4px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
            .button { display: inline-block; background-color: ${config.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="emoji">${config.emoji}</div>
                <h1>${config.titulo}</h1>
            </div>

            <div class="content">
                <p>Estimado/a <strong>${nombrePaciente}</strong>,</p>

                <div class="alert">
                    <p style="margin: 0; font-size: 16px;"><strong>${config.mensaje}</strong></p>
                    <p style="margin: 10px 0 0 0; color: #495057;">${config.detalles}</p>
                </div>

                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">Número de Orden:</span>
                        <span class="info-value">#${numeroOrden}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Estado:</span>
                        <span class="info-value" style="color: ${config.color}; font-weight: bold;">${estadoNuevo.toUpperCase().replace('_', ' ')}</span>
                    </div>
                    ${proveedor ? `
                    <div class="info-row">
                        <span class="info-label">Proveedor:</span>
                        <span class="info-value">${proveedor}</span>
                    </div>
                    ` : ''}
                    ${montoFormateado ? `
                    <div class="info-row">
                        <span class="info-label">Monto Total:</span>
                        <span class="info-value">${montoFormateado}</span>
                    </div>
                    ` : ''}
                    ${fechaEntrega ? `
                    <div class="info-row">
                        <span class="info-label">Fecha Estimada:</span>
                        <span class="info-value">${fechaFormateada}</span>
                    </div>
                    ` : ''}
                </div>

                ${estadoNuevo === 'listo_retiro' && lugarRetiro ? `
                <div class="highlight">
                    <p style="margin: 0 0 10px 0;"><strong>📍 Lugar de Retiro:</strong></p>
                    <p style="margin: 0; font-size: 16px;">${lugarRetiro}</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #856404;">
                        <strong>Importante:</strong> Traer DNI y esta orden impresa o en formato digital.
                    </p>
                </div>
                ` : ''}

                ${medicamentos.length > 0 ? `
                <div class="medicamentos">
                    <h3 style="color: #495057; border-bottom: 2px solid ${config.color}; padding-bottom: 10px;">Medicamentos</h3>
                    ${medicamentos.map(med => `
                        <div class="medicamento-item">
                            <div class="medicamento-nombre">${med.nombre}</div>
                            ${med.presentacion ? `<div style="color: #6c757d; font-size: 13px;">${med.presentacion}</div>` : ''}
                            <div class="medicamento-cantidad">Cantidad: ${med.cantidad}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${estadoNuevo === 'listo_retiro' ? `
                <p style="margin-top: 30px; color: #495057;">
                    <strong>Horario de atención:</strong><br>
                    Lunes a Viernes de 8:00 a 16:00 hs
                </p>
                ` : ''}

                <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
                    Este es un mensaje automático, por favor no responder a este email.<br>
                    Si tiene consultas, contáctese con su centro de salud.
                </p>
            </div>

            <div class="footer">
                <p style="margin: 0;"><strong>Sistema de Auditoría - Demo Alta Luna</strong></p>
                <p style="margin: 5px 0 0 0;">Gestión de Medicamentos de Alto Costo</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        if (!emailPaciente) {
            console.log('⚠️ No se puede enviar email: paciente sin email configurado');
            return {
                success: false,
                error: 'Paciente sin email',
                fecha: new Date()
            };
        }

        const info = await transporter.sendMail({
            from: '"Sistema de Auditoría - Demo Alta Luna" <envios@codeo.site>',
            to: emailPaciente,
            subject: `${config.emoji} ${config.titulo} - Orden #${numeroOrden}`,
            html: htmlContent
        });

        console.log(`✅ Email de cambio de estado enviado a ${nombrePaciente} (${emailPaciente})`);
        return {
            success: true,
            messageId: info.messageId,
            destinatario: emailPaciente,
            estado: estadoNuevo,
            fecha: new Date()
        };

    } catch (error) {
        console.error('❌ Error enviando notificación de cambio de estado:', error);
        return {
            success: false,
            error: error.message,
            destinatario: emailPaciente,
            fecha: new Date()
        };
    }
};

export default {
    enviarNotificacionMedicamentosDisponibles,
    enviarNotificacionOrdenCancelada,
    enviarEmailGenerico,
    enviarSolicitudPresupuesto,
    notificarRespuestaPresupuesto,
    notificarCambioEstadoOrden
};
