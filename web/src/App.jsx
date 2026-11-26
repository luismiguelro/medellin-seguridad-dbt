// ---------------------------------------------------------------------------
// Fase B · Clase "Filtros y comparaciones"
//
// Cuatro filtros (delito, año, año de comparación, comuna) viven en el estado
// de React. Cada vez que uno cambia, useEffect lanza 4 consultas SQL a
// DuckDB-WASM sobre los marts y las gráficas se redibujan:
//
//   mensual  -> agg_delitos_mes_comuna  (mes a mes: año vs año de comparación)
//   anual    -> agg_delitos_mes_comuna  (evolución 2003–2023)
//   comunas  -> agg_delitos_mes_comuna + dim_comunas (ranking y tasas)
//   horario  -> agg_delitos_hora_dia    (mapa de calor hora × día)
//
// Comparación justa: 2023 solo llega hasta noviembre. Si se compara con ese
// año, TODOS los totales se cortan a enero–noviembre en ambos años.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { consultar } from './db.js'
import { GraficaAnual, GraficaComunas, GraficaHorario, GraficaMensual } from './graficas.jsx'
import { MESES, fmt } from './constantes.js'

const TIPOS = ['Todos', 'Hurto a persona', 'Hurto de moto', 'Hurto de carro', 'Hurto a residencia', 'Homicidio', 'Extorsión']

