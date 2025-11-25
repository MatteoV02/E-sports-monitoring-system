from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import statistics
import boto3
import pandas as pd
import time
import os
from dotenv import load_dotenv

from database.db import get_db, init_db, PlayerDB, MetricDB
from models.models import Player, PlayerCreate, Metric, MetricCreate, PlayerMetrics, AnalyticsResponse, TeamStats

# Cargar variables de entorno
load_dotenv()

# Configuración AWS
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_OUTPUT_BUCKET = os.getenv("S3_OUTPUT_BUCKET", "bucket-datoso")
ATHENA_DATABASE = os.getenv("ATHENA_DATABASE", "healthcare-db")
ATHENA_TABLE = os.getenv("ATHENA_TABLE", "transformed_destination")
ATHENA_OUTPUT_LOCATION = f"s3://{S3_OUTPUT_BUCKET}/athena-results/"

# Clientes AWS
athena_client = None
s3_client = None

# Verificar si AWS está configurado
AWS_ENABLED = False
try:
    if os.getenv("AWS_ACCESS_KEY_ID"):
        athena_client = boto3.client('athena', region_name=AWS_REGION)
        s3_client = boto3.client('s3', region_name=AWS_REGION)
        AWS_ENABLED = True
        print("✓ AWS Athena habilitado")
except Exception as e:
    print(f"⚠ AWS no configurado: {e}")
    print("La API funcionará solo con base de datos local")

