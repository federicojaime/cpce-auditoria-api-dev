// controllers/notificacionesController.js
import { executeQuery } from '../config/database.js';
import * as emailService from '../services/emailService.js';

/**
 * 🔔 FUNCIÓN PRINCIPAL - Notificar a pacientes
 * Envía email (y opcionalmente SMS) cuando los medicamentos están disponibles
 */
export const notificarPaciente = async (req, res) => {
    try {
        const {
            ordenId,
            pacientes = [],
            tipo = 'MEDICAMENTOS_DISPONIBLES',
            canal = 'EMAIL_SMS',
            urgencia = 'ALTA',
            datosOrden = {},
            medicamentos = []
        } = req.body;

        const userId = req.user.id;

        // Validaciones
        if (!ordenId) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la orden es requerido'
            });
        }

        if (!pacientes || pacientes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debe proporcionar al menos un paciente'
            });
        }

        // Verificar que la orden existe
        const ordenQuery = `
            SELECT o.*, p.razon_social as proveedor_nombre
            FROM alt_orden_compra o
            INNER JOIN alt_proveedor p ON o.id_proveedor = p.id_proveedor
            WHERE o.id_orden = ?
        `;
        const ordenResult = await executeQuery(ordenQuery, [ordenId]);

        if (ordenResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        const orden = ordenResult[0];
        const notificacionesEnviadas = [];
        const errores = [];

        // Enviar notificación a cada paciente
        for (const paciente of pacientes) {
            const resultadoNotificacion = {
                paciente: paciente.nombre,
                dni: paciente.dni,
                email: { enviado: false, fecha: null, error: null },
                sms: { enviado: false, fecha: null, error: null }
            };

            // Enviar EMAIL (siempre o según canal)
            if (canal === 'EMAIL_SMS' || canal === 'EMAIL') {
                if (paciente.email) {
                    try {
                        const resultadoEmail = await emailService.enviarNotificacionMedicamentosDisponibles({
                            to: paciente.email,
                            pacienteNombre: paciente.nombre,
                            numeroOrden: datosOrden.numero || orden.numero_orden,
                            proveedor: datosOrden.proveedor || orden.proveedor_nombre,
                            fechaEntrega: datosOrden.fechaEntrega || orden.fecha_entrega_real || new Date(),
                            tracking: datosOrden.tracking || orden.tracking_numero,
                            medicamentos: medicamentos
                        });

                        resultadoNotificacion.email = {
                            enviado: resultadoEmail.success,
                            fecha: resultadoEmail.fecha,
                            destinatario: paciente.email,
                            error: resultadoEmail.error || null
                        };
                    } catch (error) {
                        resultadoNotificacion.email.error = error.message;
                    }
                } else {
                    resultadoNotificacion.email.error = 'Email no proporcionado';
                }
            }

            // Enviar SMS (si se implementa en el futuro)
            if (canal === 'EMAIL_SMS' || canal === 'SMS') {
                if (paciente.telefono) {
                    // TODO: Implementar servicio SMS cuando esté disponible
                    // const resultadoSMS = await smsService.enviarSMS({...});

                    resultadoNotificacion.sms = {
                        enviado: false,
                        fecha: null,
                        destinatario: paciente.telefono,
                        error: 'Servicio SMS no implementado aún'
                    };
                } else {
                    resultadoNotificacion.sms.error = 'Teléfono no proporcionado';
                }
            }

            // Guardar notificación en base de datos
            const insertNotificacion = `
                INSERT INTO alt_notificacion_paciente (
                    id_orden,
                    paciente_nombre,
                    paciente_dni,
                    paciente_telefono,
                    paciente_email,
                    tipo,
                    canal,
                    urgencia,
                    email_enviado,
                    email_fecha,
                    email_error,
                    sms_enviado,
                    sms_fecha,
                    sms_error,
                    mensaje_email,
                    mensaje_sms,
                    id_usuario_envio
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await executeQuery(insertNotificacion, [
                ordenId,
                paciente.nombre,
                paciente.dni,
                paciente.telefono || null,
                paciente.email || null,
                tipo,
                canal,
                urgencia,
                resultadoNotificacion.email.enviado ? 1 : 0,
                resultadoNotificacion.email.fecha,
                resultadoNotificacion.email.error,
                resultadoNotificacion.sms.enviado ? 1 : 0,
                resultadoNotificacion.sms.fecha,
                resultadoNotificacion.sms.error,
                `Medicamentos disponibles - Orden ${orden.numero_orden}`,
                null, // mensaje_sms
                userId
            ]);

            notificacionesEnviadas.push(resultadoNotificacion);

            // Si hubo errores, agregarlo a la lista
            if (!resultadoNotificacion.email.enviado && !resultadoNotificacion.sms.enviado) {
                errores.push({
                    paciente: paciente.nombre,
                    mensaje: 'No se pudo enviar ninguna notificación'
                });
            }
        }

        // Actualizar flag de notificación en la orden
        const algunaExitosa = notificacionesEnviadas.some(n => n.email.enviado || n.sms.enviado);
        if (algunaExitosa) {
            await executeQuery(
                'UPDATE alt_orden_compra SET notificacion_enviada = 1, fecha_notificacion = NOW() WHERE id_orden = ?',
                [ordenId]
            );
        }

        // Agregar entrada al historial
        await executeQuery(
            `INSERT INTO alt_orden_compra_historial (id_orden, estado_anterior, estado_nuevo, evento, descripcion, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                ordenId,
                orden.estado,
                orden.estado,
                'Notificación enviada',
                `Notificación enviada a ${pacientes.length} paciente(s)`,
                userId
            ]
        );

        res.json({
            success: true,
            message: errores.length > 0
                ? `Notificaciones enviadas con ${errores.length} error(es)`
                : 'Notificaciones enviadas exitosamente',
            notificaciones: notificacionesEnviadas,
            totalEnviados: notificacionesEnviadas.filter(n => n.email.enviado || n.sms.enviado).length,
            totalFallidos: errores.length,
            errores: errores
        });

    } catch (error) {
        console.error('Error en notificarPaciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar notificaciones',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Reenviar notificación
 */
export const reenviarNotificacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { canal = 'EMAIL_SMS' } = req.body;

        // Obtener notificación original
        const notifQuery = `
            SELECT n.*, o.numero_orden, p.razon_social as proveedor
            FROM alt_notificacion_paciente n
            INNER JOIN alt_orden_compra o ON n.id_orden = o.id_orden
            INNER JOIN alt_proveedor p ON o.id_proveedor = p.id_proveedor
            WHERE n.id_notificacion = ?
        `;

        const notifResult = await executeQuery(notifQuery, [id]);

        if (notifResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notificación no encontrada'
            });
        }

        const notif = notifResult[0];
        let emailEnviado = false;
        let emailError = null;

        // Reenviar email
        if ((canal === 'EMAIL_SMS' || canal === 'EMAIL') && notif.paciente_email) {
            const resultado = await emailService.enviarNotificacionMedicamentosDisponibles({
                to: notif.paciente_email,
                pacienteNombre: notif.paciente_nombre,
                numeroOrden: notif.numero_orden,
                proveedor: notif.proveedor,
                fechaEntrega: new Date(),
                tracking: null,
                medicamentos: []
            });

            emailEnviado = resultado.success;
            emailError = resultado.error;
        }

        // Actualizar registro
        await executeQuery(
            `UPDATE alt_notificacion_paciente
             SET email_enviado = ?, email_fecha = NOW(), email_error = ?
             WHERE id_notificacion = ?`,
            [emailEnviado ? 1 : 0, emailError, id]
        );

        res.json({
            success: true,
            message: emailEnviado ? 'Notificación reenviada exitosamente' : 'Error al reenviar notificación',
            email: {
                enviado: emailEnviado,
                error: emailError
            }
        });

    } catch (error) {
        console.error('Error en reenviarNotificacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reenviar notificación',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Obtener historial de notificaciones de una orden
 */
export const obtenerHistorialNotificaciones = async (req, res) => {
    try {
        const { ordenId } = req.params;

        const query = `
            SELECT
                id_notificacion,
                paciente_nombre,
                paciente_dni,
                paciente_telefono,
                paciente_email,
                tipo,
                canal,
                urgencia,
                email_enviado,
                email_fecha,
                email_error,
                sms_enviado,
                sms_fecha,
                sms_error,
                fecha_creacion
            FROM alt_notificacion_paciente
            WHERE id_orden = ?
            ORDER BY fecha_creacion DESC
        `;

        const notificaciones = await executeQuery(query, [ordenId]);

        res.json({
            success: true,
            data: notificaciones,
            total: notificaciones.length
        });

    } catch (error) {
        console.error('Error en obtenerHistorialNotificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial de notificaciones',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Obtener estadísticas de notificaciones
 */
export const obtenerEstadisticasNotificaciones = async (req, res) => {
    try {
        const query = `
            SELECT
                COUNT(*) as total_notificaciones,
                SUM(CASE WHEN email_enviado = 1 THEN 1 ELSE 0 END) as emails_enviados,
                SUM(CASE WHEN email_enviado = 0 THEN 1 ELSE 0 END) as emails_fallidos,
                SUM(CASE WHEN sms_enviado = 1 THEN 1 ELSE 0 END) as sms_enviados,
                SUM(CASE WHEN sms_enviado = 0 THEN 1 ELSE 0 END) as sms_fallidos,
                COUNT(DISTINCT id_orden) as ordenes_notificadas,
                COUNT(DISTINCT paciente_dni) as pacientes_unicos
            FROM alt_notificacion_paciente
        `;

        const result = await executeQuery(query);
        const stats = result[0];

        res.json({
            success: true,
            data: {
                totalNotificaciones: stats.total_notificaciones,
                emails: {
                    enviados: stats.emails_enviados,
                    fallidos: stats.emails_fallidos,
                    tasaExito: stats.total_notificaciones > 0
                        ? ((stats.emails_enviados / stats.total_notificaciones) * 100).toFixed(2)
                        : 0
                },
                sms: {
                    enviados: stats.sms_enviados,
                    fallidos: stats.sms_fallidos,
                    tasaExito: stats.total_notificaciones > 0
                        ? ((stats.sms_enviados / stats.total_notificaciones) * 100).toFixed(2)
                        : 0
                },
                ordenesNotificadas: stats.ordenes_notificadas,
                pacientesUnicos: stats.pacientes_unicos
            }
        });

    } catch (error) {
        console.error('Error en obtenerEstadisticasNotificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};
