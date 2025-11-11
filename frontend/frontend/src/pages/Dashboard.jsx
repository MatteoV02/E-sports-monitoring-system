// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Activity, Droplets } from 'lucide-react';

// Componentes
import PlayerSelector from '../components/PlayerSelector';
import PlayerCard from '../components/PlayerCard';
import MetricsCard from '../components/MetricsCard';
import ChartHeartRate from '../components/ChartHeartRate';
import ChartOxygen from '../components/ChartOxygen';
import ForecastCard from '../components/ForecastCard';

// API
import { getPlayers, getPlayerAnalytics } from '../services/api';

// Estilos
import '../styles/dashboard.css';

const Dashboard = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState(null);

  // Cargar jugadores desde el backend
  useEffect(() => {
    setLoadingPlayers(true);
    getPlayers()
      .then(data => {
        setPlayers(data);
        setLoadingPlayers(false);
      })
      .catch(err => {
        console.error("Error cargando jugadores:", err);
        setError("No se pudieron cargar los jugadores");
        setLoadingPlayers(false);
      });
  }, []);

  // Cargar analytics cuando cambie el jugador seleccionado
  useEffect(() => {
    if (!selectedPlayer) {
      setAnalytics(null);
      return;
    }

    setLoadingAnalytics(true);
    getPlayerAnalytics(selectedPlayer.id)
      .then(data => {
        setAnalytics(data);
        setLoadingAnalytics(false);
      })
      .catch(err => {
        console.error("Error al obtener analytics:", err);
        setError("No se pudo obtener analytics del jugador");
        setLoadingAnalytics(false);
      });
  }, [selectedPlayer]);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">⚡ E-Sports Health Monitoring</h1>
        <p className="dashboard-subtitle">Sistema de Análisis Biométrico en Tiempo Real</p>
      </header>

      {/* Selector de Jugador */}
      {loadingPlayers ? (
        <p>Cargando jugadores...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <PlayerSelector
          players={players}
          selectedPlayer={selectedPlayer}
          onSelectPlayer={setSelectedPlayer}
        />
      )}

      {/* Contenido del Dashboard */}
      {selectedPlayer && analytics ? (
        <>
          {/* Sección superior: Info del jugador y métricas */}
          <div className="top-section">
            <PlayerCard 
              player={selectedPlayer}
              lastReading={analytics.last_reading}
              status={analytics.status}
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

          {/* Sección de gráficas */}
          <div className="charts-section">
            <ChartHeartRate data={analytics.metrics} />
            <ChartOxygen data={analytics.metrics} />
          </div>

          {/* Sección de pronóstico */}
          <ForecastCard 
            forecast={analytics.forecast}
            anomalies={analytics.anomalies}
          />
        </>
      ) : selectedPlayer && loadingAnalytics ? (
        <p>Cargando métricas del jugador...</p>
      ) : (
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
