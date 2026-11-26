"""Descarga los límites oficiales de comunas y corregimientos para el mapa del tablero.

Fase B · Clase "El mapa"

Fuente: capa "comunas_y_corregimientos" publicada por la Alcaldía de Medellín
(organización AMED en ArcGIS Online). Se pide en GeoJSON, en coordenadas
latitud/longitud (outSR=4326) y simplificada (maxAllowableOffset) para que
el archivo pese ~45 KB y no varios MB.

Solo se guarda `codigo_comuna`: los nombres salen de dim_comunas, así hay una
sola fuente de verdad para los nombres (el seed comunas.csv).

Los límites casi nunca cambian, por eso el archivo se versiona en el repo
(web/public/geo/) y este script solo se corre a mano si hace falta.

Uso:  python scripts/descargar_mapa_comunas.py
"""

import json
import urllib.parse
import urllib.request
from pathlib import Path

CAPA = "https://services1.arcgis.com/FZVaYraI7sEGQ6rF/arcgis/rest/services/comunas_y_corregimientos/FeatureServer/0/query"
PARAMS = {
    "where": "1=1",
    "outFields": "codigo",
    "outSR": "4326",
    "maxAllowableOffset": "0.0003",   # ~30 m: suficiente para un mapa de ciudad
    "geometryPrecision": "5",
    "f": "geojson",
}
DESTINO = Path(__file__).resolve().parent.parent / "web" / "public" / "geo" / "comunas.geojson"


def main() -> None:
    with urllib.request.urlopen(f"{CAPA}?{urllib.parse.urlencode(PARAMS)}", timeout=60) as resp:
        geo = json.load(resp)

    # La capa trae 2 polígonos sin código ("SN01", "SN02"): no son comuna ni corregimiento.
    features = []
    for f in geo["features"]:
        codigo = f["properties"]["codigo"]
        if codigo.isdigit():
            features.append({"type": "Feature", "properties": {"codigo_comuna": int(codigo)}, "geometry": f["geometry"]})

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")), encoding="utf-8")
    print(f"{len(features)} comunas/corregimientos -> {DESTINO.relative_to(DESTINO.parents[3])} ({DESTINO.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
