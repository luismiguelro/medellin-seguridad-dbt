// ---------------------------------------------------------------------------
// Fase B · Clase "Primera página del tablero"
//
// Flujo de React en esta página:
//   1. `tipo` guarda el delito elegido (estado). Cambiarlo vuelve a dibujar.
//   2. useEffect: cada vez que cambia `tipo`, ejecuta SQL en DuckDB-WASM
//      contra el mart agg_delitos_hora_dia y guarda el resultado en `serie`.
//   3. Con `serie` se calculan las tarjetas (KPIs) y se arma la gráfica.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { consultar } from './db.js'

const TIPOS = ['Hurto a persona', 'Hurto de moto', 'Hurto de carro', 'Hurto a residencia', 'Homicidio', 'Extorsión']
const fmt = new Intl.NumberFormat('es-CO')

export default function App() {
  const [tipo, setTipo] = useState('Hurto a persona')
  const [serie, setSerie] = useState(null)   // [{ anio, total }] ; null = cargando
  const [error, setError] = useState(null)

  useEffect(() => {
    setSerie(null)
    // El SQL es el mismo que escribirías en dbt; ${tipo} viene de la lista fija TIPOS.
    consultar(`
      select anio::integer as anio, sum(total_delitos)::integer as total
      from agg_delitos_hora_dia
      where tipo_delito = '${tipo}'
      group by anio
      order by anio
    `)
      .then(setSerie)
      .catch((e) => setError(e.message))
  }, [tipo])

  return (
    <main>
      <header>
        <p className="eyebrow">Datos abiertos · Alcaldía de Medellín</p>
        <h1>¿Cómo ha cambiado la seguridad en Medellín?</h1>
        <p className="lead">
          Hechos reportados a la Policía entre 2003 y noviembre de 2023. Elige un delito para ver
          su evolución año a año.
        </p>
      </header>

      <nav className="chips" aria-label="Tipo de delito">
        {TIPOS.map((t) => (
          <button key={t} className={t === tipo ? 'chip activo' : 'chip'} aria-pressed={t === tipo} onClick={() => setTipo(t)}>
            {t}
          </button>
        ))}
      </nav>

      {error && <p className="error">No se pudieron cargar los datos: {error}</p>}
      {!error && !serie && <p className="cargando">Cargando datos…</p>}
      {serie && <Resumen serie={serie} tipo={tipo} />}

      <footer>
        Fuente: <a href="https://medata.gov.co">MEData</a> (SISC / Policía Nacional). Procesado con dbt ·{' '}
        <a href="docs/">Documentación técnica</a> ·{' '}
        <a href="https://github.com/luismiguelro/medellin-seguridad-dbt">Código</a>
      </footer>
    </main>
  )
}

function Resumen({ serie, tipo }) {
  // 2023 está incompleto (llega hasta noviembre): las comparaciones usan el
  // último año COMPLETO para no mostrar una caída que no es real.
  const ultimoCompleto = serie.at(-1).anio - 1
  const valor = (anio) => serie.find((f) => f.anio === anio)?.total ?? 0
  const actual = valor(ultimoCompleto)
  const anterior = valor(ultimoCompleto - 1)
  const cambio = anterior ? ((actual - anterior) / anterior) * 100 : null
  const pico = serie.reduce((a, b) => (b.total > a.total ? b : a))

  const opcion = {
    grid: { left: 56, right: 16, top: 24, bottom: 32 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '' : fmt.format(v)) },
    xAxis: { type: 'category', data: serie.map((f) => f.anio), axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { formatter: (v) => fmt.format(v) }, splitLine: { lineStyle: { color: 'rgba(128,128,128,.2)' } } },
    series: [
      {
        // Años completos: línea sólida.
        name: tipo, type: 'line', symbolSize: 6, color: '#2563eb', lineStyle: { width: 3 },
        data: serie.map((f, i) => (i < serie.length - 1 ? f.total : null)),
      },
      {
        // Último año (parcial): tramo punteado para que nadie lo lea como una caída.
        name: `${tipo} (año incompleto)`, type: 'line', symbolSize: 6, color: '#2563eb', lineStyle: { width: 3, type: 'dashed' },
        data: serie.map((f, i) => (i >= serie.length - 2 ? f.total : null)),
      },
    ],
  }

  return (
    <section>
      <div className="kpis">
        <Kpi etiqueta={`Hechos en ${ultimoCompleto}`} valor={fmt.format(actual)} />
        <Kpi
          etiqueta={`Cambio frente a ${ultimoCompleto - 1}`}
          valor={cambio == null ? '—' : `${cambio > 0 ? '+' : ''}${cambio.toFixed(1)} %`}
        />
        <Kpi etiqueta="Año con más hechos" valor={`${pico.anio}`} nota={`${fmt.format(pico.total)} hechos`} />
      </div>
      <div className="tarjeta">
        <h2>{tipo}: hechos por año</h2>
        <ReactECharts option={opcion} style={{ height: 340 }} notMerge />
        <p className="nota">El tramo punteado es {serie.at(-1).anio}, que solo tiene datos hasta noviembre.</p>
      </div>
    </section>
  )
}

function Kpi({ etiqueta, valor, nota }) {
  return (
    <div className="tarjeta kpi">
      <p className="kpi-etiqueta">{etiqueta}</p>
      <p className="kpi-valor">{valor}</p>
      {nota && <p className="nota">{nota}</p>}
    </div>
  )
}
