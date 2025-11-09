/**
 * MetricsCard.jsx
 * Tarjeta de visualización de una métrica específica
 * Props:
 * - title: Título de la métrica
 * - value: Valor de la métrica
 * - icon: Componente de ícono de Lucide React
 * - trend: Porcentaje de cambio (opcional)
 * - color: Color del ícono
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import '../styles/metricsCard.css';

const MetricsCard = ({ title, value, icon: Icon, trend, color }) => {
  return (
    <div className="metrics-card">
      <div className="metrics-header">
        <Icon size={24} className="metrics-icon" style={{ color: color }} />
        <h3 className="metrics-title">{title}</h3>
      </div>
      
      <div className="metrics-value">{value}</div>
      
      {trend !== undefined && trend !== null && (
        <div className={`metrics-trend ${trend >= 0 ? 'trend-positive' : 'trend-negative'}`}>
          {trend >= 0 ? (
            <TrendingUp size={16} className="trend-icon" />
          ) : (
            <TrendingDown size={16} className="trend-icon" />
          )}
          <span className="trend-value">
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="trend-label">vs sesión anterior</span>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;