-- Un registro por hecho delictivo reportado (SISC / Policía Nacional).
-- Los 6 datasets de MEData comparten el mismo esquema, así que se unen aquí
-- y se limpian una sola vez.

with

hurto_a_persona as (
    select 'Hurto a persona' as tipo_delito, * from raw.hurto_a_persona
),

hurto_de_moto as (
    select 'Hurto de moto' as tipo_delito, * from raw.hurto_de_moto
),

hurto_de_carro as (
    select 'Hurto de carro' as tipo_delito, * from raw.hurto_de_carro
),

hurto_a_residencia as (
    select 'Hurto a residencia' as tipo_delito, * from raw.hurto_a_residencia
),

homicidio as (
    select 'Homicidio' as tipo_delito, * from raw.homicidio
),

extorsion as (
    select 'Extorsión' as tipo_delito, * from raw.extorsion
),

unidos as (
    select * from hurto_a_persona
    union all by name
    select * from hurto_de_moto
    union all by name
    select * from hurto_de_carro
    union all by name
    select * from hurto_a_residencia
    union all by name
    select * from homicidio
    union all by name
    select * from extorsion
),

limpios as (
    select
        tipo_delito,

        -- la fuente trae hora local con offset -05:00; se conserva la hora local
        cast(left(fecha_hecho, 19) as timestamp)              as fecha_hora_hecho,
        cast(cantidad as double)::integer                      as cantidad,

        -- ubicación
        try_cast(codigo_comuna as integer)                     as codigo_comuna,
        nullif(replace(codigo_barrio, '#', ''), 'SIN DATO')    as codigo_barrio,
        {{ limpiar_texto('nombre_barrio') }}                   as nombre_barrio,
        {{ limpiar_texto('lugar') }}                           as lugar,
        nullif(lower(latitud), 'nan')::double                  as latitud,
        nullif(lower(longitud), 'nan')::double                 as longitud,

        -- víctima (edad -1 = sin dato en la fuente)
        {{ limpiar_texto('sexo') }}                            as sexo_victima,
        case
            when try_cast(edad as integer) between 0 and 110
                then try_cast(edad as integer)
        end                                                    as edad_victima,
        {{ limpiar_texto('estado_civil') }}                    as estado_civil_victima,
        {{ limpiar_texto('medio_transporte') }}                as medio_transporte_victima,

        -- hecho
        {{ limpiar_texto('modalidad') }}                       as modalidad,
        {{ limpiar_texto('arma_medio') }}                      as arma_medio,
        {{ limpiar_texto('bien') }}                            as bien_hurtado,
        {{ limpiar_texto('categoria_bien') }}                  as categoria_bien,

        -- auditoría
        _source_file,
        _loaded_at

    from unidos
)

select * from limpios
