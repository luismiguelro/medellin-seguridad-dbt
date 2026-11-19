-- Módulo 4 · Clase "Singular tests" (ejercicio)
--
-- Regla: en cada comuna y año, heridos + muertos + solo daños debe ser igual al
-- total de incidentes. Si devuelve filas, el conteo por gravedad del modelo está mal.

select
    anio,
    nombre_comuna,
    total_incidentes,
    total_heridos,
    total_muertos,
    total_danios
from {{ ref('agg_incidentes_viales_comuna') }}
where total_heridos + total_muertos + total_danios != total_incidentes
