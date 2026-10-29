-- Una fila por hecho delictivo, con atributos de tiempo listos para analizar.

with

delitos as (
    select * from {{ ref('stg_medata__delitos') }}
),

final as (
    select
        tipo_delito,
        fecha_hora_hecho,
        cast(fecha_hora_hecho as date)      as fecha_hecho,
        year(fecha_hora_hecho)              as anio,
        month(fecha_hora_hecho)             as mes,
        hour(fecha_hora_hecho)              as hora,
        case isodow(fecha_hora_hecho)
            when 1 then 'Lunes'     when 2 then 'Martes'  when 3 then 'Miércoles'
            when 4 then 'Jueves'    when 5 then 'Viernes' when 6 then 'Sábado'
            when 7 then 'Domingo'
        end                                 as dia_semana,
        case
            when hour(fecha_hora_hecho) < 6  then 'Madrugada'
            when hour(fecha_hora_hecho) < 12 then 'Mañana'
            when hour(fecha_hora_hecho) < 18 then 'Tarde'
            else 'Noche'
        end                                 as franja_horaria,

        codigo_comuna,
        codigo_barrio,
        nombre_barrio,
        lugar,
        latitud,
        longitud,

        sexo_victima,
        edad_victima,
        estado_civil_victima,
        medio_transporte_victima,

        modalidad,
        arma_medio,
        bien_hurtado,
        categoria_bien,
        cantidad

    from delitos
)

select * from final
