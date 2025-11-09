/**
 * Dashboard.jsx
 * Página principal del dashboard de monitoreo
 * Integra todos los componentes y maneja el estado global
 */

import React, { useState, useMemo } from 'react';
import { Activity, Droplets } from 'lucide-react';

// Componentes
import PlayerSelector from '../components/PlayerSelector';
import PlayerCard from '../components/PlayerCard';
import MetricsCard from '../components/MetricsCard';
import ChartHeartRate from '../components/ChartHeartRate';
import ChartOxygen from '../components/ChartOxygen';
import ForecastCard from '../components/ForecastCard';

// Data y utilidades
import { MOCK_PLAYERS } from '../data/mockPlayers';
import { calculateAnalytics } from '../utils/analytics';

// Estilos
import '../styles/dashboard.css';

const Dashboard = () => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Calcular analytics cuando cambia el jugador seleccionado
  const analytics = useMemo(() => {
    if (!selectedPlayer) return null;
    return calculateAnalytics(selectedPlayer.metrics);
  }, [selectedPlayer]);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">⚡ E-Sports Health Monitoring</h1>
        <p className="dashboard-subtitle">Sistema de Análisis Biométrico en Tiempo Real</p>
      </header>

      {/* Selector de Jugador */}
      <PlayerSelector 
        players={MOCK_PLAYERS}
        selectedPlayer={selectedPlayer}
        onSelectPlayer={setSelectedPlayer}
      />

      {/* Contenido del Dashboard */}
      {selectedPlayer && analytics ? (
        <>
          {/* Sección superior: Info del jugador y métricas */}
          <div className="top-section">
            <PlayerCard 
              player={selectedPlayer}
              lastReading={selectedPlayer.metrics[selectedPlayer.metrics.length - 1]}
              status={analytics.status}
            />
            
            <div className="metrics-grid">
              <MetricsCard 
                title="HR Promedio"
                value={`${analytics.avgHR} BPM`}
                icon={Activity}
                color="#a855f7"
              />
              <MetricsCard 
                title="SpO₂ Promedio"
                value={`${analytics.avgO2}%`}
                icon={Droplets}
                color="#3b82f6"
              />
            </div>
          </div>

          {/* Sección de gráficas */}
          <div className="charts-section">
            <ChartHeartRate data={selectedPlayer.metrics} />
            <ChartOxygen data={selectedPlayer.metrics} />
          </div>

          {/* Sección de pronóstico */}
          <ForecastCard 
            forecast={analytics.forecast}
            anomalies={analytics.anomalies}
          />
        </>
      ) : (
        /* Estado vacío */
        <div className="empty-state">
          <Activity size={64} className="empty-icon" />
          <h2 className="empty-title">Selecciona un jugador para ver sus métricas</h2>
          <p className="empty-description">
            Elige un jugador del menú desplegable para comenzar a analizar sus datos biométricos
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;