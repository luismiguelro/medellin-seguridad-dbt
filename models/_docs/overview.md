{#
    Módulo 5 · Clase "Doc blocks"

    El bloque especial __overview__ reemplaza la página de inicio del sitio
    que genera `dbt docs generate`. Es lo primero que ve quien abre la
    documentación: conviene que explique el proyecto en un minuto.
#}

{% docs __overview__ %}

# Seguridad en Medellín

Pipeline analítico sobre **datos abiertos de seguridad ciudadana y seguridad vial de Medellín**,
publicados por la Alcaldía en [MEData](https://medata.gov.co), construido con dbt + DuckDB.

## Preguntas que responde

- ¿Cómo evolucionó cada delito (hurtos, homicidios, extorsión) entre 2003 y 2023?
- ¿Qué comunas concentran más hechos, en número absoluto y **por cada 100 mil habitantes**?
- ¿A qué horas, días y con qué modalidad ocurren los hurtos?
- ¿Dónde se concentran los incidentes viales con heridos o muertos?

## Capas

| Capa | Prefijo | Qué hace |
|---|---|---|
| Fuentes | `source('medata', ...)` | CSV de MEData cargados sin transformar al esquema `raw` |
| Staging | `stg_medata__` | Limpieza: tipos, textos, nulos; una fuente por modelo |
| Intermediate | `int_` | Agregaciones reutilizables |
| Marts | `dim_`, `fct_`, `agg_` | Tablas listas para análisis y BI |

## Antes de usar los datos

Lee las limitaciones en las descripciones de `agg_tasas_delitos_comuna`,
`fct_incidentes_viales` y de la fuente `medata`: la población usada en las tasas,
los problemas conocidos de la fuente y lo que mide (y no mide) la freshness.

Usa la pestaña **Lineage** (o el botón del grafo) para ver cómo fluye cada tabla
desde la fuente hasta los marts.

{% enddocs %}
