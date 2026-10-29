-- Una fila por comuna o corregimiento de Medellín, con su población proyectada 2020.

with

comunas as (
    select * from {{ ref('comunas') }}
),

poblacion as (
    select * from {{ ref('stg_medata__poblacion') }}
    where grupo_edad = 'Total'
),

final as (
    select
        comunas.codigo_comuna,
        comunas.nombre_comuna,
        comunas.tipo_territorio,
        poblacion.poblacion_total       as poblacion_2020,
        poblacion.poblacion_hombres     as poblacion_hombres_2020,
        poblacion.poblacion_mujeres     as poblacion_mujeres_2020
    from comunas
    left join poblacion
        on comunas.nombre_en_proyecciones = poblacion.nombre_territorio
)

select * from final
