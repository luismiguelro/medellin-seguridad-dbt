-- Fase B · igual que con los delitos: el total de la pestaña vial debe
-- cuadrar exactamente con fct_incidentes_viales.
with mart as (select sum(total_incidentes) as total from {{ ref('agg_incidentes_viales_mes_comuna') }}),
fct as (select count(*) as total from {{ ref('fct_incidentes_viales') }})
select * from mart, fct where mart.total <> fct.total
