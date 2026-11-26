{#
    Módulo 5 · Clase "Doc blocks"

    Un doc block es un texto en Markdown con nombre:

        {% docs nombre %} ... {% enddocs %}

    Se usa desde cualquier YAML con:  description: '{{ doc("nombre") }}'

    Sirve para dos cosas:
      1. Textos largos (tablas, listas, advertencias) que no caben cómodos en YAML.
      2. No repetirse: codigo_comuna aparece en 6 modelos y se explica UNA vez aquí.
         Si la definición cambia, se corrige en un solo lugar.
#}


{% docs codigo_comuna %}
Código de la comuna o corregimiento de Medellín.

| Rango | Territorio |
|---|---|
| 1 – 16 | Comunas urbanas (1 = Popular … 16 = Belén) |
| 50 | Corregimiento San Sebastián de Palmitas |
| 60 | Corregimiento San Cristóbal |
| 70 | Corregimiento Altavista |
| 80 | Corregimiento San Antonio de Prado |
| 90 | Corregimiento Santa Elena |

NULL cuando la fuente no registró la ubicación. El nombre está en `dim_comunas`.
{% enddocs %}


{% docs gravedad %}
Gravedad del incidente vial según la Secretaría de Movilidad. Es excluyente:
cada incidente tiene un solo valor.

| Valor | Significado |
|---|---|
| Con heridos | Al menos una persona herida y ninguna muerta |
| Con muertos | Al menos una persona fallecida |
| Solo daños | Solo daños materiales |
{% enddocs %}


{% docs franja_horaria %}
Franja del día en que ocurrió el hecho, calculada a partir de la hora local:
Madrugada (00:00–05:59), Mañana (06:00–11:59), Tarde (12:00–17:59), Noche (18:00–23:59).
{% enddocs %}


{% docs tasa_por_100k %}
Delitos por cada 100 000 habitantes de la comuna: `total_delitos × 100 000 / poblacion_2020`.

**Limitaciones — leer antes de comparar comunas:**

- **Denominador fijo:** se usa la población proyectada **2020** para todos los años,
  así que las tasas de años lejanos a 2020 son aproximadas.
- **Población residente, no flotante:** comunas con poca gente viviendo y mucha de paso
  (La Candelaria, el centro) aparecen con tasas infladas. En 2022 La Candelaria tuvo
  ~12 000 hurtos a persona por 100 mil residentes, casi 3 veces Laureles.
{% enddocs %}


{% docs cobertura_delitos %}
Los registros van de 2003 a noviembre de 2023. El volumen de hurtos registrados crece
fuertemente desde 2015; parte de ese aumento puede deberse a cambios en el registro y la
denuncia, no solo a más delitos. Comparar años muy distantes con cautela.
{% enddocs %}


{% docs calidad_incidentes_viales %}
Problemas conocidos de la fuente, detectados por los tests del Módulo 4. **Ninguna fila se
descarta**: varios casos corresponden a incidentes con muertos.

| Problema | Filas | Tratamiento |
|---|---|---|
| Filas idénticas repetidas | 7 | Eliminadas en staging |
| Radicado con dos versiones distintas | 23 radicados | Se conservan; test `unique` en advertencia |
| Sin número de radicado (todos con muertos) | 5 | Se conservan; test `not_null` en advertencia |
| Hora registrada como "Sin Inf" (todos con muertos) | 6 | Se conserva la fecha; la hora queda NULL |
{% enddocs %}


{% docs freshness_medata %}
La freshness se mide con la fecha del **hecho más reciente** de cada archivo
(`max(fecha_hecho)`), no con la fecha en que nuestro script cargó los datos. Así responde
la pregunta que importa: *¿qué tan actual es la información que publica la Alcaldía?*
Avisa (warn) si el último hecho tiene más de 60 días; hoy los delitos llegan hasta
noviembre de 2023. Los incidentes viales (hasta agosto de 2020) y las proyecciones de
población son datasets históricos cerrados y no se miden.

La detección de archivos nuevos la hace aparte el workflow `revisar_medata.yml`, que compara
a diario el ETag de cada archivo con `ingest/estado_medata.json`.
{% enddocs %}
