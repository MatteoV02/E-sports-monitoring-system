from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime, timedelta
import random
import os

# SQLite para desarrollo
SQLALCHEMY_DATABASE_URL = "sqlite:///./esports_health.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Necesario para SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PlayerDB(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer)
    team = Column(String)
    country = Column(String)
    role = Column(String)
    
    metrics = relationship("MetricDB", back_populates="player", cascade="all, delete-orphan")

class MetricDB(Base):
    __tablename__ = "metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    heart_rate = Column(Integer)
    oxygen_saturation = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)
    player_id = Column(Integer, ForeignKey("players.id"))
    
    player = relationship("PlayerDB", back_populates="metrics")

# Crear tablas y datos de ejemplo
def init_db():
    try:
        # Crear todas las tablas
        Base.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        
        # Verificar si ya existen datos
        if db.query(PlayerDB).count() == 0:
            print("🌱 Insertando datos de ejemplo en SQLite...")
            
            # Crear jugadores de ejemplo
            players_data = [
                {"name": "Alex 'Phantom' Chen", "age": 22, "team": "Thunder Gaming", "country": "South Korea", "role": "Mid Laner"},
                {"name": "Maria 'Viper' Rodriguez", "age": 20, "team": "Eclipse Squad", "country": "Spain", "role": "ADC"},
                {"name": "Lucas 'Shadow' Silva", "age": 24, "team": "Phoenix Rising", "country": "Brazil", "role": "Jungle"},
                {"name": "Sarah 'Storm' Johnson", "age": 21, "team": "Thunder Gaming", "country": "USA", "role": "Support"},
                {"name": "Kenji 'Blade' Tanaka", "age": 23, "team": "Eclipse Squad", "country": "Japan", "role": "Top Laner"}
            ]
            
            players = []
            for player_data in players_data:
                player = PlayerDB(**player_data)
                players.append(player)
                db.add(player)
            
            db.commit()
            
            # Crear métricas de ejemplo para las últimas 8 horas
            for player in players:
                base_time = datetime.utcnow() - timedelta(hours=8)
                
                # Valores base según el rol (simulando diferentes patrones)
                if "Mid" in player.role:
                    base_hr = 70
                    base_o2 = 98
                elif "ADC" in player.role:
                    base_hr = 65
                    base_o2 = 99
                elif "Jungle" in player.role:
                    base_hr = 72
                    base_o2 = 97
                elif "Support" in player.role:
                    base_hr = 68
                    base_o2 = 98
                else:  # Top Laner
                    base_hr = 75
                    base_o2 = 96
                
                for i in range(32):  # 8 horas * 4 lecturas por hora
                    timestamp = base_time + timedelta(minutes=15 * i)
                    
                    # Simular variaciones realistas
                    hr_variation = random.randint(-15, 25)
                    o2_variation = random.randint(-3, 1)
                    
                    # Picos durante partidas (simulado)
                    if i % 6 == 0:  # Cada 1.5 horas
                        hr_variation += random.randint(10, 30)
                        o2_variation -= random.randint(1, 3)
                    
                    heart_rate = max(50, min(140, base_hr + hr_variation))
                    oxygen_saturation = max(90, min(100, base_o2 + o2_variation))
                    
                    metric = MetricDB(
                        heart_rate=heart_rate,
                        oxygen_saturation=oxygen_saturation,
                        timestamp=timestamp,
                        player_id=player.id
                    )
                    db.add(metric)
            
            db.commit()
            print("✅ Datos de ejemplo insertados correctamente en SQLite")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error al inicializar la base de datos: {e}")
        raise

# Dependencia de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()