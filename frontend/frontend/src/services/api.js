// src/services/api.js
const API_BASE = "http://localhost:8000";

// ---- Health check ----
export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Error al hacer health check");
  return await res.json();
}

// ---- AWS Status ----
export async function getAWSStatus() {
  const res = await fetch(`${API_BASE}/aws/status`);
  if (!res.ok) throw new Error("Error al obtener status de AWS");
  return await res.json();
}

// ---- AWS Records ----
export async function getAWSRecords(limit = 100) {
  const res = await fetch(`${API_BASE}/aws/records?limit=${limit}`);
  if (!res.ok) throw new Error("Error al obtener registros de AWS");
  return await res.json();
}

export async function getAWSLatestRecords(limit = 50) {
  const res = await fetch(`${API_BASE}/aws/records/latest?limit=${limit}`);
  if (!res.ok) throw new Error("Error al obtener últimos registros");
  return await res.json();
}

export async function getAWSRecentHours(hours = 24) {
  const res = await fetch(`${API_BASE}/aws/records/recent-hours?hours=${hours}`);
  if (!res.ok) throw new Error("Error al obtener registros recientes");
  return await res.json();
}

// ---- AWS Stats ----
export async function getAWSStatistics() {
  const res = await fetch(`${API_BASE}/aws/stats`);
  if (!res.ok) throw new Error("Error al obtener estadísticas");
  return await res.json();
}

// ---- AWS High Risk ----
export async function getAWSHighRisk(limit = 50) {
  const res = await fetch(`${API_BASE}/aws/high-risk?limit=${limit}`);
  if (!res.ok) throw new Error("Error al obtener registros de alto riesgo");
  return await res.json();
}

// ---- AWS Analytics ----
export async function getAWSOverallAnalytics() {
  const res = await fetch(`${API_BASE}/aws/analytics/overall`);
  if (!res.ok) throw new Error("Error al obtener analytics generales");
  return await res.json();
}

export async function getAWSTrends(days = 7) {
  const res = await fetch(`${API_BASE}/aws/analytics/trends?days=${days}`);
  if (!res.ok) throw new Error("Error al obtener tendencias");
  return await res.json();
}

// ---- AWS Date Range ----
export async function getAWSRecordsByDate(params = {}) {
  const { start_date, end_date, heart_rate_category, oxygen_category, limit = 100 } = params;
  
  const queryParams = new URLSearchParams();
  if (start_date) queryParams.append('start_date', start_date);
  if (end_date) queryParams.append('end_date', end_date);
  if (heart_rate_category) queryParams.append('heart_rate_category', heart_rate_category);
  if (oxygen_category) queryParams.append('oxygen_category', oxygen_category);
  queryParams.append('limit', limit);
  
  const res = await fetch(`${API_BASE}/aws/date-range?${queryParams}`);
  if (!res.ok) throw new Error("Error al filtrar registros por fecha");
  return await res.json();
}

// ---- AWS Daily Summary ----
export async function getAWSDailySummary(date) {
  const res = await fetch(`${API_BASE}/aws/daily-summary?target_date=${date}`);
  if (!res.ok) throw new Error("Error al obtener resumen diario");
  return await res.json();
}

// ---- AWS Hourly Stats ----
export async function getAWSHourlyStats(params = {}) {
  const { date_filter, limit_hours = 24 } = params;
  
  const queryParams = new URLSearchParams();
  if (date_filter) queryParams.append('date_filter', date_filter);
  queryParams.append('limit_hours', limit_hours);
  
  const res = await fetch(`${API_BASE}/aws/records/hourly-stats?${queryParams}`);
  if (!res.ok) throw new Error("Error al obtener estadísticas por hora");
  return await res.json();
}

// ---- Utilidad de manejo de respuestas ----
export async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Error: ${response.status}`);
  }
  return await response.json();
}
