"""Extract & Load: descarga los datasets de MEData (Alcaldía de Medellín) y los
carga sin transformar al esquema `raw` de DuckDB.

dbt se encarga de la "T" (transformación). Este script solo hace la "EL":
los datos quedan tal cual vienen de la fuente, más dos columnas de auditoría.

Uso:
    python ingest/extract_load.py            # descarga (si no existe) y carga todo
    python ingest/extract_load.py --refresh  # fuerza nueva descarga
"""

import argparse
import shutil
import urllib.request
from pathlib import Path

import duckdb

PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"
DB_PATH = PROJECT_DIR / "data" / "medellin.duckdb"

BASE_URL = "https://medata.app.medellin.gov.co/sites/default/files/distribution"

# tabla en raw -> ruta en MEData
DATASETS = {
    "hurto_a_persona": "1-027-23-000011/hurto_a_persona.csv",
    "hurto_de_moto": "1-027-23-000014/hurto_de_moto.csv",
    "hurto_de_carro": "1-027-23-000013/hurto_de_carro.csv",
    "hurto_a_residencia": "1-027-23-000012/hurto_a_residencia.csv",
    "homicidio": "1-027-23-000008/homicidio.csv",
    "extorsion": "1-027-23-000007/extorsion.csv",
    "incidentes_viales": "1-023-25-000094/incidentes_viales.csv",
    "proyecciones_poblacion_2020": "1-002-15-000059/proyecciones_de_poblacion_medellin_2020.csv",
}


def download(name: str, path: str, refresh: bool) -> Path:
    target = RAW_DIR / f"{name}.csv"
    if target.exists() and not refresh:
        print(f"  [cache] {target.name}")
        return target
    url = f"{BASE_URL}/{path}"
    print(f"  [get]   {url}")
    tmp = target.with_suffix(".part")
    with urllib.request.urlopen(url, timeout=300) as resp, open(tmp, "wb") as out:
        shutil.copyfileobj(resp, out)
    tmp.replace(target)
    return target


def load(con: duckdb.DuckDBPyConnection, name: str, csv_path: Path, source_path: str) -> None:
    # all_varchar: en raw no se interpretan tipos; el casteo es trabajo de staging.
    con.execute(
        f"""
        create or replace table raw.{name} as
        select
            *,
            '{source_path}' as _source_file,
            current_timestamp as _loaded_at
        from read_csv(?, all_varchar = true, header = true)
        """,
        [str(csv_path)],
    )
    rows = con.execute(f"select count(*) from raw.{name}").fetchone()[0]
    print(f"  [load]  raw.{name}: {rows:,} filas")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="vuelve a descargar los archivos")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB_PATH))
    con.execute("create schema if not exists raw")

    for name, path in DATASETS.items():
        print(name)
        csv_file = download(name, path, args.refresh)
        load(con, name, csv_file, path)

    con.close()
    print(f"\nListo: {DB_PATH}")


if __name__ == "__main__":
    main()
