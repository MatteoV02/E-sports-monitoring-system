// src/utils/awsAdapter.js
/**
 * Adaptador para transformar datos de AWS al formato esperado por los componentes
 */

/**
 * Transforma los datos de AWS en formato de "jugador virtual"
 * @param {Array} records - Registros de AWS
 * @param {Object} stats - Estadísticas generales de AWS
 * @returns {Object} Datos en formato esperado por el Dashboard
 */
export const adaptAWSDataToDashboard = (records, stats) => {
  if (!records || records.length === 0) {
    return null;
  }

  // Transformar registros al formato de métricas
  // Invertir el orden para mostrar de más antiguo a más reciente en las gráficas
  const metrics = records
    .map(record => ({
      timestamp: record.timestamp,
      heart_rate_avg: parseFloat(record.heart_rate_avg),
      oxygen_saturation_avg: parseFloat(record.oxygen_saturation_avg),
      heart_rate_category: record.heart_rate_category,
      oxygen_category: record.oxygen_category
    }))
    .reverse(); // Invertir para que el más antiguo esté primero

  // Última lectura (la primera en el array original, antes de invertir)
  const lastReading = {
    timestamp: records[0].timestamp,
    heart_rate_avg: parseFloat(records[0].heart_rate_avg),
    oxygen_saturation_avg: parseFloat(records[0].oxygen_saturation_avg),
    heart_rate_category: records[0].heart_rate_category,
    oxygen_category: records[0].oxygen_category
  };

  // Calcular promedios con 1 decimal
  const avgHR = (stats?.avg_heart_rate || calculateAverage(metrics, 'heart_rate_avg')).toFixed(1);
  const avgO2 = (stats?.avg_oxygen || calculateAverage(metrics, 'oxygen_saturation_avg')).toFixed(1);

  // Calcular HRV (Variabilidad del ritmo cardíaco)
  const hrv = calculateHRV(metrics.map(m => m.heart_rate_avg));

  // Generar pronósticos
  const forecast = generateForecast(metrics);

  // Detectar anomalías
  const anomalies = detectAnomalies(metrics, stats);

  // Determinar estado
  const status = determineStatus(metrics, stats);

  return {
    metrics,
    last_reading: lastReading,
    avg_heart_rate: avgHR,
    avg_oxygen_saturation: avgO2,
    forecast,
    anomalies,
    status,
    hrv
  };
};

/**
 * Calcula el promedio de una propiedad en un array de objetos
 * Retorna con 1 decimal
 */
const calculateAverage = (array, property) => {
  const values = array.map(item => item[property]).filter(v => v != null);
  if (values.length === 0) return '0.0';
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(1);
};

/**
 * Calcula la variabilidad del ritmo cardíaco (HRV)
 */
const calculateHRV = (heartRates) => {
  if (heartRates.length < 2) return '0.0';
  
  const mean = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
  const variance = heartRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / heartRates.length;
  return Math.sqrt(variance).toFixed(1);
};

/**
 * Genera pronósticos basados en las últimas lecturas
 */
const generateForecast = (metrics) => {
  const recentMetrics = metrics.slice(0, 5); // Últimas 5 lecturas
  
  const avgHR = calculateAverage(recentMetrics, 'heart_rate_avg');
  const avgO2 = calculateAverage(recentMetrics, 'oxygen_saturation_avg');
  const hrv = calculateHRV(recentMetrics.map(m => m.heart_rate_avg));

  return {
    heartRate: Math.round(avgHR),
    oxygen: parseFloat(avgO2).toFixed(1),
    hrv: hrv
  };
};

/**
 * Detecta anomalías en los datos
 */
const detectAnomalies = (metrics, stats) => {
  const anomalies = [];
  
  // Obtener valores de HR y O2
  const heartRates = metrics.map(m => m.heart_rate_avg);
  const oxygenLevels = metrics.map(m => m.oxygen_saturation_avg);
  
  const maxHR = Math.max(...heartRates);
  const minHR = Math.min(...heartRates);
  const minO2 = Math.min(...oxygenLevels);

  // Verificar registros de alto riesgo
  if (stats?.high_heart_rate_count > 0) {
    anomalies.push(`Se detectaron ${stats.high_heart_rate_count} registros con ritmo cardíaco elevado`);
  }

  if (stats?.low_heart_rate_count > 0) {
    anomalies.push(`Se detectaron ${stats.low_heart_rate_count} registros con ritmo cardíaco bajo`);
  }

  if (stats?.low_oxygen_count > 0) {
    anomalies.push(`Se detectaron ${stats.low_oxygen_count} registros con oxigenación baja`);
  }

  // Picos extremos
  if (maxHR > 120) {
    anomalies.push(`Pico de ritmo cardíaco muy elevado: ${maxHR} BPM`);
  }

  if (minHR < 50) {
    anomalies.push(`Ritmo cardíaco inusualmente bajo: ${minHR} BPM`);
  }

  if (minO2 < 94) {
    anomalies.push(`Nivel de oxigenación crítico detectado: ${minO2}%`);
  }

  // Cambios bruscos
  for (let i = 1; i < Math.min(10, heartRates.length); i++) {
    const change = Math.abs(heartRates[i] - heartRates[i-1]);
    if (change > 25) {
      anomalies.push(`Cambio brusco en HR: ${change.toFixed(0)} BPM entre lecturas`);
      break;
    }
  }

  return anomalies;
};

/**
 * Determina el estado general basado en las métricas
 */
const determineStatus = (metrics, stats) => {
  // Obtener categorías de las últimas lecturas
  const recentMetrics = metrics.slice(0, 10);
  
  const highRiskCount = recentMetrics.filter(m => 
    m.heart_rate_category === 'High' || 
    m.heart_rate_category === 'Low' ||
    m.oxygen_category === 'Critical'
  ).length;

  const warningCount = recentMetrics.filter(m =>
    m.oxygen_category === 'Concerning'
  ).length;

  // Estado de riesgo
  if (highRiskCount >= 3 || stats?.low_oxygen_count > 5) {
    return 'risk';
  }

  // Estado de fatiga
  if (highRiskCount >= 1 || warningCount >= 2) {
    return 'fatigue';
  }

  // Estado normal
  return 'normal';
};

/**
 * Crea un "jugador virtual" para mantener compatibilidad con PlayerCard
 */
export const createVirtualPlayer = () => ({
  id: 1,
  name: "Mateo Vanegas",
  age: 20,
  team: "E-Sports Sergio Arboleda",
  country: "Colombia",
  role: "Jugador"
});