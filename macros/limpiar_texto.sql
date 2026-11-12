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
    {#- 'none': detectado por el test accepted_values de sexo_victima (Módulo 4) -#}
    {%- set nulos = ['sin dato', 'sin inf', 'sn', 'no georef', 'none'] -%}

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
