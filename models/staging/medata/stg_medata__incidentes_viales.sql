-- Un registro por incidente vial reportado por la Secretaría de Movilidad (2014–2020).

with

origen as (
    select * from raw.incidentes_viales
),

limpios as (
    select
        nullif(trim(NRO_RADICADO), '')                         as numero_radicado,
        nullif(trim(EXPEDIENTE), '')                           as expediente,

        -- FECHA_ACCIDENTE está en hora local; FECHA_ACCIDENTES es la misma en UTC
        try_strptime(FECHA_ACCIDENTE, '%d/%m/%Y %H:%M:%S')     as fecha_hora_incidente,

        -- la fuente escribe la misma clase de 4 formas ("Caida Ocupante", "Caída de Ocupante", ...)
        case
            when CLASE_ACCIDENTE ilike 'ca%ocupante' then 'Caída de ocupante'
            else {{ limpiar_texto('CLASE_ACCIDENTE') }}
        end                                                    as clase_incidente,
        {{ limpiar_texto('GRAVEDAD_ACCIDENTE') }}              as gravedad,
        {{ limpiar_texto('"DISEÑO"') }}                        as diseno_via,
        {{ limpiar_texto('DIRECCION') }}                       as direccion,

        -- ubicación: CBML = código de barrio (4 dígitos, los 2 primeros son la comuna)
        case when regexp_full_match(CBML, '\d{4}') then CBML end as codigo_barrio,
        coalesce(
            case when regexp_full_match(CBML, '\d{4}') then left(CBML, 2)::integer end,
            nullif(try_cast(NUMCOMUNA as integer), 0)
        )                                                      as codigo_comuna,
        {{ limpiar_texto('BARRIO') }}                          as nombre_barrio,

        -- LOCATION viene como texto "[longitud, latitud]"
        try_cast(split_part(trim(LOCATION, '[]'), ',', 1) as double) as longitud,
        try_cast(split_part(trim(LOCATION, '[]'), ',', 2) as double) as latitud,

        _source_file,
        _loaded_at

    from origen
)

select * from limpios
