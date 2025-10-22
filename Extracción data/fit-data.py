from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import datetime
import json
import os

# Permisos necesarios
SCOPES = [
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.oxygen_saturation.read'
]

# Autenticación
flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
creds = flow.run_local_server(port=8080)

# Inicializar servicio
service = build('fitness', 'v1', credentials=creds)

# Rango de tiempo (último día)
end_time = int(datetime.datetime.now().timestamp() * 1e9)
start_time = int((datetime.datetime.now() - datetime.timedelta(days=1)).timestamp() * 1e9)
dataset = f"{start_time}-{end_time}"
print("\n🔍 Fuentes disponibles para oxígeno:\n")
sources = service.users().dataSources().list(userId="me").execute()

for src in sources.get("dataSource", []):
    if "oxygen" in src["dataType"]["name"].lower():
        print(json.dumps(src, indent=4))
# Función para obtener métricas
def get_metric_data(data_source_id):
    dataset_request = service.users().dataSources().datasets().get(
        userId="me", dataSourceId=data_source_id, datasetId=dataset
    ).execute()
    points = dataset_request.get('point', [])
    values = []
    for point in points:
        if 'value' in point and point['value']:
            value = point['value'][0].get('fpVal', None)
            if value is not None:
                values.append(value)
    return values

# Fuentes de datos
heart_rate_source = "derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm"
oxygen_source = "raw:com.google.oxygen_saturation:com.xiaomi.wearable:health_platform"

# Obtener valores
heart_values = get_metric_data(heart_rate_source)
oxygen_values = get_metric_data(oxygen_source)

# Promedio últimos 5
def last_five_avg(values):
    if not values:
        return None
    last_values = values[-5:] if len(values) >= 5 else values
    return sum(last_values) / len(last_values)

heart_avg = last_five_avg(heart_values)
oxygen_avg = last_five_avg(oxygen_values)

# Crear carpeta data si no existe
data_dir = os.path.join(os.getcwd(), "data")
os.makedirs(data_dir, exist_ok=True)

# Crear nombre único con timestamp (ej: fit_metrics_2025-10-21_23-30-15.json)
timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
output_filename = f"fit_metrics_{timestamp_str}.json"
output_path = os.path.join(data_dir, output_filename)

# Datos a guardar
data_entry = {
    "timestamp": datetime.datetime.now().isoformat(),
    "heart_rate_avg": heart_avg,
    "oxygen_saturation_avg": oxygen_avg
}

# Guardar nuevo archivo JSON
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(data_entry, f, indent=4, ensure_ascii=False)

# Mostrar resultados
print("Datos procesados correctamente:\n")
print(json.dumps(data_entry, indent=4, ensure_ascii=False))
print(f"\n Archivo creado: {output_path}")