export default function App() {
  const [meta, setMeta] = useState(null)        // comunas, años disponibles, último mes con datos
  const [tipo, setTipo] = useState('Hurto a persona')
  const [anio, setAnio] = useState(null)
  const [comparar, setComparar] = useState(null)
  const [comuna, setComuna] = useState(null)    // null = toda la ciudad
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  // 1) Datos de referencia: se consultan una sola vez.
  useEffect(() => {
    Promise.all([
      consultar(`select codigo_comuna::int as codigo, nombre_comuna as nombre, poblacion_2020::int as poblacion
                 from dim_comunas order by codigo`),
      consultar(`select min(anio)::int as primero, max(anio)::int as ultimo,
                        max(mes) filter (where anio = (select max(anio) from agg_delitos_mes_comuna))::int as mes_max
                 from agg_delitos_mes_comuna`),
    ])
      .then(([comunas, [rango]]) => {
        setMeta({ comunas, ...rango })
        setAnio(rango.ultimo - 1)       // último año completo
        setComparar(rango.ultimo - 2)
      })
      .catch((e) => setError(e.message))
  }, [])

  // Si alguno de los dos años es el incompleto, ambos se cortan a ese mes.
  const mesLimite = meta && (anio === meta.ultimo || comparar === meta.ultimo) ? meta.mes_max : 12

  // 2) Datos de las gráficas: cada vez que cambia un filtro.
  useEffect(() => {
    if (!meta || anio == null) return
    // Los valores vienen de listas fijas (no de texto libre), así que es seguro armar el SQL.
    const fTipo = tipo === 'Todos' ? '' : `and tipo_delito = '${tipo}'`
    const fComuna = comuna == null ? '' : `and codigo_comuna = ${comuna}`
    Promise.all([
      consultar(`select anio::int as anio, mes::int as mes, sum(total_delitos)::int as total
                 from agg_delitos_mes_comuna
                 where anio in (${anio}, ${comparar}) ${fTipo} ${fComuna}
                 group by all`),
      consultar(`select anio::int as anio, sum(total_delitos)::int as total
                 from agg_delitos_mes_comuna
                 where true ${fTipo} ${fComuna}
                 group by anio order by anio`),
      consultar(`select codigo_comuna::int as codigo,
                        cast(coalesce(sum(total_delitos) filter (where anio = ${anio}), 0) as integer) as a,
                        cast(coalesce(sum(total_delitos) filter (where anio = ${comparar}), 0) as integer) as b
                 from agg_delitos_mes_comuna
                 where codigo_comuna is not null and mes <= ${mesLimite} ${fTipo}
                 group by 1`),
      consultar(`select dia_semana_num::int as dia, hora::int as hora, sum(total_delitos)::int as total
                 from agg_delitos_hora_dia
                 where anio = ${anio} ${fTipo} ${fComuna}
                 group by all`),
    ])
      .then(([mensual, anual, porComuna, horario]) => setDatos({ mensual, anual, porComuna, horario }))
      .catch((e) => setError(e.message))
  }, [meta, tipo, anio, comparar, comuna, mesLimite])

  const kpis = useMemo(() => {
    if (!datos || !meta) return null
    const total = (a) => datos.mensual.filter((f) => f.anio === a && f.mes <= mesLimite).reduce((s, f) => s + f.total, 0)
    const actual = total(anio)
    const antes = total(comparar)
    const poblacion = comuna == null
      ? meta.comunas.reduce((s, c) => s + c.poblacion, 0)
      : meta.comunas.find((c) => c.codigo === comuna).poblacion
    const meses = datos.mensual.filter((f) => f.anio === anio)
    const pico = meses.length ? meses.reduce((a, b) => (b.total > a.total ? b : a)) : null
    return {
      actual,
      cambio: antes ? ((actual - antes) / antes) * 100 : null,
      tasa: (actual * 100000) / poblacion,
      pico,
    }
  }, [datos, meta, anio, comparar, comuna, mesLimite])

  if (error) return <main><p className="error">No se pudieron cargar los datos: {error}</p></main>
  if (!meta || anio == null) return <main><p className="cargando">Cargando el motor de datos…</p></main>

  const anios = Array.from({ length: meta.ultimo - meta.primero + 1 }, (_, i) => meta.ultimo - i)
  const lugar = comuna == null ? 'Medellín' : meta.comunas.find((c) => c.codigo === comuna).nombre
  const periodo = mesLimite < 12 ? ` (ene–${MESES[mesLimite - 1].toLowerCase()})` : ''
  const delito = tipo === 'Todos' ? 'Delitos' : tipo

  return (
    <main>
      <header>
        <p className="eyebrow">Datos abiertos · Alcaldía de Medellín</p>
        <h1>{delito} en {lugar}</h1>
        <p className="lead">
          Hechos reportados a la Policía entre {meta.primero} y {MESES[meta.mes_max - 1].toLowerCase()} de {meta.ultimo}.
          Compara años, meses, comunas y horas del día.
        </p>
      </header>

      <div className="filtros">
        <Selector etiqueta="Delito" valor={tipo} onChange={setTipo} opciones={TIPOS.map((t) => [t, t === 'Todos' ? 'Todos los delitos' : t])} />
        <Selector etiqueta="Año" valor={anio} onChange={(v) => setAnio(Number(v))} opciones={anios.map((a) => [a, a])} />
        <Selector etiqueta="Comparar con" valor={comparar} onChange={(v) => setComparar(Number(v))} opciones={anios.filter((a) => a !== anio).map((a) => [a, a])} />
        <Selector
          etiqueta="Comuna"
          valor={comuna ?? ''}
          onChange={(v) => setComuna(v === '' ? null : Number(v))}
          opciones={[['', 'Toda la ciudad'], ...meta.comunas.map((c) => [c.codigo, c.nombre])]}
        />
      </div>

      {!datos ? <p className="cargando">Consultando…</p> : (
        <>
          <div className="kpis">
            <Kpi etiqueta={`Hechos en ${anio}${periodo}`} valor={fmt.format(kpis.actual)} />
            <Kpi
              etiqueta={`Cambio frente a ${comparar}`}
              valor={kpis.cambio == null ? '—' : `${kpis.cambio > 0 ? '+' : ''}${fmt.format(kpis.cambio)} %`}
              tono={kpis.cambio == null ? null : kpis.cambio > 0 ? 'sube' : 'baja'}
            />
            <Kpi etiqueta="Por cada 100 mil habitantes" valor={fmt.format(Math.round(kpis.tasa))} nota="Población proyectada 2020" />
            <Kpi etiqueta={`Mes con más hechos en ${anio}`} valor={kpis.pico ? MESES[kpis.pico.mes - 1] : '—'} nota={kpis.pico ? `${fmt.format(kpis.pico.total)} hechos` : null} />
          </div>
          {mesLimite < 12 && (
            <p className="aviso">{meta.ultimo} solo tiene datos hasta {MESES[meta.mes_max - 1].toLowerCase()}: para comparar de forma justa, los totales de ambos años cuentan de enero a {MESES[meta.mes_max - 1].toLowerCase()}.</p>
          )}

          <div className="rejilla">
            <Tarjeta titulo={`Mes a mes: ${anio} frente a ${comparar}`}>
              <GraficaMensual datos={datos.mensual} anio={anio} comparar={comparar} />
            </Tarjeta>
            <Tarjeta titulo={`Evolución ${meta.primero}–${meta.ultimo}`} nota={`El último tramo es punteado: ${meta.ultimo} está incompleto.`}>
              <GraficaAnual datos={datos.anual} anio={anio} comparar={comparar} />
            </Tarjeta>
          </div>

          <Tarjeta
            titulo={`Comunas en ${anio}${periodo} frente a ${comparar}`}
            nota="Haz clic en una comuna para filtrar todo el tablero. Ojo: el centro (La Candelaria) recibe a diario mucha más gente de la que vive allí, por eso su tasa por habitante sale tan alta."
          >
            <GraficaComunas datos={datos.porComuna} comunas={meta.comunas} anio={anio} comparar={comparar} seleccion={comuna}
              onSeleccion={(c) => setComuna(c === comuna ? null : c)} />
          </Tarjeta>

          <Tarjeta titulo={`¿Cuándo ocurren? Día y hora en ${anio}`} nota="Cada cuadro es una hora de un día de la semana; más oscuro = más hechos.">
            <GraficaHorario datos={datos.horario} />
          </Tarjeta>
        </>
      )}

      <footer>
        Fuente: <a href="https://medata.gov.co">MEData</a> (SISC / Policía Nacional). Procesado con dbt ·{' '}
        <a href="docs/">Documentación técnica</a> ·{' '}
        <a href="https://github.com/luismiguelro/medellin-seguridad-dbt">Código</a>
      </footer>
    </main>
  )
}

function Selector({ etiqueta, valor, onChange, opciones }) {
  return (
    <label className="selector">
      <span>{etiqueta}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)}>
        {opciones.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
      </select>
    </label>
  )
}

function Kpi({ etiqueta, valor, nota, tono }) {
  return (
    <div className="tarjeta kpi">
      <p className="kpi-etiqueta">{etiqueta}</p>
      <p className={`kpi-valor ${tono ?? ''}`}>{valor}</p>
      {nota && <p className="nota">{nota}</p>}
    </div>
  )
}

function Tarjeta({ titulo, nota, children }) {
  return (
    <section className="tarjeta">
      <h2>{titulo}</h2>
      {children}
      {nota && <p className="nota">{nota}</p>}
    </section>
  )
}
