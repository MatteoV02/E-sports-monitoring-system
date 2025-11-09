/**
 * analytics.js
 * Funciones de utilidad para cálculos estadísticos, pronósticos y detección de anomalías
 */

/**
 * Calcula todas las métricas analíticas de un jugador
 * @param {Array} metrics - Array de métricas del jugador
 * @returns {Object} Objeto con estadísticas, pronósticos y anomalías
 */
export const calculateAnalytics = (metrics) => {
  if (!metrics || metrics.length === 0) return null;

  const heartRates = metrics.map(m => m.heart_rate_avg).filter(h => h !== null);
  const oxygenLevels = metrics.map(m => m.oxygen_saturation_avg).filter(o => o !== null);

  // Promedios generales
  const avgHR = (heartRates.reduce((a, b) => a + b, 0) / heartRates.length).toFixed(0);
  const avgO2 = (oxygenLevels.reduce((a, b) => a + b, 0) / oxygenLevels.length).toFixed(1);

  // Cálculo de HRV (Variabilidad del Ritmo Cardíaco)
  const hrv = calculateHRV(heartRates);

  // Pronósticos
  const forecast = calculateForecast(heartRates, oxygenLevels, hrv);

  // Detección de anomalías
  const anomalies = detectAnomalies(heartRates, oxygenLevels);

  // Estado del jugador
  const status = determinePlayerStatus(heartRates, oxygenLevels);

  return {
    avgHR,
    avgO2,
    hrv,
    forecast,
    anomalies,
    status
  };
};

/**
 * Calcula la variabilidad del ritmo cardíaco (HRV)
 * @param {Array} heartRates - Array de frecuencias cardíacas
 * @returns {String} HRV redondeado a 1 decimal
 */
const calculateHRV = (heartRates) => {
  const mean = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
  const variance = heartRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / heartRates.length;
  return Math.sqrt(variance).toFixed(1);
};

/**
 * Genera pronósticos basados en promedios móviles
 * @param {Array} heartRates - Array de frecuencias cardíacas
 * @param {Array} oxygenLevels - Array de niveles de oxigenación
 * @param {String} hrv - Variabilidad del ritmo cardíaco
 * @returns {Object} Pronósticos de HR, O2 y HRV
 */
const calculateForecast = (heartRates, oxygenLevels, hrv) => {
  // Promedio de últimas 3 lecturas para pronóstico simple
  const recentHR = heartRates.slice(-3);
  const recentO2 = oxygenLevels.slice(-3);
  
  const forecastHR = (recentHR.reduce((a, b) => a + b, 0) / recentHR.length).toFixed(0);
  const forecastO2 = (recentO2.reduce((a, b) => a + b, 0) / recentO2.length).toFixed(1);

  return {
    heartRate: forecastHR,
    oxygen: forecastO2,
    hrv: hrv
  };
};

/**
 * Detecta anomalías en las métricas
 * @param {Array} heartRates - Array de frecuencias cardíacas
 * @param {Array} oxygenLevels - Array de niveles de oxigenación
 * @returns {Array} Array de strings con anomalías detectadas
 */
const detectAnomalies = (heartRates, oxygenLevels) => {
  const anomalies = [];
  
  const maxHR = Math.max(...heartRates);
  const minHR = Math.min(...heartRates);
  const minO2 = Math.min(...oxygenLevels);
  const maxO2 = Math.max(...oxygenLevels);

  // Detección de picos de ritmo cardíaco
  if (maxHR > 110) {
    anomalies.push(`Pico de ritmo cardíaco elevado: ${maxHR} BPM`);
  }

  // Detección de ritmo cardíaco muy bajo
  if (minHR < 55) {
    anomalies.push(`Ritmo cardíaco bajo detectado: ${minHR} BPM`);
  }

  // Detección de oxigenación baja
  if (minO2 < 95) {
    anomalies.push(`Oxigenación baja detectada: ${minO2}%`);
  }

  // Detección de cambios bruscos en HR
  for (let i = 1; i < heartRates.length; i++) {
    const change = Math.abs(heartRates[i] - heartRates[i-1]);
    if (change > 20) {
      anomalies.push(`Cambio brusco en HR: ${change} BPM en 15 min`);
      break; // Solo reportamos el primer cambio brusco
    }
  }

  // Detección de tendencia sostenida al alza
  const recentTrend = heartRates.slice(-4);
  const isIncreasing = recentTrend.every((val, idx) => idx === 0 || val >= recentTrend[idx - 1]);
  if (isIncreasing && recentTrend[recentTrend.length - 1] > 95) {
    anomalies.push(`Tendencia sostenida al alza en HR: posible estrés acumulado`);
  }

  return anomalies;
};

/**
 * Determina el estado general del jugador
 * @param {Array} heartRates - Array de frecuencias cardíacas
 * @param {Array} oxygenLevels - Array de niveles de oxigenación
 * @returns {String} 'normal', 'fatigue' o 'risk'
 */
const determinePlayerStatus = (heartRates, oxygenLevels) => {
  const maxHR = Math.max(...heartRates);
  const minO2 = Math.min(...oxygenLevels);
  const avgHR = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;

  // Estado de riesgo
  if (maxHR > 120 || minO2 < 94 || avgHR > 100) {
    return 'risk';
  }

  // Estado de fatiga
  if (maxHR > 100 || minO2 < 96 || avgHR > 85) {
    return 'fatigue';
  }

  // Estado normal
  return 'normal';
};

/**
 * Calcula la diferencia porcentual entre dos valores
 * @param {Number} current - Valor actual
 * @param {Number} previous - Valor anterior
 * @returns {Number} Diferencia porcentual
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return (((current - previous) / previous) * 100).toFixed(1);
};