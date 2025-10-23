from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PlayerBase(BaseModel):
    name: str
    age: int
    team: str
    country: str
    role: str

class PlayerCreate(PlayerBase):
    pass

class Player(PlayerBase):
    id: int
    
    class Config:
        from_attributes = True

class MetricBase(BaseModel):
    heart_rate: int = Field(..., ge=40, le=200, description="Ritmo cardíaco en BPM")
    oxygen_saturation: int = Field(..., ge=80, le=100, description="Saturación de oxígeno en %")
    player_id: int

class MetricCreate(MetricBase):
    pass

class Metric(MetricBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class PlayerMetrics(BaseModel):
    player: Player
    metrics: List[Metric]
    avg_heart_rate: float
    avg_oxygen_saturation: float
    last_reading: Optional[Metric] = None

class AnalyticsResponse(BaseModel):
    player_id: int
    period: str
    avg_heart_rate: float
    avg_oxygen_saturation: float
    max_heart_rate: int
    min_heart_rate: int
    max_oxygen: int
    min_oxygen: int
    hrv: float  # Variabilidad del ritmo cardíaco
    status: str  # normal, fatigue, risk
    anomalies: List[str]
    trend_heart_rate: float
    trend_oxygen: float

class TeamStats(BaseModel):
    team: str
    total_players: int
    avg_team_heart_rate: float
    avg_team_oxygen: float
    players_status: dict