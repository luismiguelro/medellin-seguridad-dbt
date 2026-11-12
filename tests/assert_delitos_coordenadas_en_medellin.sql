-- ---------------------------------------------------------------------------
-- Módulo 4 · Clase "Singular tests"
--
-- Regla: las coordenadas de un delito deben caer dentro de un rectángulo
-- aproximado que cubre Medellín y sus corregimientos.
--
-- Hoy hay ~195 hechos fuera del rectángulo (p. ej. latitud 3.85, que queda
-- cerca de Cali): son errores de georreferenciación en la fuente. No se borran
-- porque el delito sí ocurrió y tiene comuna; solo su punto en el mapa está mal.
-- Por eso este test es una advertencia (warn) con umbral, configurada con
-- config() dentro del propio archivo.
-- ---------------------------------------------------------------------------

{{ config(warn_if = '>0', error_if = '>500') }}

select
    tipo_delito,
    fecha_hora_hecho,
    codigo_comuna,
    latitud,
    longitud
from {{ ref('fct_delitos') }}
where latitud is not null
  and (
      latitud  not between 6.10 and 6.40
      or longitud not between -75.73 and -75.45
  )
