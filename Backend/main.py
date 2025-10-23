from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import statistics

from database import get_db, init_db, PlayerDB, MetricDB
from models import Player, PlayerCreate, Metric, MetricCreate, PlayerMetrics, AnalyticsResponse, TeamStats

# Inicializar la aplicación FastAPI
app = FastAPI(
    title="E-Sports Health Monitoring API",
    description="API para monitoreo de métricas biométricas de jugadores profesionales",
    version="1.0.0"
)

# Configurar CORS para permitir requests del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar base de datos al iniciar
@app.on_event("startup")
def startup_event():
    init_db()

# Endpoints de Jugadores
@app.get("/players", response_model=List[Player])
def get_players(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener lista de todos los jugadores"""
    players = db.query(PlayerDB).offset(skip).limit(limit).all()
    return players

@app.get("/players/{player_id}", response_model=Player)
def get_player(player_id: int, db: Session = Depends(get_db)):
    """Obtener información de un jugador específico"""
    player = db.query(PlayerDB).filter(PlayerDB.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return player

@app.post("/players", response_model=Player)
def create_player(player: PlayerCreate, db: Session = Depends(get_db)):
    """Crear un nuevo jugador"""
    db_player = PlayerDB(**player.dict())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

# Endpoints de Métricas
@app.post("/metrics", response_model=Metric)
def create_metric(metric: MetricCreate, db: Session = Depends(get_db)):
    """Registrar nuevas métricas para un jugador"""
    # Verificar que el jugador existe
    player = db.query(PlayerDB).filter(PlayerDB.id == metric.player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    
    db_metric = MetricDB(**metric.dict())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric

@app.get("/players/{player_id}/metrics", response_model=List[Metric])
def get_player_metrics(
    player_id: int,
    hours: int = Query(24, description="Horas hacia atrás para obtener métricas"),
    db: Session = Depends(get_db)
):
    """Obtener métricas de un jugador en un período específico"""
    # Verificar que el jugador existe
    player = db.query(PlayerDB).filter(PlayerDB.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    
    start_time = datetime.utcnow() - timedelta(hours=hours)
    
    metrics = db.query(MetricDB).filter(
        MetricDB.player_id == player_id,
        MetricDB.timestamp >= start_time
    ).order_by(MetricDB.timestamp.desc()).all()
    
    return metrics

@app.get("/players/{player_id}/metrics/latest", response_model=Metric)
def get_latest_metric(player_id: int, db: Session = Depends(get_db)):
    """Obtener la última métrica registrada de un jugador"""
    metric = db.query(MetricDB).filter(
        MetricDB.player_id == player_id
    ).order_by(MetricDB.timestamp.desc()).first()
    
    if not metric:
        raise HTTPException(status_code=404, detail="No se encontraron métricas para este jugador")
    
    return metric

# Endpoints de Analytics
@app.get("/players/{player_id}/analytics", response_model=AnalyticsResponse)
def get_player_analytics(
    player_id: int,
    hours: int = Query(8, description="Período de análisis en horas"),
    db: Session = Depends(get_db)
):
    """Obtener análisis completo de las métricas de un jugador"""
    # Verificar que el jugador existe
    player = db.query(PlayerDB).filter(PlayerDB.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    
    start_time = datetime.utcnow() - timedelta(hours=hours)
    
    metrics = db.query(MetricDB).filter(
        MetricDB.player_id == player_id,
        MetricDB.timestamp >= start_time
    ).all()
    
    if not metrics:
        raise HTTPException(status_code=404, detail="No hay métricas en el período especificado")
    
    # Cálculos estadísticos
    heart_rates = [m.heart_rate for m in metrics]
    oxygen_levels = [m.oxygen_saturation for m in metrics]
    
    avg_heart_rate = sum(heart_rates) / len(heart_rates)
    avg_oxygen = sum(oxygen_levels) / len(oxygen_levels)
    
    max_heart_rate = max(heart_rates)
    min_heart_rate = min(heart_rates)
    max_oxygen = max(oxygen_levels)
    min_oxygen = min(oxygen_levels)
    
    # Calcular HRV (Variabilidad del Ritmo Cardíaco)
    if len(heart_rates) > 1:
        hrv = statistics.stdev(heart_rates)
    else:
        hrv = 0
    
    # Determinar estado del jugador
    status = "normal"
    anomalies = []
    
    if max_heart_rate > 110 or min_oxygen < 95:
        status = "fatigue"
    if max_heart_rate > 120 or min_oxygen < 94:
        status = "risk"
    
    # Detectar anomalías
    if max_heart_rate > 110:
        anomalies.append(f"Pico de ritmo cardíaco elevado: {max_heart_rate} BPM")
    if min_oxygen < 95:
        anomalies.append(f"Oxigenación baja detectada: {min_oxygen}%")
    
    # Detectar cambios bruscos en HR
    for i in range(1, len(heart_rates)):
        change = abs(heart_rates[i] - heart_rates[i-1])
        if change > 20:
            anomalies.append(f"Cambio brusco en HR: {change} BPM")
            break
    
    # Calcular tendencias (últimas 4 lecturas vs primeras 4)
    recent_hr = heart_rates[-4:] if len(heart_rates) >= 4 else heart_rates
    recent_o2 = oxygen_levels[-4:] if len(oxygen_levels) >= 4 else oxygen_levels
    older_hr = heart_rates[:4] if len(heart_rates) >= 4 else heart_rates
    older_o2 = oxygen_levels[:4] if len(oxygen_levels) >= 4 else oxygen_levels
    
    trend_hr = (sum(recent_hr)/len(recent_hr) - sum(older_hr)/len(older_hr)) if older_hr else 0
    trend_o2 = (sum(recent_o2)/len(recent_o2) - sum(older_o2)/len(older_o2)) if older_o2 else 0
    
    return AnalyticsResponse(
        player_id=player_id,
        period=f"{hours}h",
        avg_heart_rate=round(avg_heart_rate, 1),
        avg_oxygen_saturation=round(avg_oxygen, 1),
        max_heart_rate=max_heart_rate,
        min_heart_rate=min_heart_rate,
        max_oxygen=max_oxygen,
        min_oxygen=min_oxygen,
        hrv=round(hrv, 1),
        status=status,
        anomalies=anomalies,
        trend_heart_rate=round(trend_hr, 1),
        trend_oxygen=round(trend_o2, 1)
    )

@app.get("/players/{player_id}/summary", response_model=PlayerMetrics)
def get_player_summary(player_id: int, db: Session = Depends(get_db)):
    """Obtener resumen completo del jugador con sus métricas"""
    player = db.query(PlayerDB).filter(PlayerDB.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    
    # Obtener métricas de las últimas 8 horas
    start_time = datetime.utcnow() - timedelta(hours=8)
    metrics = db.query(MetricDB).filter(
        MetricDB.player_id == player_id,
        MetricDB.timestamp >= start_time
    ).order_by(MetricDB.timestamp.asc()).all()
    
    if metrics:
        heart_rates = [m.heart_rate for m in metrics]
        oxygen_levels = [m.oxygen_saturation for m in metrics]
        
        avg_heart_rate = sum(heart_rates) / len(heart_rates)
        avg_oxygen_saturation = sum(oxygen_levels) / len(oxygen_levels)
        last_reading = metrics[-1]
    else:
        avg_heart_rate = 0
        avg_oxygen_saturation = 0
        last_reading = None
    
    return PlayerMetrics(
        player=player,
        metrics=metrics,
        avg_heart_rate=round(avg_heart_rate, 1),
        avg_oxygen_saturation=round(avg_oxygen_saturation, 1),
        last_reading=last_reading
    )

# Endpoints de Equipos y Estadísticas Globales
@app.get("/teams/{team_name}/stats", response_model=TeamStats)
def get_team_stats(team_name: str, db: Session = Depends(get_db)):
    """Obtener estadísticas de un equipo completo"""
    players = db.query(PlayerDB).filter(PlayerDB.team == team_name).all()
    
    if not players:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    team_heart_rates = []
    team_oxygen_levels = []
    players_status = {}
    
    for player in players:
        # Obtener métricas recientes de cada jugador
        start_time = datetime.utcnow() - timedelta(hours=4)
        metrics = db.query(MetricDB).filter(
            MetricDB.player_id == player.id,
            MetricDB.timestamp >= start_time
        ).all()
        
        if metrics:
            heart_rates = [m.heart_rate for m in metrics]
            oxygen_levels = [m.oxygen_saturation for m in metrics]
            
            avg_hr = sum(heart_rates) / len(heart_rates)
            avg_o2 = sum(oxygen_levels) / len(oxygen_levels)
            
            team_heart_rates.append(avg_hr)
            team_oxygen_levels.append(avg_o2)
            
            # Determinar estado individual
            max_hr = max(heart_rates)
            min_o2 = min(oxygen_levels)
            
            status = "normal"
            if max_hr > 110 or min_o2 < 95:
                status = "fatigue"
            if max_hr > 120 or min_o2 < 94:
                status = "risk"
                
            players_status[player.name] = status
    
    avg_team_hr = sum(team_heart_rates) / len(team_heart_rates) if team_heart_rates else 0
    avg_team_o2 = sum(team_oxygen_levels) / len(team_oxygen_levels) if team_oxygen_levels else 0
    
    return TeamStats(
        team=team_name,
        total_players=len(players),
        avg_team_heart_rate=round(avg_team_hr, 1),
        avg_team_oxygen=round(avg_team_o2, 1),
        players_status=players_status
    )

@app.get("/dashboard/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """Vista general del dashboard con estadísticas globales"""
    total_players = db.query(PlayerDB).count()
    teams = db.query(PlayerDB.team).distinct().all()
    total_teams = len(teams)
    
    # Obtener todas las métricas recientes (últimas 4 horas)
    start_time = datetime.utcnow() - timedelta(hours=4)
    recent_metrics = db.query(MetricDB).filter(MetricDB.timestamp >= start_time).all()
    
    if recent_metrics:
        heart_rates = [m.heart_rate for m in recent_metrics]
        oxygen_levels = [m.oxygen_saturation for m in recent_metrics]
        
        global_avg_hr = sum(heart_rates) / len(heart_rates)
        global_avg_o2 = sum(oxygen_levels) / len(oxygen_levels)
        
        # Jugadores en riesgo
        players_at_risk = 0
        players = db.query(PlayerDB).all()
        for player in players:
            player_metrics = db.query(MetricDB).filter(
                MetricDB.player_id == player.id,
                MetricDB.timestamp >= start_time
            ).all()
            
            if player_metrics:
                player_hr = [m.heart_rate for m in player_metrics]
                player_o2 = [m.oxygen_saturation for m in player_metrics]
                
                if max(player_hr) > 120 or min(player_o2) < 94:
                    players_at_risk += 1
    else:
        global_avg_hr = 0
        global_avg_o2 = 0
        players_at_risk = 0
    
    return {
        "total_players": total_players,
        "total_teams": total_teams,
        "global_avg_heart_rate": round(global_avg_hr, 1),
        "global_avg_oxygen": round(global_avg_o2, 1),
        "players_at_risk": players_at_risk,
        "last_updated": datetime.utcnow()
    }

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)