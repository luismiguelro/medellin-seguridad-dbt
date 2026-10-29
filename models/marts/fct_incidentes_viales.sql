-- Una fila por incidente vial, con atributos de tiempo y banderas de severidad.

with

incidentes as (
    select * from {{ ref('stg_medata__incidentes_viales') }}
),

final as (
    select
        numero_radicado,
        expediente,
        fecha_hora_incidente,
        cast(fecha_hora_incidente as date)          as fecha_incidente,
        year(fecha_hora_incidente)                  as anio,
        month(fecha_hora_incidente)                 as mes,
        hour(fecha_hora_incidente)                  as hora,

        clase_incidente,
        gravedad,
        gravedad = 'Con heridos'                    as tiene_heridos,
        gravedad = 'Con muertos'                    as tiene_muertos,
        diseno_via,
        direccion,

        codigo_comuna,
        codigo_barrio,
        nombre_barrio,
        latitud,
        longitud

    from incidentes
)

select * from final
