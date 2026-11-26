-- Fase B · Clase "Marts para el tablero"
--
-- Grano: año × mes × tipo de delito × comuna (~23 mil filas).
-- Alimenta las comparaciones del tablero: mes a mes entre dos años, ranking
-- de comunas y evolución anual filtrada por comuna.
--
-- Los delitos SIN comuna se conservan (codigo_comuna NULL) para que el total
-- de la ciudad cuadre con fct_delitos; el tablero los excluye solo en las
-- vistas por comuna.

with

delitos as (
    select * from {{ ref('fct_delitos') }}
),

final as (
    select
        anio,
        mes,
        tipo_delito,
        codigo_comuna,
        sum(cantidad) as total_delitos
    from delitos
    group by all
)

select * from final
