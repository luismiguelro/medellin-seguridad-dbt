-- Fase B · Clase "Marts para el tablero" (pestaña Seguridad vial)
--
-- Grano: año × gravedad × comuna × día de la semana × hora, para el mapa de
-- calor. Se excluyen los 6 incidentes sin hora registrada (hora NULL): no se
-- pueden ubicar en el mapa de calor, pero sí cuentan en los demás totales.

with

incidentes as (
    select * from {{ ref('fct_incidentes_viales') }}
),

final as (
    select
        anio,
        gravedad,
        codigo_comuna,
        isodow(fecha_incidente) as dia_semana_num,  -- 1 = lunes ... 7 = domingo
        hora,
        count(*) as total_incidentes
    from incidentes
    where hora is not null
    group by all
)

select * from final
