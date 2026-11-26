-- Fase B · el tablero suma agg_delitos_mes_comuna para mostrar totales de la
-- ciudad. Si el mart perdiera filas (p. ej. un join que bote los delitos sin
-- comuna), el tablero mostraría cifras falsas. Este test lo impide.
with mart as (select sum(total_delitos) as total from {{ ref('agg_delitos_mes_comuna') }}),
fct as (select sum(cantidad) as total from {{ ref('fct_delitos') }})
select * from mart, fct where mart.total <> fct.total
