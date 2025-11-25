// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Activity, Droplets, RefreshCw } from 'lucide-react';

// Componentes
import PlayerCard from '../components/PlayerCard';
import MetricsCard from '../components/MetricsCard';
import ChartHeartRate from '../components/ChartHeartRate';
import ChartOxygen from '../components/ChartOxygen';
import ForecastCard from '../components/ForecastCard';

// API y adaptadores
import { 
  getAWSRecords,
  getAWSStatistics, 
  getAWSStatus,
  healthCheck 
} from '../services/api';
import { 
  adaptAWSDataToDashboard, 
  createVirtualPlayer 
} from '../utils/awsAdapter';

// Estilos
import '../styles/dashboard.css';

// Agregar estos estilos adicionales en dashboard.css:
/*
.refresh-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  color: white;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition: all var(--transition-fast);
  border: none;
  cursor: pointer;
}

.refresh-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.aws-badge {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-success);
  color: var(--color-bg-primary);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
}

.dashboard-last-update {
  margin: var(--spacing-sm) 0 0 0;
  font-size: 0.85rem;
  opacity: 0.8;
}

.loading-state, .error-state {
  text-align: center;
  padding: 80px var(--spacing-xl);
  animation: fadeIn var(--transition-normal);
}

.loading-icon {
  color: var(--color-primary);
  margin-bottom: var(--spacing-xl);
}

.error-state h2 {
  color: var(--color-danger);
  margin-bottom: var(--spacing-md);
}

.error-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.retry-button {
  padding: var(--spacing-md) var(--spacing-2xl);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.retry-button:hover {
  background-color: #9333ea;
  transform: translateY(-2px);
}
*/

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [awsEnabled, setAwsEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [recordCount, setRecordCount] = useState(0);
  const [dateRange, setDateRange] = useState({ first: null, last: null });

  // Jugador virtual para mantener compatibilidad
  const virtualPlayer = createVirtualPlayer();

  // Función para cargar datos de AWS
  const loadAWSData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar conexión backend
      await healthCheck();
      
      // Verificar status de AWS
      const awsStatus = await getAWSStatus();
      setAwsEnabled(awsStatus.aws_enabled);

      if (!awsStatus.aws_enabled) {
        setError("AWS Athena no está habilitado en el backend");
        setLoading(false);
        return;
      }

      // Obtener TODOS los datos históricos disponibles (sin límite de horas)
      const [records, stats] = await Promise.all([
        getAWSRecords(1000), // Obtener hasta 1000 registros históricos
        getAWSStatistics()
      ]);

      if (!records || records.length === 0) {
        setError("No hay datos disponibles en AWS Athena");
        setLoading(false);
        return;
      }

      // Adaptar datos al formato esperado
      const adaptedData = adaptAWSDataToDashboard(records, stats);
      setAnalytics(adaptedData);
      setRecordCount(records.length);
      
      // Calcular rango de fechas
      if (records.length > 0) {
        setDateRange({
          first: new Date(records[records.length - 1].timestamp),
          last: new Date(records[0].timestamp)
        });
      }
      
      setLastUpdate(new Date());
      setLoading(false);

    } catch (err) {
      console.error("Error al cargar datos de AWS:", err);
      setError(err.message || "Error al conectar con el backend");
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAWSData();
  }, []);

  // Función para refrescar datos
  const handleRefresh = () => {
    loadAWSData();
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">⚡ E-Sports Health Monitoring</h1>
        <p className="dashboard-subtitle">
          Sistema de Análisis Biométrico con AWS Athena
        </p>
        {lastUpdate && (
          <p className="dashboard-last-update">
            Última actualización: {lastUpdate.toLocaleString('es-ES', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
        )}
      </header>

      {/* Botón de refresh */}
      <div className="refresh-container">
        <button 
          onClick={handleRefresh} 
          disabled={loading}
          className="refresh-button"
        >
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          {loading ? 'Cargando...' : 'Actualizar Datos'}
        </button>
        {awsEnabled && (
          <span className="aws-badge">✓ AWS Habilitado</span>
        )}
        {recordCount > 0 && (
          <span className="data-info">
            📊 {recordCount} registros
            {dateRange.first && dateRange.last && (
              <span className="date-range-info">
                {' · '}
                {dateRange.first.toLocaleDateString('es-ES')} - {dateRange.last.toLocaleDateString('es-ES')}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Estados de carga y error */}
      {loading && !analytics ? (
        <div className="loading-state">
          <Activity size={64} className="loading-icon spinning" />
          <h2>Cargando datos de AWS Athena...</h2>
          <p>Conectando con la base de datos en la nube</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <h2>⚠ Error al cargar datos</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-button">
            Reintentar
          </button>
        </div>
      ) : analytics ? (
        <>
          {/* Sección superior: Info del jugador y métricas */}
          <div className="top-section">
            <PlayerCard 
              player={virtualPlayer}
              lastReading={analytics.last_reading}
              status={analytics.status}
            />

            <div className="metrics-grid">
              <MetricsCard 
                title="HR Promedio"
                value={`${parseFloat(analytics.avg_heart_rate).toFixed(1)} BPM`}
                icon={Activity}
                color="#a855f7"
              />
              <MetricsCard 
                title="SpO₂ Promedio"
                value={`${parseFloat(analytics.avg_oxygen_saturation).toFixed(1)}%`}
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
      ) : (
        <div className="empty-state">
          <Activity size={64} className="empty-icon" />
          <h2 className="empty-title">No hay datos disponibles</h2>
          <p className="empty-description">
            Intenta actualizar los datos o verifica la configuración de AWS
          </p>
          <button onClick={handleRefresh} className="retry-button">
            Cargar Datos
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;