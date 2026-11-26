-- Fase B · Clase "Marts para el tablero"
--
-- fct_delitos tiene ~521 mil filas: demasiado para mandarlo a un navegador.
-- Este mart pre-agrega lo que el tablero necesita (tendencia anual y mapa de
-- calor hora × día): ~20 mil filas. Regla: el trabajo pesado se hace en dbt,
-- el frontend solo filtra y dibuja.
--
-- A diferencia de agg_tasas_delitos_comuna, aquí SÍ entran los delitos sin
-- comuna: para contar cuántos hubo en la ciudad no importa dónde fueron.

with

delitos as (
    select * from {{ ref('fct_delitos') }}
),

final as (
    select
        anio,
        tipo_delito,
        isodow(fecha_hecho) as dia_semana_num,  -- 1 = lunes ... 7 = domingo (para ordenar)
        dia_semana,
        hora,
        sum(cantidad) as total_delitos
    from delitos
    group by all
)

select * from final
