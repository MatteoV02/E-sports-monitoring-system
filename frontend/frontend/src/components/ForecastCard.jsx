/**
 * ForecastCard.jsx
 * Tarjeta de pronóstico y análisis de tendencias
 * Props:
 * - forecast: Objeto con pronósticos de HR, O2 y HRV
 * - anomalies: Array de strings con anomalías detectadas
 */

import React from 'react';
import { TrendingUp, AlertCircle, Activity, Droplets, BarChart3 } from 'lucide-react';
import '../styles/forecastCard.css';

const ForecastCard = ({ forecast, anomalies }) => {
  return (
    <div className="forecast-card">
      <h3 className="forecast-title">
        <TrendingUp size={20} className="forecast-icon" />
        Análisis y Pronóstico
      </h3>

      <div className="forecast-content">
        <div className="forecast-item">
          <div className="forecast-label">
            <Activity size={16} className="forecast-item-icon heart-rate" />
            Tendencia HR próxima hora
          </div>
          <div className="forecast-value heart-rate-value">{forecast.heartRate} BPM</div>
        </div>

        <div className="forecast-item">
          <div className="forecast-label">
            <Droplets size={16} className="forecast-item-icon oxygen" />
            Tendencia SpO₂ próxima hora
          </div>
          <div className="forecast-value oxygen-value">{forecast.oxygen}%</div>
        </div>

        <div className="forecast-item">
          <div className="forecast-label">
            <BarChart3 size={16} className="forecast-item-icon hrv" />
            Variabilidad HR (HRV)
          </div>
          <div className="forecast-value hrv-value">{forecast.hrv} ms</div>
        </div>
      </div>

      {anomalies && anomalies.length > 0 && (
        <div className="anomalies-section">
          <h4 className="anomalies-title">
            <AlertCircle size={18} className="anomalies-icon" />
            Anomalías Detectadas
          </h4>
          <ul className="anomalies-list">
            {anomalies.map((anomaly, idx) => (
              <li key={idx} className="anomaly-item">
                <span className="anomaly-bullet">•</span>
                {anomaly}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!anomalies || anomalies.length === 0) && (
        <div className="no-anomalies">
          <p className="no-anomalies-text">
            ✓ No se detectaron anomalías en esta sesión
          </p>
        </div>
      )}
    </div>
  );
};

export default ForecastCard;