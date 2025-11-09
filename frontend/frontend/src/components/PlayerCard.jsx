/**
 * PlayerCard.jsx
 * Tarjeta de información del jugador seleccionado
 * Muestra datos personales, última lectura y estado de salud
 * Props:
 * - player: Objeto del jugador con información personal
 * - lastReading: Última lectura de métricas biométricas
 * - status: Estado actual ('normal', 'fatigue', 'risk')
 */

import React from 'react';
import { Activity, Droplets } from 'lucide-react';
import '../styles/playerCard.css';

const PlayerCard = ({ player, lastReading, status }) => {
  if (!player) return null;

  const statusConfig = {
    normal: {
      color: 'var(--color-success)',
      label: 'Normal',
      className: 'status-normal'
    },
    fatigue: {
      color: 'var(--color-warning)',
      label: 'Fatiga',
      className: 'status-fatigue'
    },
    risk: {
      color: 'var(--color-danger)',
      label: 'Riesgo',
      className: 'status-risk'
    }
  };

  const currentStatus = statusConfig[status] || statusConfig.normal;

  return (
    <div className="player-card">
      <div className="player-card-header">
        <h2 className="player-name">{player.name}</h2>
        <span className={`status-badge ${currentStatus.className}`}>
          {currentStatus.label}
        </span>
      </div>

      <div className="player-info-grid">
        <div className="info-item">
          <span className="info-label">Edad</span>
          <span className="info-value">{player.age} años</span>
        </div>
        <div className="info-item">
          <span className="info-label">Equipo</span>
          <span className="info-value">{player.team}</span>
        </div>
        <div className="info-item">
          <span className="info-label">País</span>
          <span className="info-value">{player.country}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Rol</span>
          <span className="info-value">{player.role}</span>
        </div>
      </div>

      {lastReading && (
        <div className="last-reading-section">
          <h4 className="last-reading-title">Última Lectura</h4>
          <div className="reading-values">
            <div className="reading-item">
              <Activity size={20} className="reading-icon heart-rate" />
              <span className="reading-value">{lastReading.heart_rate_avg} BPM</span>
            </div>
            <div className="reading-item">
              <Droplets size={20} className="reading-icon oxygen" />
              <span className="reading-value">{lastReading.oxygen_saturation_avg}% SpO₂</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;