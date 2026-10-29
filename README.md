# Seguridad en Medellín — proyecto dbt

Pipeline analítico sobre **datos abiertos de seguridad ciudadana y seguridad vial de Medellín**
(MEData, Alcaldía de Medellín), construido con **dbt + DuckDB** siguiendo las prácticas del curso
*dbt Fundamentals* de dbt Labs.

## Preguntas de negocio

- ¿Cómo ha evolucionado cada delito (hurtos, homicidios, extorsión) entre 2003 y 2023?
- ¿Qué comunas y barrios concentran más hechos, en número absoluto y **por cada 100 mil habitantes**?
- ¿A qué horas y días ocurren los hurtos? ¿Con qué modalidad y arma?
- ¿Dónde se concentran los incidentes viales con heridos o muertos?

## Fuentes

| Tabla `raw` | Dataset MEData | Filas |
|---|---|---|
| `hurto_a_persona` | Hurto a persona | 326 489 |
| `hurto_de_moto` | Hurto de moto | 86 410 |
| `hurto_de_carro` | Hurto de carro | 39 571 |
| `hurto_a_residencia` | Hurto a residencia | 42 673 |
| `homicidio` | Homicidio | 19 647 |
| `extorsion` | Extorsión | 6 540 |
| `incidentes_viales` | Incidentes viales (2014–2020) | 270 765 |
| `proyecciones_poblacion_2020` | Proyecciones de población por comuna | 432 |

Los delitos provienen del SISC / Policía Nacional y comparten el mismo esquema (un registro por hecho,
con coordenadas, barrio y comuna). El dataset "Hurto a personas en transporte público" no se carga
porque es un subconjunto exacto de "Hurto a persona".

## Arquitectura

```
MEData (CSV) ──► ingest/extract_load.py ──► DuckDB: raw.*
                                               │
                                     dbt  ┌────┴─────┐
                                          ▼          ▼
                                      staging   (limpieza, tipos)
                                          ▼
                                     intermediate (uniones, lógica)
                                          ▼
                                        marts  (hechos y dimensiones)
```

## Cómo ejecutarlo

```bash
python -m venv .venv
.venv/Scripts/activate          # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt

python ingest/extract_load.py   # descarga ~280 MB y carga raw.* en data/medellin.duckdb
dbt debug                       # usa el profiles.yml del proyecto
dbt build
```

## Estado

- [x] Módulo 1 — Setup del proyecto y carga de datos crudos
- [ ] Módulo 2 — Models (staging, marts, `ref`)
- [ ] Módulo 3 — Sources (`source`, freshness)
- [ ] Módulo 4 — Tests (genéricos y singulares)
- [ ] Módulo 5 — Documentación (`dbt docs`)
- [ ] Módulo 6 — Deployment (CI con GitHub Actions)
