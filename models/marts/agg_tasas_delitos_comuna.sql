-- Delitos por comuna, año y tipo, con tasa por cada 100 mil habitantes.
-- Nota: el denominador es la población proyectada 2020 para todos los años,
-- así que las tasas de años lejanos a 2020 son aproximadas.

with

delitos as (
    select * from {{ ref('int_delitos_comuna_anio') }}
),

comunas as (
    select * from {{ ref('dim_comunas') }}
),

final as (
    select
        delitos.anio,
        delitos.tipo_delito,
        delitos.codigo_comuna,
        comunas.nombre_comuna,
        comunas.tipo_territorio,
        delitos.total_delitos,
        comunas.poblacion_2020,
        round(delitos.total_delitos * 100000.0 / comunas.poblacion_2020, 1)
                                                    as tasa_por_100k_habitantes
    from delitos
    inner join comunas
        on delitos.codigo_comuna = comunas.codigo_comuna
)

select * from final
