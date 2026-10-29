-- Cantidad de delitos por comuna, año y tipo de delito.
-- Base reutilizable para cualquier análisis por territorio.

with

delitos as (
    select * from {{ ref('stg_medata__delitos') }}
),

agregados as (
    select
        codigo_comuna,
        year(fecha_hora_hecho)      as anio,
        tipo_delito,
        sum(cantidad)               as total_delitos
    from delitos
    where codigo_comuna is not null
    group by 1, 2, 3
)

select * from agregados
