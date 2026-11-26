"""Exporta a Parquet los marts que usa el tablero.

Fase B · Clase "Del warehouse al navegador"

¿Qué marts exporta? Los que declara la exposure `tablero_seguridad_medellin`
(models/marts/_exposures.yml). El script lee target/manifest.json, el archivo
donde dbt describe todo el proyecto, así que la lista vive en UN solo lugar:
si mañana el tablero necesita otro mart, se agrega a la exposure y listo.

Exporta del esquema del ÚLTIMO comando dbt que se ejecutó:
    dbt build                 -> dev_marts   (para probar en local)
    dbt build --target prod   -> prod_marts  (lo que hace el job de deploy)

Salida: web/public/data/<mart>.parquet + tablas.json (la lista para el frontend).
Parquet es un formato columnar y comprimido: el navegador descarga poco y
DuckDB-WASM lo lee directamente.

Uso:  python scripts/exportar_marts.py
"""

import json
from pathlib import Path

import duckdb

PROJECT_DIR = Path(__file__).resolve().parent.parent
MANIFEST = PROJECT_DIR / "target" / "manifest.json"
DB_PATH = PROJECT_DIR / "data" / "medellin.duckdb"
OUT_DIR = PROJECT_DIR / "web" / "public" / "data"
EXPOSURE = "exposure.medellin_seguridad.tablero_seguridad_medellin"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    nodos = manifest["exposures"][EXPOSURE]["depends_on"]["nodes"]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB_PATH), read_only=True)
    tablas = []
    for unique_id in nodos:
        nodo = manifest["nodes"][unique_id]
        relacion = f'{nodo["schema"]}.{nodo["alias"]}'
        destino = OUT_DIR / f'{nodo["name"]}.parquet'
        con.execute(f"copy (select * from {relacion}) to '{destino.as_posix()}' (format parquet)")
        filas = con.execute(f"select count(*) from {relacion}").fetchone()[0]
        print(f"  {relacion:45} -> {destino.name} ({filas:,} filas, {destino.stat().st_size / 1024:,.0f} KB)")
        tablas.append(nodo["name"])
    con.close()

    (OUT_DIR / "tablas.json").write_text(json.dumps(tablas, indent=2) + "\n", encoding="utf-8")
    print(f"\nListo: {len(tablas)} tablas en {OUT_DIR.relative_to(PROJECT_DIR)}")


if __name__ == "__main__":
    main()
