/**
 * GeneratePDF.jsx
 * Componente para generar y descargar PDF con toda la información del dashboard
 * Props:
 * - analytics: Datos del análisis a incluir en el PDF
 * - player: Información del jugador
 * - isDisabled: Boolean para deshabilitar el botón durante descarga
 */

import React, { useState } from 'react';
import { FileDown, Loader } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../styles/generatePDF.css';

const GeneratePDF = ({ analytics, player, isDisabled = false }) => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    try {
      setGenerating(true);

      // Crear un contenedor temporal con toda la información
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        width: 1200px;
        background-color: #0a0a1a;
        color: #ffffff;
        padding: 40px;
        font-family: Arial, sans-serif;
      `;

      // Construir el HTML con toda la información
      const htmlContent = `
        <div style="background-color: #0a0a1a; color: #ffffff; padding: 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #a855f7; padding-bottom: 20px;">
            <h1 style="margin: 0; color: #a855f7; font-size: 28px;">⚡ E-Sports Health Monitoring</h1>
            <p style="margin: 10px 0 0 0; color: #888888;">Reporte de Análisis Biométrico</p>
            <p style="margin: 5px 0 0 0; color: #555555; font-size: 12px;">
              ${new Date().toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>

          <!-- Información del Jugador -->
          <div style="margin-bottom: 30px; background-color: #16213e; padding: 20px; border-radius: 8px; border: 1px solid #2d3561;">
            <h2 style="margin: 0 0 15px 0; color: #a855f7; font-size: 18px;">📋 Información del Jugador</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Nombre</p>
                <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px; font-weight: bold;">${player?.name || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Estado</p>
                <p style="margin: 5px 0 0 0; color: #00ff88; font-size: 14px; font-weight: bold;">✓ Normal</p>
              </div>
              <div>
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Edad</p>
                <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px;">${player?.age || 'N/A'} años</p>
              </div>
              <div>
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Equipo</p>
                <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px;">${player?.team || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">País</p>
                <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px;">${player?.country || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Rol</p>
                <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px;">${player?.role || 'N/A'}</p>
              </div>
            </div>
          </div>

          <!-- Métricas Principales -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; color: #a855f7; font-size: 18px;">📊 Métricas Principales</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="background-color: #16213e; padding: 15px; border-radius: 8px; border: 1px solid #2d3561;">
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Ritmo Cardíaco Promedio</p>
                <p style="margin: 10px 0 0 0; color: #a855f7; font-size: 24px; font-weight: bold;">
                  ${parseFloat(analytics.avg_heart_rate).toFixed(1)} <span style="font-size: 14px;">BPM</span>
                </p>
              </div>
              <div style="background-color: #16213e; padding: 15px; border-radius: 8px; border: 1px solid #2d3561;">
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Saturación de Oxígeno Promedio</p>
                <p style="margin: 10px 0 0 0; color: #3b82f6; font-size: 24px; font-weight: bold;">
                  ${parseFloat(analytics.avg_oxygen_saturation).toFixed(1)} <span style="font-size: 14px;">%</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Última Lectura -->
          ${analytics.last_reading ? `
            <div style="margin-bottom: 30px; background-color: #16213e; padding: 20px; border-radius: 8px; border: 1px solid #2d3561;">
              <h2 style="margin: 0 0 15px 0; color: #a855f7; font-size: 18px;">⏱️ Última Lectura</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Ritmo Cardíaco</p>
                  <p style="margin: 5px 0 0 0; color: #a855f7; font-size: 16px; font-weight: bold;">
                    ${analytics.last_reading.heart_rate_avg} BPM
                  </p>
                </div>
                <div>
                  <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Oxigenación</p>
                  <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 16px; font-weight: bold;">
                    ${analytics.last_reading.oxygen_saturation_avg}% SpO₂
                  </p>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Pronóstico y Tendencias -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; color: #a855f7; font-size: 18px;">📈 Pronóstico (Próxima Hora)</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
              <div style="background-color: #16213e; padding: 15px; border-radius: 8px; border: 1px solid #2d3561;">
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Tendencia HR</p>
                <p style="margin: 10px 0 0 0; color: #a855f7; font-size: 20px; font-weight: bold;">
                  ${analytics.forecast.heartRate} BPM
                </p>
              </div>
              <div style="background-color: #16213e; padding: 15px; border-radius: 8px; border: 1px solid #2d3561;">
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">Tendencia SpO₂</p>
                <p style="margin: 10px 0 0 0; color: #3b82f6; font-size: 20px; font-weight: bold;">
                  ${analytics.forecast.oxygen}%
                </p>
              </div>
              <div style="background-color: #16213e; padding: 15px; border-radius: 8px; border: 1px solid #2d3561;">
                <p style="margin: 0; color: #888888; font-size: 11px; text-transform: uppercase;">HRV (Variabilidad)</p>
                <p style="margin: 10px 0 0 0; color: #00ff88; font-size: 20px; font-weight: bold;">
                  ${analytics.forecast.hrv} ms
                </p>
              </div>
            </div>
          </div>

          <!-- Anomalías Detectadas -->
          ${analytics.anomalies && analytics.anomalies.length > 0 ? `
            <div style="background-color: #16213e; padding: 20px; border-radius: 8px; border: 1px solid #ffaa00;">
              <h2 style="margin: 0 0 15px 0; color: #ffaa00; font-size: 18px;">⚠️ Anomalías Detectadas</h2>
              <ul style="margin: 0; padding-left: 20px; color: #ffaa00;">
                ${analytics.anomalies.map(a => `<li style="margin-bottom: 8px;">${a}</li>`).join('')}
              </ul>
            </div>
          ` : `
            <div style="background-color: #16213e; padding: 20px; border-radius: 8px; border: 1px solid #00ff88;">
              <p style="margin: 0; color: #00ff88; font-weight: bold;">✓ No se detectaron anomalías en esta sesión</p>
            </div>
          `}

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #2d3561; text-align: center; color: #555555; font-size: 11px;">
            <p style="margin: 0;">Reporte generado automáticamente por E-Sports Health Monitoring</p>
            <p style="margin: 5px 0 0 0;">Sistema de Análisis Biométrico con AWS Athena</p>
          </div>
        </div>
      `;

      tempContainer.innerHTML = htmlContent;
      document.body.appendChild(tempContainer);

      // Convertir a canvas
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#0a0a1a',
        scale: 2,
        logging: false
      });

      // Limpiar elemento temporal
      document.body.removeChild(tempContainer);

      // Crear PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // Ancho A4 en mm
      const pageHeight = 297; // Alto A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Agregar imágenes al PDF si es necesario hacer múltiples páginas
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Descargar PDF
      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`esports-health-report-${timestamp}.pdf`);

      setGenerating(false);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Error al generar el PDF. Verifica la consola para más detalles.');
      setGenerating(false);
    }
  };

  return (
    <button 
      onClick={generatePDF} 
      disabled={isDisabled || generating}
      className="pdf-button"
      title="Descargar reporte en PDF"
    >
      {generating ? (
        <>
          <Loader size={18} className="spinning" />
          Generando PDF...
        </>
      ) : (
        <>
          <FileDown size={18} />
          Descargar Reporte PDF
        </>
      )}
    </button>
  );
};

export default GeneratePDF;