// utils/pdfUtils.js - VERSIÓN ES6 MODULES
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import chromium from '@sparticuz/chromium';
import { promises as fs } from 'fs';
import path from 'path';

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
     * Generar PDF desde HTML usando Puppeteer con chrome-aws-lambda
     */
    static async generarPDFDesdeHTML(htmlContent, opciones = {}) {
        let browser = null;

        try {
            console.log('🚀 Iniciando generación de PDF...');

            const isDev = process.env.NODE_ENV !== 'production';

            if (isDev) {
                console.log('📍 Modo desarrollo detectado');
                try {
                    const puppeteer = await import('puppeteer');
                    browser = await puppeteer.default.launch({
                        headless: 'new',
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });
                } catch (devError) {
                    console.log('⚠️ Puppeteer local no disponible, usando chrome-aws-lambda');
                    browser = await chromium.puppeteer.launch({
                        args: chromium.args,
                        defaultViewport: chromium.defaultViewport,
                        executablePath: await chromium.executablePath,
                        headless: chromium.headless,
                    });
                }
            } else {
                console.log('🌐 Modo producción - Usando chrome-aws-lambda');
                browser = await chromium.puppeteer.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath,
                    headless: chromium.headless,
                });
            }

            console.log('✅ Browser iniciado correctamente');

            const page = await browser.newPage();

            console.log('📄 Configurando contenido HTML...');
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            console.log('🖨️ Generando PDF...');
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

            console.log(`✅ PDF generado exitosamente (${pdfBuffer.length} bytes)`);
            return pdfBuffer;

        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            throw error;
        } finally {
            if (browser) {
                try {
                    await browser.close();
                    console.log('🔒 Browser cerrado correctamente');
                } catch (closeError) {
                    console.error('⚠️ Error cerrando browser:', closeError);
                }
            }
        }
    }

    static async crearDirectorio(ruta) {
        try {
            await fs.mkdir(ruta, { recursive: true });
            return true;
        } catch (error) {
            console.error('Error creando directorio:', error);
            return false;
        }
    }

    static escaparHTML(texto) {
        if (!texto) return '';
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

export default PDFUtils;