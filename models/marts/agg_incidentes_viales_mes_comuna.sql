-- Fase B · Clase "Marts para el tablero" (pestaña Seguridad vial)
--
-- Mismo diseño que agg_delitos_mes_comuna, para que el tablero reutilice las
-- mismas gráficas: grano año × mes × gravedad × comuna. Los incidentes sin
-- comuna se conservan (codigo_comuna NULL) para que el total cuadre.

with

incidentes as (
    select * from {{ ref('fct_incidentes_viales') }}
),

final as (
    select
        anio,
        mes,
        gravedad,
        codigo_comuna,
        count(*) as total_incidentes
    from incidentes
    group by all
)

select * from final
