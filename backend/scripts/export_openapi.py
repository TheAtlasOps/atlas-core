import json
import os
import sys

# Agregar la raíz de backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app


def export_openapi(output_path: str = "openapi.json"):
    """Extrae la especificación viva de OpenAPI de FastAPI y la guarda en formato JSON."""
    openapi_schema = app.openapi()
    
    # Asegurar que el directorio de salida exista
    dir_name = os.path.dirname(output_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
        
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
        
    print(f"✅ Especificación OpenAPI exportada exitosamente a: {output_path}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "openapi.json"
    export_openapi(target)
