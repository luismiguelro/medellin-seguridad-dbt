-- Fase B · Clase "Marts para el tablero"
--
-- fct_delitos tiene ~521 mil filas: demasiado para mandarlo a un navegador.
-- Este mart pre-agrega lo que necesita el mapa de calor hora × día del
-- tablero, filtrable por comuna: ~120 mil filas. Regla: el trabajo pesado se hace en dbt,
-- el frontend solo filtra y dibuja.
--
-- Los delitos sin comuna se conservan (codigo_comuna NULL): cuentan en el
-- total de la ciudad aunque no se sepa dónde ocurrieron.

with

delitos as (
    select * from {{ ref('fct_delitos') }}
),

final as (
    select
        anio,
        tipo_delito,
        codigo_comuna,
        isodow(fecha_hecho) as dia_semana_num,  -- 1 = lunes ... 7 = domingo (para ordenar)
        dia_semana,
        hora,
        sum(cantidad) as total_delitos
    from delitos
    group by all
)

select * from final
