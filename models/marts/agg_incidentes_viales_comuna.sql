-- Incidentes viales por comuna y año, según su gravedad.
with

incidentes_viales as (
    select * from {{ ref('fct_incidentes_viales') }}
),

comunas as (
    select * from {{ ref('dim_comunas') }}
),

final as (
    select
        incidentes_viales.anio,
        comunas.nombre_comuna,
        count(*) as total_incidentes,
        count(*) filter(where incidentes_viales.tiene_heridos=true) as total_heridos,
        count(*) filter(where incidentes_viales.tiene_muertos=true) as total_muertos,
        count(*) filter(where incidentes_viales.gravedad = 'Solo daños') as total_danios
    from incidentes_viales
    inner join comunas
        on incidentes_viales.codigo_comuna = comunas.codigo_comuna
    group  by  incidentes_viales.anio,comunas.nombre_comuna
)

select *  from final
