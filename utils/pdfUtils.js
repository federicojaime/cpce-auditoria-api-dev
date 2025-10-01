// utils/pdfUtils.js
const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PDFUtils {
    /**
     * Generar código QR como data URL
     */
    static async generarQR(texto, opciones = {}) {
        try {
            const opcionesDefault = {
                width: 100,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            };
            
            const opcionesFinal = { ...opcionesDefault, ...opciones };
            const dataURL = await QRCode.toDataURL(texto, opcionesFinal);
            
            return dataURL;
        } catch (error) {
            console.error('Error generando QR:', error);
            return '';
        }
    }

    /**
     * Generar código de barras como data URL
     */
    static async generarCodigoBarras(codigo, tipo = 'CODE128', opciones = {}) {
        try {
            const canvas = createCanvas(200, 100);
            
            const opcionesDefault = {
                format: tipo,
                width: 2,
                height: 80,
                displayValue: false,
                background: '#ffffff',
                lineColor: '#000000'
            };
            
            const opcionesFinal = { ...opcionesDefault, ...opciones };
            
            JsBarcode(canvas, codigo, opcionesFinal);
            
            return canvas.toDataURL();
        } catch (error) {
            console.error('Error generando código de barras:', error);
            return '';
        }
    }

    /**
     * Generar PDF desde HTML usando Puppeteer
     */
    static async generarPDFDesdeHTML(htmlContent, opciones = {}) {
        let browser = null;
        
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            
            const page = await browser.newPage();
            
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            
            const pdfBuffer = await page.pdf({
                format: opciones.format || 'A4',
                landscape: opciones.landscape !== undefined ? opciones.landscape : true,
                printBackground: true,
                margin: opciones.margin || {
                    top: '10mm',
                    bottom: '10mm',
                    left: '10mm',
                    right: '10mm'
                }
            });
            
            return pdfBuffer;
            
        } catch (error) {
            console.error('Error generando PDF con Puppeteer:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Obtener imagen de firma del médico
     */
    static async obtenerFirmaMedico(matricula) {
        try {
            const cadena = matricula.toString().slice(0, -1);
            const url = `https://aplicaciones.cmpc.org.ar/receta/firma/fm_${cadena}.txt`;
            
            return `<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..." width="120px"/>`;
        } catch (error) {
            console.error('Error obteniendo firma:', error);
            return '';
        }
    }

    /**
     * Obtener foto del médico
     */
    static async obtenerFotoMedico(matricula) {
        try {
            const ma = matricula.toString().replace("MP:", "");
            const mat = ma.trim();
            const url = `http://127.0.0.1/receta/foto/fo_${mat}.txt`;
            
            return `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...`;
        } catch (error) {
            console.error('Error obteniendo foto:', error);
            return '';
        }
    }

    /**
     * Formatear fecha
     */
    static formatearFecha(fecha, formato = 'dd-mm-yyyy') {
        try {
            const fechaObj = new Date(fecha);
            
            if (isNaN(fechaObj.getTime())) {
                return '';
            }
            
            const dia = fechaObj.getDate().toString().padStart(2, '0');
            const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
            const año = fechaObj.getFullYear();
            
            switch (formato) {
                case 'dd-mm-yyyy':
                    return `${dia}-${mes}-${año}`;
                case 'dd/mm/yyyy':
                    return `${dia}/${mes}/${año}`;
                case 'yyyy-mm-dd':
                    return `${año}-${mes}-${dia}`;
                default:
                    return `${dia}-${mes}-${año}`;
            }
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return '';
        }
    }

    /**
     * Formatear identidad reservada
     */
    static formatearIdentidadReservada(paciente) {
        try {
            const fechaNac = new Date(paciente.fecnac);
            const dia = fechaNac.getDate().toString().padStart(2, '0');
            const mes = (fechaNac.getMonth() + 1).toString().padStart(2, '0');
            const año = fechaNac.getFullYear();
            
            const sexo = paciente.sexo?.trim() || '';
            const nombre2 = paciente.nombre?.substring(0, 2).toUpperCase() || '';
            const apellido2 = paciente.apellido?.substring(0, 2).toUpperCase() || '';
            
            return `${sexo}${nombre2}${apellido2}${dia}${mes}${año}`;
        } catch (error) {
            console.error('Error formateando identidad reservada:', error);
            return '';
        }
    }

    /**
     * Obtener configuración de obra social
     */
    static obtenerConfigObraSocial(idObraSoc) {
        const configuraciones = {
            156: {
                tablavadem: 'vad_muni',
                logoHeader: '156.jpg'
            },
            20: {
                tablavadem: 'vad_020', 
                logoHeader: '20.jpg'
            }
        };
        
        return configuraciones[idObraSoc] || {
            tablavadem: 'vademecum',
            logoHeader: 'cmpc.jpg'
        };
    }

    /**
     * Crear directorio si no existe
     */
    static async crearDirectorio(ruta) {
        try {
            await fs.mkdir(ruta, { recursive: true });
            return true;
        } catch (error) {
            console.error('Error creando directorio:', error);
            return false;
        }
    }

    /**
     * Guardar archivo en múltiples ubicaciones
     */
    static async guardarArchivoMultiple(nombreArchivo, buffer, rutas = []) {
        const resultados = [];
        
        for (const ruta of rutas) {
            try {
                await this.crearDirectorio(path.dirname(ruta));
                const rutaCompleta = path.join(ruta, nombreArchivo);
                await fs.writeFile(rutaCompleta, buffer);
                
                resultados.push({
                    ruta: rutaCompleta,
                    exito: true,
                    tamaño: buffer.length
                });
                
                console.log(`Archivo guardado en: ${rutaCompleta} (${buffer.length} bytes)`);
            } catch (error) {
                console.error(`Error guardando en ${ruta}:`, error);
                resultados.push({
                    ruta,
                    exito: false,
                    error: error.message
                });
            }
        }
        
        return resultados;
    }

    /**
     * Escapar HTML
     */
    static escaparHTML(texto) {
        if (!texto) return '';
        
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Capitalizar texto
     */
    static capitalizarTexto(texto) {
        if (!texto) return '';
        
        return texto.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Generar HTML de receta
     */
    static generarHTMLReceta(datos) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 5px; }
                    hr { border: 1px solid #000; }
                    .header { font-size: 1.2em; font-weight: bold; }
                </style>
            </head>
            <body>
                <table width="100%">
                    <thead>
                        <tr>
                            <th colspan="2" width="50%" align="left"><font size="1.2em">Receta Electrónica</font></th>
                            <th colspan="4" width="50%" align="right"><font size="0.8em">ORIGINAL</font></th>
                        </tr> 
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" width="100%"><hr style="border: 1px solid #000;" /></td>
                        </tr>  
                        <tr>
                            <td colspan="2" width="25%"><img src="https://cpce.recetasalud.ar/logo/${datos.logoHeader}" width="150px"></td>
                            <td colspan="2" width="50%"><h2>Nro: ${datos.numeroDisplay}</h2>${datos.autorizacionEspecialInfo || ''}</td>
                            <td colspan="2" width="25%" align="right"><h2>Fecha: ${datos.fecha}</h2></td>
                        </tr>
                        <tr>
                            <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
                        </tr> 
                        <tr>
                            <td colspan="3" width="40%"><font size="1.2em">Paciente</font></td>
                            <td colspan="3" width="60%"><font size="1.2em">Obra Social</font></td>
                        </tr>  
                        <tr>
                            <td colspan="3" width="40%"><font size="1em">${datos.identidadPaciente}</font></td>
                            <td colspan="3" width="60%"><font size="1em">${datos.obraSocial} - Nro: ${datos.nroMatricula}</font></td>
                        </tr>
                        <tr>
                            <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
                        </tr> 
                        <tr>
                            <td colspan="6" width="100%"><font size="1.2em">Prescripción</font></td>
                        </tr>
                    </tbody>
                </table>
                <table width="100%" border="1" cellspacing="0" bordercolor="ccc" cellpadding="2">
                    <tr>
                        <td width="3%"><b>Cant</b></td>
                        <td width="25%"><b>Monodroga</b></td>
                        <td width="25%"><b>Sugerida</b></td>
                        <td width="18%"><b>Presentación</b></td>
                        <td width="12%"><b>Dosis x día</b></td>
                        <td width="8%"><b>Cobertura</b></td>
                        <td width="9%"><b>Tipo Cob</b></td>
                    </tr>
                    <tr>
                        <td width="3%">${datos.medicamento.cantprescripta}</td>
                        <td width="25%">${(datos.medicamento.monodroga || '').toUpperCase()}</td>
                        <td width="25%">${datos.medicamento.nombre_comercial || ''}</td>
                        <td width="18%">${datos.medicamento.presentacion || ''}</td>
                        <td width="12%">${datos.medicamento.posologia || ''}</td>
                        <td width="8%">${datos.medicamento.cobertura || 50}%</td>
                        <td width="9%">${datos.medicamento.cobertura2 || 'CE'}</td>
                    </tr>
                </table>
                <table width="100%" cellpadding="2">
                    <tr>
                        <td colspan="6" width="100%"><font size="1.2em">Diagnóstico</font></td>
                    </tr>
                    <tr>
                        <td colspan="2" width="70%" valign="top" style="border: 1px solid #ccc;">${datos.diagnostico || ''}</td>  
                        <td colspan="2" width="15%" align="right"><img src="${datos.qrCode}" width="100px"/></td>
                        <td colspan="2" width="15%" align="center">
                            Médico: ${datos.medico}<br>
                            MP. ${datos.matricula}<br>
                            ${datos.especialidad || ''}
                        </td>
                    </tr>
                </table>
                <table width="100%">
                    <tr>
                        <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
                    </tr>
                    <tr>
                        <td align="center" width="33%"><font size="0.7em">Validación online ingresando el número de receta</font></td>
                        <td align="center" width="33%">
                            <font size="0.7em">Número de Receta</font><br>
                            <img src="${datos.codigoBarras}" width="120px"/><br>
                            <font size="0.7em">${datos.numeroDisplay}</font>
                        </td>
                        <td align="center" width="34%">
                            <font size="0.7em">Número de Afiliado</font><br>
                            <img src="${datos.codigoBarrasAfiliado}" width="120px"/><br>
                            <font size="0.7em">${datos.nroMatricula}</font>
                        </td>
                    </tr>
                </table>
                <table width="100%">
                    <tr>
                        <td width="100%"><font size="0.9em">Vence el día: ${datos.fechaVence}</font></td>
                    </tr>
                    <tr>
                        <td width="100%"><font size="0.5em">
                            Ley 27553 Recetas electrónicas o digitales.<br>
                            <b>MEDICACIÓN DE USO CRÓNICO - TRATAMIENTO PROLONGADO</b>
                        </font></td>
                    </tr>
                </table>
                <div style="page-break-after:always;"></div>
            </body>
            </html>
        `;
    }

    /**
     * Generar HTML de receta duplicado
     */
    static generarHTMLRecetaDuplicado(datos) {
        let html = this.generarHTMLReceta(datos);
        return html.replace('ORIGINAL', 'DUPLICADO');
    }

    /**
     * Generar HTML de receta rechazada
     */
    static generarHTMLRecetaRechazada(datos) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 5px; }
                    .rechazado { background-color: #fee; padding: 15px; border: 2px solid #c00; margin: 20px 0; }
                </style>
            </head>
            <body>
                <table width="100%">
                    <tbody>
                        <tr>
                            <td colspan="2" width="15%"><img src="https://cpce.recetasalud.ar/logo/${datos.logoHeader}" width="180px"></td>
                            <td colspan="4" width="85%"><h2>RECETA NO AUTORIZADA</h2></td>
                        </tr>
                        <tr>
                            <td colspan="6"><hr/></td>
                        </tr>
                        <tr>
                            <td colspan="3"><b>Paciente:</b> ${datos.identidadPaciente}</td>
                            <td colspan="3"><b>Obra Social:</b> ${datos.obraSocial} - ${datos.nroMatricula}</td>
                        </tr>
                        <tr>
                            <td colspan="6"><hr/></td>
                        </tr>
                    </tbody>
                </table>
                <table width="100%" border="1" cellspacing="0" cellpadding="2">
                    <tr>
                        <td width="5%"><b>Cant</b></td>
                        <td width="30%"><b>Monodroga</b></td>
                        <td width="30%"><b>Sugerida</b></td>
                        <td width="35%"><b>Presentación</b></td>
                    </tr>
                    <tr>
                        <td>${datos.medicamento.cantprescripta}</td>
                        <td>${(datos.medicamento.monodroga || '').toUpperCase()}</td>
                        <td>${datos.medicamento.nombre_comercial || ''}</td>
                        <td>${datos.medicamento.presentacion || ''}</td>
                    </tr>
                </table>
                <div class="rechazado">
                    <h3>OBSERVACIÓN:</h3>
                    <p>${datos.nota || 'Medicamento no autorizado'}</p>
                    <p><small>Lamentablemente su prescripción ha sido denegada. 
                    Si tiene dudas, comuníquese con su médico o con nuestra institución.</small></p>
                </div>
                <div style="page-break-after:always;"></div>
            </body>
            </html>
        `;
    }
}

module.exports = PDFUtils;