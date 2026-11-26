"""Revisa si MEData cambió alguno de los archivos SIN descargarlos.

Fase A · Clase "Detección de cambios"

MEData no avisa cuando publica (no tiene webhooks), así que le preguntamos
a diario. Para cada archivo se hace una petición HEAD, que devuelve solo los
encabezados HTTP y no el contenido (unos cientos de bytes en vez de 260 MB):

    etag:          "6ad10314-76b7482"   <- huella de la versión del archivo
    last-modified: Thu, 15 Oct 2026 ... <- cuándo se escribió en el servidor

Si el ETag de algún archivo es distinto al guardado en estado_medata.json,
algo cambió y hay que reconstruir prod. Ojo: last-modified NO es la fecha de
publicación de datos nuevos; los 8 archivos tienen la misma fecha porque la
Alcaldía los recopió a su servidor. Por eso solo se usa como dato informativo.

Uso:
    python ingest/revisar_cambios.py            # compara y actualiza el estado
    python ingest/revisar_cambios.py --dry-run  # solo compara

Dentro de GitHub Actions escribe `hay_cambios=true|false` en $GITHUB_OUTPUT
para que el workflow decida si dispara el deploy.
"""

import argparse
import json
import os
import urllib.request
from pathlib import Path

from extract_load import BASE_URL, DATASETS

STATE_PATH = Path(__file__).resolve().parent / "estado_medata.json"


def consultar_encabezados(path: str) -> dict:
    req = urllib.request.Request(f"{BASE_URL}/{path}", method="HEAD")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return {
            "etag": resp.headers.get("ETag"),
            "last_modified": resp.headers.get("Last-Modified"),
            "bytes": int(resp.headers.get("Content-Length") or 0),
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="no actualiza estado_medata.json")
    args = parser.parse_args()

    anterior = json.loads(STATE_PATH.read_text(encoding="utf-8")) if STATE_PATH.exists() else {}
    actual = {name: consultar_encabezados(path) for name, path in DATASETS.items()}

    cambios = [name for name in actual if anterior.get(name, {}).get("etag") != actual[name]["etag"]]
    for name in actual:
        marca = "CAMBIÓ" if name in cambios else "igual"
        print(f"  [{marca:6}] {name}: {actual[name]['etag']} ({actual[name]['last_modified']})")

    hay_cambios = bool(cambios)
    print(f"\nArchivos con cambios: {len(cambios)}")

    if hay_cambios and not args.dry_run:
        STATE_PATH.write_text(json.dumps(actual, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Estado actualizado: {STATE_PATH.name}")

    if "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
            out.write(f"hay_cambios={'true' if hay_cambios else 'false'}\n")


if __name__ == "__main__":
    main()
