// ---------------------------------------------------------------------------
// Fase B · Clase "Filtros y comparaciones"
//
// Cuatro filtros (categoría, año, año de comparación, comuna) viven en el
// estado de React. Cada vez que uno cambia, useEffect lanza 4 consultas SQL a
// DuckDB-WASM y las gráficas se redibujan:
//
//   mensual  -> tablaMes   (mes a mes: año vs año de comparación)
//   anual    -> tablaMes   (evolución de toda la serie)
//   comunas  -> tablaMes + dim_comunas (mapa, ranking y tasas)
//   horario  -> tablaHora  (mapa de calor hora × día)
//
// Comparación justa: hay años incompletos (2023 en delitos llega a noviembre;
// en vial, 2014 empieza en julio y 2020 termina en agosto). Los totales que
// se comparan usan solo los meses que tienen datos en AMBOS años.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { consultar } from './db.js'
import { MESES, fmt } from './constantes.js'
import { GraficaAnual, GraficaComunas, GraficaHorario, GraficaMensual, MapaComunas } from './graficas.jsx'

export function Tablero({ config: c, comunas }) {
  const [mesesPorAnio, setMesesPorAnio] = useState(null)   // { 2014: [7,8,...,12], 2015: [1..12], ... }
  const [categoria, setCategoria] = useState(c.porDefecto)  // null = todas
  const [anio, setAnio] = useState(null)
  const [comparar, setComparar] = useState(null)
  const [comuna, setComuna] = useState(null)                // null = toda la ciudad
  const [medida, setMedida] = useState('tasa')              // 'tasa' por 100 mil hab. o 'total'
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  // 1) Qué meses tiene cada año: define el rango y los años incompletos.
  useEffect(() => {
    consultar(`select anio::int as anio, mes::int as mes from ${c.tablaMes} group by all order by 1, 2`)
      .then((filas) => {
        const m = {}
        filas.forEach((f) => (m[f.anio] ??= []).push(f.mes))
        const completos = Object.keys(m).map(Number).filter((a) => m[a].length === 12)
        setMesesPorAnio(m)
        setAnio(Math.max(...completos))                       // último año completo
        setComparar(Math.max(...completos.filter((a) => a !== Math.max(...completos))))
      })
      .catch((e) => setError(e.message))
  }, [c])

  const anios = mesesPorAnio ? Object.keys(mesesPorAnio).map(Number).sort((a, b) => b - a) : []
  const parciales = anios.filter((a) => mesesPorAnio[a].length < 12)
  // Meses presentes en los dos años que se comparan.
  const meses = mesesPorAnio && anio != null
    ? mesesPorAnio[anio].filter((m) => mesesPorAnio[comparar]?.includes(m))
    : []

  // 2) Datos de las gráficas: cada vez que cambia un filtro.
  useEffect(() => {
    if (!mesesPorAnio || anio == null) return
    // Los valores vienen de listas fijas (no de texto libre), así que es seguro armar el SQL.
    const fCat = categoria ? `and ${c.colCategoria} = '${categoria}'` : ''
    const fComuna = comuna == null ? '' : `and codigo_comuna = ${comuna}`
    const fMeses = `and mes in (${meses.join(',') || 0})`
    setDatos(null)
    Promise.all([
      consultar(`select anio::int as anio, mes::int as mes, sum(${c.colTotal})::int as total
                 from ${c.tablaMes}
                 where anio in (${anio}, ${comparar}) ${fCat} ${fComuna}
                 group by all`),
      consultar(`select anio::int as anio, sum(${c.colTotal})::int as total
                 from ${c.tablaMes}
                 where true ${fCat} ${fComuna}
                 group by anio order by anio`),
      consultar(`select codigo_comuna::int as codigo,
                        cast(coalesce(sum(${c.colTotal}) filter (where anio = ${anio}), 0) as integer) as a,
                        cast(coalesce(sum(${c.colTotal}) filter (where anio = ${comparar}), 0) as integer) as b
                 from ${c.tablaMes}
                 where codigo_comuna is not null ${fMeses} ${fCat}
                 group by 1`),
      consultar(`select dia_semana_num::int as dia, hora::int as hora, sum(${c.colTotal})::int as total
                 from ${c.tablaHora}
                 where anio = ${anio} ${fCat} ${fComuna}
                 group by all`),
    ])
      .then(([mensual, anual, porComuna, horario]) => setDatos({ mensual, anual, porComuna, horario }))
      .catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, mesesPorAnio, categoria, anio, comparar, comuna, meses.join(',')])

  const kpis = useMemo(() => {
    if (!datos) return null
    const total = (a) => datos.mensual.filter((f) => f.anio === a && meses.includes(f.mes)).reduce((s, f) => s + f.total, 0)
    const actual = total(anio)
    const antes = total(comparar)
    const poblacion = comuna == null
      ? comunas.reduce((s, x) => s + x.poblacion, 0)
      : comunas.find((x) => x.codigo === comuna).poblacion
    const delAnio = datos.mensual.filter((f) => f.anio === anio)
    const pico = delAnio.length ? delAnio.reduce((a, b) => (b.total > a.total ? b : a)) : null
    return { actual, cambio: antes ? ((actual - antes) / antes) * 100 : null, tasa: (actual * 100000) / poblacion, pico }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos])

  if (error) return <p className="error">No se pudieron cargar los datos: {error}</p>
  if (anio == null) return <p className="cargando">Cargando…</p>

  const mes = (m) => MESES[m - 1].toLowerCase()
  const primero = anios.at(-1)
  const ultimo = anios[0]
  const lugar = comuna == null ? 'Medellín' : comunas.find((x) => x.codigo === comuna).nombre
  const periodo = meses.length < 12 ? ` (${mes(meses[0])}–${mes(meses.at(-1))})` : ''
  const propsComunas = datos && {
    datos: datos.porComuna, comunas, medida, anio, comparar, seleccion: comuna,
    onSeleccion: (x) => setComuna(x === comuna ? null : x),   // segundo clic = quitar filtro
  }

  return (
    <>
      <header>
        <h1>{c.titulo(categoria, lugar)}</h1>
        <p className="lead">
          {c.fuente} entre {mes(mesesPorAnio[primero][0])} de {primero} y {mes(mesesPorAnio[ultimo].at(-1))} de {ultimo}.
          Compara años, meses, comunas y horas del día.
        </p>
      </header>

      <div className="filtros">
        <Selector etiqueta={c.etiquetaCategoria} valor={categoria ?? ''} onChange={(v) => setCategoria(v || null)}
          opciones={[['', c.todas], ...c.categorias.map((x) => [x, x])]} />
        <Selector etiqueta="Año" valor={anio} opciones={anios.map((a) => [a, a])} onChange={(v) => {
          const nuevo = Number(v)
          // Si eligen como año el mismo de la comparación, la comparación pasa al año anterior.
          if (nuevo === comparar) setComparar(anios.find((a) => a < nuevo) ?? anios.find((a) => a !== nuevo))
          setAnio(nuevo)
        }} />
        <Selector etiqueta="Comparar con" valor={comparar} onChange={(v) => setComparar(Number(v))}
          opciones={anios.filter((a) => a !== anio).map((a) => [a, a])} />
        <Selector etiqueta="Comuna" valor={comuna ?? ''} onChange={(v) => setComuna(v === '' ? null : Number(v))}
          opciones={[['', 'Toda la ciudad'], ...comunas.map((x) => [x.codigo, x.nombre])]} />
      </div>

      {!datos ? <p className="cargando">Consultando…</p> : (
        <>
          <div className="kpis">
            <Kpi etiqueta={`${capital(c.sustantivo)} en ${anio}${periodo}`} valor={fmt.format(kpis.actual)} />
            <Kpi etiqueta={`Cambio frente a ${comparar}${periodo}`}
              valor={kpis.cambio == null ? '—' : `${kpis.cambio > 0 ? '+' : ''}${fmt.format(kpis.cambio)} %`}
              tono={kpis.cambio == null ? null : kpis.cambio > 0 ? 'sube' : 'baja'} />
            <Kpi etiqueta="Por cada 100 mil habitantes" valor={fmt.format(Math.round(kpis.tasa))} nota="Población proyectada 2020" />
            <Kpi etiqueta={`Mes con más ${c.sustantivo} en ${anio}`} valor={kpis.pico ? MESES[kpis.pico.mes - 1] : '—'}
              nota={kpis.pico ? `${fmt.format(kpis.pico.total)} ${c.sustantivo}` : null} />
          </div>
          {meses.length < 12 && (
            <p className="aviso">
              Uno de los años no está completo: para comparar de forma justa, los totales de {anio} y {comparar} cuentan
              solo de {mes(meses[0])} a {mes(meses.at(-1))}.
            </p>
          )}

          <div className="rejilla">
            <Tarjeta titulo={`Mes a mes: ${anio} frente a ${comparar}`}>
              <GraficaMensual datos={datos.mensual} anio={anio} comparar={comparar} />
            </Tarjeta>
            <Tarjeta titulo={`Evolución ${primero}–${ultimo}`}
              nota={parciales.length ? `Tramos punteados: años incompletos (${[...parciales].sort().map((a) => `${a}: ${mes(mesesPorAnio[a][0])}–${mes(mesesPorAnio[a].at(-1))}`).join(', ')}).` : null}>
              <GraficaAnual datos={datos.anual} anio={anio} comparar={comparar} parciales={parciales} />
            </Tarjeta>
          </div>

          <Tarjeta titulo={`Comunas en ${anio}${periodo} frente a ${comparar}`}
            nota={`Haz clic en una comuna (en el mapa o en las barras) para filtrar todo el tablero. ${c.notaComunas}`}>
            <div className="segmentado" role="group" aria-label="Medida">
              <button aria-pressed={medida === 'tasa'} onClick={() => setMedida('tasa')}>Por 100 mil habitantes</button>
              <button aria-pressed={medida === 'total'} onClick={() => setMedida('total')}>Número de {c.sustantivo}</button>
            </div>
            <div className="rejilla">
              <MapaComunas {...propsComunas} />
              <GraficaComunas {...propsComunas} />
            </div>
          </Tarjeta>

          <Tarjeta titulo={`¿Cuándo ocurren? Día y hora en ${anio}`}
            nota={`Cada cuadro es una hora de un día de la semana; color más intenso = más ${c.sustantivo}.`}>
            <GraficaHorario datos={datos.horario} sustantivo={c.sustantivo} />
          </Tarjeta>
        </>
      )}
    </>
  )
}

const capital = (s) => s[0].toUpperCase() + s.slice(1)

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
