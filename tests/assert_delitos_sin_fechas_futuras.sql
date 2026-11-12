-- ---------------------------------------------------------------------------
-- Módulo 4 · Clase "Singular tests"
--
-- Un test singular es un archivo .sql en la carpeta tests/ con un SELECT que
-- devuelve las filas que ROMPEN una regla. Misma lógica que un test genérico
-- (0 filas = pasa), pero para reglas propias del negocio que no caben en
-- unique / not_null / accepted_values / relationships.
--
-- Usa ref() igual que un modelo, así dbt sabe a qué modelo pertenece el test
-- y lo ejecuta después de construirlo.
--
-- Regla: ningún delito puede tener fecha posterior al momento de la carga.
-- ---------------------------------------------------------------------------

select
    tipo_delito,
    fecha_hora_hecho
from {{ ref('fct_delitos') }}
where fecha_hora_hecho > current_timestamp
