-- Proyección de población 2020 por comuna/corregimiento y grupo de edad (DANE / Alcaldía).
-- Se descartan las filas de subtotales ("Suma Comunas", "Total Medellín").

with

origen as (
    select * from raw.proyecciones_poblacion_2020
),

limpios as (
    select
        trim(codigo)                         as nombre_territorio,
        trim(tipo_division_geografica)       as tipo_territorio,
        trim(grupo_edad)                     as grupo_edad,
        2020                                 as anio,
        cast(total_2020 as integer)          as poblacion_total,
        cast(hombres_2020 as integer)        as poblacion_hombres,
        cast(mujeres_2020 as integer)        as poblacion_mujeres,

        _source_file,
        _loaded_at

    from origen
    where trim(tipo_division_geografica) in ('Comuna', 'Corregimiento')
      and trim(codigo) not like 'Suma %'
)

select * from limpios
