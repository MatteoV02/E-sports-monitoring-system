// src/pages/Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Droplets } from 'lucide-react';

// Componentes
import PlayerSelector from '../components/PlayerSelector';
import PlayerCard from '../components/PlayerCard';
import MetricsCard from '../components/MetricsCard';
import ChartHeartRate from '../components/ChartHeartRate';
import ChartOxygen from '../components/ChartOxygen';
import ForecastCard from '../components/ForecastCard';

// API
import {
  getPlayers,
  getPlayerAnalytics
} from '../services/api';

// Estilos
import '../styles/dashboard.css';

const Dashboard = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar jugadores al inicio
  useEffect(() => {
    getPlayers()
      .then(data => setPlayers(data))
      .catch(err => console.error("Error cargando jugadores:", err));
  }, []);

  // Cargar analytics cuando se selecciona un jugador
  useEffect(() => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);

    getPlayerAnalytics(selectedPlayer.id)
      .then(data => setAnalytics(data))
      .catch(err => {
        console.error("Error al obtener analytics:", err);
        setError("No se pudieron cargar las métricas del jugador.");
        setAnalytics(null);
      })
      .finally(() => setLoading(false));
  }, [selectedPlayer]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">⚡ E-Sports Health Monitoring</h1>
        <p className="dashboard-subtitle">
          Sistema de análisis biométrico en tiempo real
        </p>
      </header>

      {/* Selector de jugador */}
      <PlayerSelector
        players={players}
        selectedPlayer={selectedPlayer}
        onSelectPlayer={setSelectedPlayer}
      />

      {loading && (
        <div className="loading-state">
          <Activity size={48} />
          <p>Cargando métricas...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {selectedPlayer && analytics && !loading && !error && (
        <>
          {/* Sección superior: info jugador y métricas */}
          <div className="top-section">
            <PlayerCard
              player={selectedPlayer}
              lastReading={analytics.last_reading || {}}
              status={analytics.status || 'normal'}
            />

            <div className="metrics-grid">
              <MetricsCard
                title="HR Promedio"
                value={`${analytics.avg_heart_rate} BPM`}
                icon={Activity}
                color="#a855f7"
              />
              <MetricsCard
                title="SpO₂ Promedio"
                value={`${analytics.avg_oxygen_saturation}%`}
                icon={Droplets}
                color="#3b82f6"
              />
            </div>
          </div>

          {/* Gráficas */}
          <div className="charts-section">
            <ChartHeartRate data={selectedPlayer.metrics || []} />
            <ChartOxygen data={selectedPlayer.metrics || []} />
          </div>

          {/* Pronóstico y anomalías */}
          <ForecastCard
            forecast={analytics.forecast || []}
            anomalies={analytics.anomalies || []}
          />
        </>
      )}

      {!selectedPlayer && !loading && (
        <div className="empty-state">
          <Activity size={64} className="empty-icon" />
          <h2 className="empty-title">Selecciona un jugador para ver sus métricas</h2>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