# Inicializar la aplicación FastAPI
app = FastAPI(
    title="E-Sports Health Monitoring API",
    description="API para monitoreo de métricas biométricas de jugadores profesionales",
    version="2.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar base de datos al iniciar
@app.on_event("startup")
def startup_event():
    init_db()
    print(f"API iniciada - AWS Athena: {'Habilitado' if AWS_ENABLED else 'Deshabilitado'}")

# ============================================================================
# FUNCIONES AUXILIARES PARA ATHENA
# ============================================================================

def execute_athena_query(query: str) -> pd.DataFrame:
    """Ejecuta una query en Athena y retorna los resultados como DataFrame"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    try:
        # Iniciar ejecución de query
        response = athena_client.start_query_execution(
            QueryString=query,
            QueryExecutionContext={'Database': ATHENA_DATABASE},
            ResultConfiguration={'OutputLocation': ATHENA_OUTPUT_LOCATION}
        )
        
        query_execution_id = response['QueryExecutionId']
        
        # Esperar a que la query termine
        max_attempts = 30
        attempt = 0
        while attempt < max_attempts:
            query_status = athena_client.get_query_execution(
                QueryExecutionId=query_execution_id
            )
            status = query_status['QueryExecution']['Status']['State']
            
            if status == 'SUCCEEDED':
                break
            elif status in ['FAILED', 'CANCELLED']:
                reason = query_status['QueryExecution']['Status'].get('StateChangeReason', 'Unknown')
                raise Exception(f"Query failed: {reason}")
            
            time.sleep(2)
            attempt += 1
        
        if attempt >= max_attempts:
            raise Exception("Query timeout")
        
        # Obtener resultados
        result = athena_client.get_query_results(QueryExecutionId=query_execution_id)
        
        # Convertir a DataFrame
        columns = [col['Label'] for col in result['ResultSet']['ResultSetMetadata']['ColumnInfo']]
        rows = []
        
        for row in result['ResultSet']['Rows'][1:]:  # Skip header
            rows.append([field.get('VarCharValue', None) for field in row['Data']])
        
        df = pd.DataFrame(rows, columns=columns)
        return df
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando query en Athena: {str(e)}")

# ============================================================================
# ENDPOINTS ORIGINALES (Base de datos local SQLite) - COMENTADOS
# ============================================================================

# Todos los endpoints de SQLite están comentados para usar solo AWS

# ============================================================================
# ENDPOINTS PARA AWS GLUE/ATHENA
# ============================================================================

@app.get("/")
def root():
    """Información de la API"""
    return {
        "message": "E-Sports Health Monitoring API",
        "version": "2.0.0",
        "aws_enabled": AWS_ENABLED,
        "endpoints": {
            "aws_status": "/aws/status",
            "aws_records": "/aws/records",
            "aws_stats": "/aws/stats",
            "aws_high_risk": "/aws/high-risk",
            "aws_analytics_overall": "/aws/analytics/overall",
            "aws_analytics_trends": "/aws/analytics/trends",
            "aws_records_latest": "/aws/records/latest",
            "aws_records_by_category": "/aws/records/by-category",
            "aws_records_hourly_stats": "/aws/records/hourly-stats",
            "aws_records_recent_hours": "/aws/records/recent-hours",
            "aws_date_range": "/aws/date-range",
            "aws_daily_summary": "/aws/daily-summary"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "aws_enabled": AWS_ENABLED
    }

@app.get("/aws/status")
def aws_status():
    """Verificar si AWS Athena está disponible"""
    return {
        "aws_enabled": AWS_ENABLED,
        "region": AWS_REGION if AWS_ENABLED else None,
        "database": ATHENA_DATABASE if AWS_ENABLED else None,
        "table": ATHENA_TABLE if AWS_ENABLED else None
    }

@app.get("/aws/records")
def get_aws_records(limit: int = Query(default=100, le=1000)):
    """Obtener registros desde AWS Athena (sin OFFSET)"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    query = f"""
    SELECT 
        timestamp_parsed as timestamp,
        heart_rate_avg,
        oxygen_saturation_avg,
        heart_rate_category,
        oxygen_category,
        date,
        hour,
        year,
        month,
        day
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    ORDER BY timestamp_parsed DESC
    LIMIT {limit}
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return df.to_dict('records')

@app.get("/aws/stats")
def get_aws_statistics():
    """Obtener estadísticas desde datos procesados en AWS"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    query = f"""
    SELECT 
        AVG(CAST(heart_rate_avg AS DOUBLE)) as avg_heart_rate,
        AVG(CAST(oxygen_saturation_avg AS DOUBLE)) as avg_oxygen,
        COUNT(*) as total_records,
        SUM(CASE WHEN heart_rate_category = 'High' THEN 1 ELSE 0 END) as high_heart_rate_count,
        SUM(CASE WHEN heart_rate_category = 'Low' THEN 1 ELSE 0 END) as low_heart_rate_count,
        SUM(CASE WHEN oxygen_category IN ('Concerning', 'Critical') THEN 1 ELSE 0 END) as low_oxygen_count
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        raise HTTPException(status_code=404, detail="No se encontraron datos en AWS")
    
    stats = df.iloc[0].to_dict()
    return {
        "avg_heart_rate": float(stats['avg_heart_rate']) if stats['avg_heart_rate'] else 0,
        "avg_oxygen": float(stats['avg_oxygen']) if stats['avg_oxygen'] else 0,
        "total_records": int(stats['total_records']),
        "high_heart_rate_count": int(stats['high_heart_rate_count']),
        "low_heart_rate_count": int(stats['low_heart_rate_count']),
        "low_oxygen_count": int(stats['low_oxygen_count'])
    }

@app.get("/aws/high-risk")
def get_aws_high_risk_records(limit: int = Query(default=50, le=500)):
    """Obtener registros de alto riesgo desde AWS"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    query = f"""
    SELECT 
        timestamp_parsed as timestamp,
        heart_rate_avg,
        oxygen_saturation_avg,
        heart_rate_category,
        oxygen_category,
        date,
        hour
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    WHERE heart_rate_category IN ('Low', 'High') 
       OR oxygen_category IN ('Concerning', 'Critical')
    ORDER BY timestamp_parsed DESC
    LIMIT {limit}
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return df.to_dict('records')

@app.get("/aws/date-range")
def get_aws_records_by_date(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    heart_rate_category: Optional[str] = Query(None),
    oxygen_category: Optional[str] = Query(None),
    limit: int = Query(default=100, le=1000)
):
    """Filtrar registros de AWS por fecha y categorías"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    where_clauses = []
    
    if start_date:
        where_clauses.append(f"date >= DATE '{start_date}'")
    if end_date:
        where_clauses.append(f"date <= DATE '{end_date}'")
    if heart_rate_category:
        where_clauses.append(f"heart_rate_category = '{heart_rate_category}'")
    if oxygen_category:
        where_clauses.append(f"oxygen_category = '{oxygen_category}'")
    
    where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
    
    query = f"""
    SELECT 
        timestamp_parsed as timestamp,
        heart_rate_avg,
        oxygen_saturation_avg,
        heart_rate_category,
        oxygen_category,
        date,
        hour
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    WHERE {where_clause}
    ORDER BY timestamp_parsed DESC
    LIMIT {limit}
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return df.to_dict('records')

@app.get("/aws/daily-summary")
def get_aws_daily_summary(target_date: str = Query(..., description="YYYY-MM-DD")):
    """Resumen por hora de un día específico desde AWS"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    query = f"""
    SELECT 
        hour,
        AVG(CAST(heart_rate_avg AS DOUBLE)) as avg_heart_rate,
        AVG(CAST(oxygen_saturation_avg AS DOUBLE)) as avg_oxygen,
        COUNT(*) as record_count,
        MIN(CAST(heart_rate_avg AS DOUBLE)) as min_heart_rate,
        MAX(CAST(heart_rate_avg AS DOUBLE)) as max_heart_rate,
        MIN(CAST(oxygen_saturation_avg AS DOUBLE)) as min_oxygen,
        MAX(CAST(oxygen_saturation_avg AS DOUBLE)) as max_oxygen
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    WHERE date = DATE '{target_date}'
    GROUP BY hour
    ORDER BY hour
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No hay datos para {target_date}")
    
    return {
        "date": target_date,
        "hourly_data": df.to_dict('records')
    }

@app.get("/aws/records/latest")
def get_aws_latest_records(limit: int = Query(default=50, le=500)):
    """Obtener los registros más recientes"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    query = f"""
    SELECT 
        timestamp_parsed as timestamp,
        heart_rate_avg,
        oxygen_saturation_avg,
        heart_rate_category,
        oxygen_category,
        date,
        hour
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    ORDER BY timestamp_parsed DESC
    LIMIT {limit}
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return df.to_dict('records')

@app.get("/aws/records/by-category")
def get_aws_records_by_category(
    heart_rate_category: Optional[str] = Query(None, description="Low, Normal, High"),
    oxygen_category: Optional[str] = Query(None, description="Normal, Concerning, Critical"),
    limit: int = Query(default=100, le=1000)
):
    """Obtener registros filtrados por categorías de salud"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    where_clauses = []
    
    if heart_rate_category:
        where_clauses.append(f"heart_rate_category = '{heart_rate_category}'")
    if oxygen_category:
        where_clauses.append(f"oxygen_category = '{oxygen_category}'")
    
    where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
    
    query = f"""
    SELECT 
        timestamp_parsed as timestamp,
        heart_rate_avg,
        oxygen_saturation_avg,
        heart_rate_category,
        oxygen_category,
        date,
        hour
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    WHERE {where_clause}
    ORDER BY timestamp_parsed DESC
    LIMIT {limit}
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return df.to_dict('records')

@app.get("/aws/records/hourly-stats")
def get_aws_hourly_stats(
    date_filter: Optional[str] = Query(None, description="YYYY-MM-DD"),
    limit_hours: int = Query(default=24, le=168)
):
    """Obtener estadísticas agrupadas por hora"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    where_clause = f"date = DATE '{date_filter}'" if date_filter else "1=1"
    
    query = f"""
    SELECT 
        date,
        hour,
        AVG(CAST(heart_rate_avg AS DOUBLE)) as avg_heart_rate,
        AVG(CAST(oxygen_saturation_avg AS DOUBLE)) as avg_oxygen,
        MIN(CAST(heart_rate_avg AS DOUBLE)) as min_heart_rate,
        MAX(CAST(heart_rate_avg AS DOUBLE)) as max_heart_rate,
        MIN(CAST(oxygen_saturation_avg AS DOUBLE)) as min_oxygen,
        MAX(CAST(oxygen_saturation_avg AS DOUBLE)) as max_oxygen,
        COUNT(*) as record_count
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    WHERE {where_clause}
    GROUP BY date, hour
    ORDER BY date DESC, hour DESC
    LIMIT {limit_hours}
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return df.to_dict('records')

@app.get("/aws/records/recent-hours")
def get_aws_recent_hours(hours: int = Query(default=24, le=168, description="Últimas X horas")):
    """Obtener todos los registros de las últimas X horas"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    # Calcular fecha/hora límite
    cutoff_time = (datetime.utcnow() - timedelta(hours=hours)).strftime('%Y-%m-%d %H:%M:%S')
    
    query = f"""
    SELECT 
        timestamp_parsed as timestamp,
        heart_rate_avg,
        oxygen_saturation_avg,
        heart_rate_category,
        oxygen_category,
        date,
        hour
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    WHERE timestamp_parsed >= TIMESTAMP '{cutoff_time}'
    ORDER BY timestamp_parsed DESC
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return df.to_dict('records')

@app.get("/aws/analytics/trends")
def get_aws_trends(days: int = Query(default=7, le=30, description="Días para análisis")):
    """Obtener tendencias de los últimos días"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    query = f"""
    SELECT 
        date,
        AVG(CAST(heart_rate_avg AS DOUBLE)) as avg_heart_rate,
        AVG(CAST(oxygen_saturation_avg AS DOUBLE)) as avg_oxygen,
        MIN(CAST(heart_rate_avg AS DOUBLE)) as min_heart_rate,
        MAX(CAST(heart_rate_avg AS DOUBLE)) as max_heart_rate,
        MIN(CAST(oxygen_saturation_avg AS DOUBLE)) as min_oxygen,
        MAX(CAST(oxygen_saturation_avg AS DOUBLE)) as max_oxygen,
        COUNT(*) as total_readings,
        SUM(CASE WHEN heart_rate_category = 'High' THEN 1 ELSE 0 END) as high_hr_count,
        SUM(CASE WHEN heart_rate_category = 'Low' THEN 1 ELSE 0 END) as low_hr_count,
        SUM(CASE WHEN oxygen_category = 'Critical' THEN 1 ELSE 0 END) as critical_o2_count,
        SUM(CASE WHEN oxygen_category = 'Concerning' THEN 1 ELSE 0 END) as concerning_o2_count
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    WHERE date >= DATE(current_date - INTERVAL '{days}' DAY)
    GROUP BY date
    ORDER BY date DESC
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        return []
    
    return {
        "period_days": days,
        "daily_trends": df.to_dict('records')
    }

@app.get("/aws/analytics/overall")
def get_aws_overall_analytics():
    """Obtener análisis general de todos los datos disponibles"""
    if not AWS_ENABLED:
        raise HTTPException(status_code=503, detail="AWS Athena no está configurado")
    
    query = f"""
    SELECT 
        COUNT(*) as total_records,
        AVG(CAST(heart_rate_avg AS DOUBLE)) as overall_avg_hr,
        AVG(CAST(oxygen_saturation_avg AS DOUBLE)) as overall_avg_o2,
        MIN(CAST(heart_rate_avg AS DOUBLE)) as min_hr_ever,
        MAX(CAST(heart_rate_avg AS DOUBLE)) as max_hr_ever,
        MIN(CAST(oxygen_saturation_avg AS DOUBLE)) as min_o2_ever,
        MAX(CAST(oxygen_saturation_avg AS DOUBLE)) as max_o2_ever,
        MIN(date) as first_record_date,
        MAX(date) as last_record_date,
        COUNT(DISTINCT date) as days_with_data,
        SUM(CASE WHEN heart_rate_category = 'High' THEN 1 ELSE 0 END) as total_high_hr,
        SUM(CASE WHEN heart_rate_category = 'Low' THEN 1 ELSE 0 END) as total_low_hr,
        SUM(CASE WHEN heart_rate_category = 'Normal' THEN 1 ELSE 0 END) as total_normal_hr,
        SUM(CASE WHEN oxygen_category = 'Critical' THEN 1 ELSE 0 END) as total_critical_o2,
        SUM(CASE WHEN oxygen_category = 'Concerning' THEN 1 ELSE 0 END) as total_concerning_o2,
        SUM(CASE WHEN oxygen_category = 'Normal' THEN 1 ELSE 0 END) as total_normal_o2
    FROM "{ATHENA_DATABASE}"."{ATHENA_TABLE}"
    """
    
    df = execute_athena_query(query)
    
    if df.empty:
        raise HTTPException(status_code=404, detail="No hay datos disponibles")
    
    result = df.iloc[0].to_dict()
    
    # Calcular porcentajes
    total = float(result['total_records']) if result['total_records'] else 0
    if total > 0:
        result['pct_high_hr'] = round((float(result['total_high_hr'] or 0) / total) * 100, 2)
        result['pct_low_hr'] = round((float(result['total_low_hr'] or 0) / total) * 100, 2)
        result['pct_normal_hr'] = round((float(result['total_normal_hr'] or 0) / total) * 100, 2)
        result['pct_critical_o2'] = round((float(result['total_critical_o2'] or 0) / total) * 100, 2)
        result['pct_concerning_o2'] = round((float(result['total_concerning_o2'] or 0) / total) * 100, 2)
        result['pct_normal_o2'] = round((float(result['total_normal_o2'] or 0) / total) * 100, 2)
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)