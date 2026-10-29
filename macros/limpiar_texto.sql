{#
    Limpia una columna de texto de MEData:
    - repara escapes literales como '\xF1' que la fuente trae en lugar de 'ñ'
    - quita espacios sobrantes
    - convierte los marcadores de "sin información" (y el texto vacío) en NULL
#}

{% macro limpiar_texto(columna) %}
    {%- set escapes = {
        '\\xC1': 'Á', '\\xE1': 'á', '\\xE9': 'é', '\\xED': 'í',
        '\\xF1': 'ñ', '\\xF3': 'ó', '\\xFA': 'ú'
    } -%}
    {%- set nulos = ['sin dato', 'sin inf', 'sn', 'no georef'] -%}

    {#- namespace: una variable asignada dentro de un for no sobrevive al ciclo -#}
    {%- set ns = namespace(sql='trim(' ~ columna ~ ')') -%}
    {%- for escape, letra in escapes.items() -%}
        {%- set ns.sql = "replace(" ~ ns.sql ~ ", '" ~ escape ~ "', '" ~ letra ~ "')" -%}
    {%- endfor -%}

    case
        when lower(trim({{ columna }})) in ('{{ nulos | join("', '") }}') then null
        else nullif({{ ns.sql }}, '')
    end
{%- endmacro %}
