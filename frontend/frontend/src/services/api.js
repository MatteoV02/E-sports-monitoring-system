// src/services/api.js
const API_BASE = "http://localhost:8000"; // Asegúrate de que FastAPI corra aquí

// ---- Jugadores ----
export async function getPlayers() {
  const res = await fetch(`${API_BASE}/players`);
  if (!res.ok) throw new Error("Error al obtener jugadores");
  return await res.json();
}

export async function getPlayer(playerId) {
  const res = await fetch(`${API_BASE}/players/${playerId}`);
  if (!res.ok) throw new Error("Error al obtener jugador");
  return await res.json();
}

export async function createPlayer(playerData) {
  const res = await fetch(`${API_BASE}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playerData),
  });
  if (!res.ok) throw new Error("Error al crear jugador");
  return await res.json();
}

// ---- Métricas ----
export async function getPlayerMetrics(playerId, hours = 24) {
  const res = await fetch(`${API_BASE}/players/${playerId}/metrics?hours=${hours}`);
  if (!res.ok) throw new Error("Error al obtener métricas del jugador");
  return await res.json();
}

export async function getLatestMetric(playerId) {
  const res = await fetch(`${API_BASE}/players/${playerId}/metrics/latest`);
  if (!res.ok) throw new Error("Error al obtener la última métrica");
  return await res.json();
}

export async function createMetric(metricData) {
  const res = await fetch(`${API_BASE}/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metricData),
  });
  if (!res.ok) throw new Error("Error al crear métrica");
  return await res.json();
}

// ---- Analytics ----
export async function getPlayerAnalytics(playerId, hours = 8) {
  const res = await fetch(`${API_BASE}/players/${playerId}/analytics?hours=${hours}`);
  if (!res.ok) throw new Error("Error al obtener analytics del jugador");
  return await res.json();
}

export async function getPlayerSummary(playerId) {
  const res = await fetch(`${API_BASE}/players/${playerId}/summary`);
  if (!res.ok) throw new Error("Error al obtener resumen del jugador");
  return await res.json();
}

// ---- Equipos ----
export async function getTeamStats(teamName) {
  const res = await fetch(`${API_BASE}/teams/${teamName}/stats`);
  if (!res.ok) throw new Error("Error al obtener estadísticas del equipo");
  return await res.json();
}

// ---- Dashboard ----
export async function getDashboardOverview() {
  const res = await fetch(`${API_BASE}/dashboard/overview`);
  if (!res.ok) throw new Error("Error al obtener overview del dashboard");
  return await res.json();
}

// ---- Health check ----
export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Error al hacer health check");
  return await res.json();
}
