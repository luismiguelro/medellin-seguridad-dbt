// ---------------------------------------------------------------------------
// Fase B · Clase "Elegir la gráfica correcta"
//
//   Comparar dos años mes a mes      -> barras agrupadas (azul = año elegido,
//                                       gris = año de comparación)
//   Ver una tendencia larga          -> línea
//   Ordenar comunas                  -> barras horizontales ordenadas
//                                       (los nombres largos se leen bien)
//   Dos dimensiones (día × hora)     -> mapa de calor
//
// Regla de color en todo el tablero: azul = año elegido, gris = comparación.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { Grafica } from './echarts.jsx'
import { DIAS, MESES, fmt } from './constantes.js'

// Colores según el tema claro/oscuro del sistema.
function useTema() {
  const consulta = '(prefers-color-scheme: dark)'
  const [oscuro, setOscuro] = useState(() => window.matchMedia(consulta).matches)
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const cambio = (e) => setOscuro(e.matches)
    mq.addEventListener('change', cambio)
    return () => mq.removeEventListener('change', cambio)
  }, [])
  return oscuro
    ? { azul: '#60a5fa', gris: '#5b6170', texto: '#a0a4aa', linea: 'rgba(255,255,255,.08)', calor: ['#1b2433', '#60a5fa'] }
    : { azul: '#2563eb', gris: '#c4c7ce', texto: '#5f6368', linea: 'rgba(0,0,0,.07)', calor: ['#eef3fd', '#1e40af'] }
}

const base = (t) => ({
  textStyle: { color: t.texto, fontFamily: 'inherit' },
  tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : fmt.format(v)) },
  legend: { top: 0, textStyle: { color: t.texto } },
})
const ejeValor = (t) => ({ type: 'value', axisLabel: { color: t.texto, formatter: (v) => fmt.format(v) }, splitLine: { lineStyle: { color: t.linea } } })
const ejeCategoria = (t, data) => ({ type: 'category', data, axisTick: { show: false }, axisLabel: { color: t.texto }, axisLine: { lineStyle: { color: t.linea } } })

export function GraficaMensual({ datos, anio, comparar }) {
  const t = useTema()
  const serie = (a) => MESES.map((_, i) => datos.find((f) => f.anio === a && f.mes === i + 1)?.total ?? null)
  return (
    <Grafica style={{ height: 300 }} option={{
      ...base(t),
      grid: { left: 48, right: 8, top: 36, bottom: 24 },
      xAxis: ejeCategoria(t, MESES),
      yAxis: ejeValor(t),
      series: [
        { name: String(comparar), type: 'bar', data: serie(comparar), color: t.gris, barGap: '10%' },
        { name: String(anio), type: 'bar', data: serie(anio), color: t.azul },
      ],
    }} />
  )
}

export function GraficaAnual({ datos, anio, comparar }) {
  const t = useTema()
  const n = datos.length
  // Los dos años del filtro se marcan con un punto grande.
  const punto = (f) => ({
    value: f.total,
    symbolSize: f.anio === anio || f.anio === comparar ? 11 : 4,
    itemStyle: { color: f.anio === comparar ? t.gris : t.azul, borderColor: t.azul, borderWidth: f.anio === comparar ? 2 : 0 },
  })
  return (
    <Grafica style={{ height: 300 }} option={{
      ...base(t),
      legend: { show: false },
      grid: { left: 48, right: 8, top: 36, bottom: 24 },
      xAxis: ejeCategoria(t, datos.map((f) => f.anio)),
      yAxis: ejeValor(t),
      series: [
        { name: 'Hechos', type: 'line', color: t.azul, lineStyle: { width: 2.5 }, symbol: 'circle',
          data: datos.map((f, i) => (i < n - 1 ? punto(f) : null)) },
        { name: 'Hechos (año incompleto)', type: 'line', color: t.azul, lineStyle: { width: 2.5, type: 'dashed' }, symbol: 'circle',
          data: datos.map((f, i) => (i >= n - 2 ? punto(f) : null)) },
      ],
    }} />
  )
}

export function GraficaComunas({ datos, comunas, anio, comparar, seleccion, onSeleccion }) {
  const t = useTema()
  const [medida, setMedida] = useState('tasa')   // 'tasa' por 100 mil hab. o 'total' de hechos

  const filas = comunas
    .map((c) => {
      const d = datos.find((f) => f.codigo === c.codigo) ?? { a: 0, b: 0 }
      const valor = (x) => (medida === 'tasa' ? Math.round((x * 100000) / c.poblacion) : x)
      return { ...c, a: valor(d.a), b: valor(d.b), cambio: d.b ? ((d.a - d.b) / d.b) * 100 : null }
    })
    .sort((x, y) => x.a - y.a)   // ECharts dibuja de abajo hacia arriba: el mayor queda arriba

  // La comuna seleccionada queda resaltada; las demás se atenúan.
  const barra = (f, campo, color) => ({
    value: f[campo],
    itemStyle: { color, opacity: seleccion == null || f.codigo === seleccion ? 1 : 0.35 },
  })

  return (
    <>
      <div className="segmentado" role="group" aria-label="Medida">
        <button aria-pressed={medida === 'tasa'} onClick={() => setMedida('tasa')}>Por 100 mil habitantes</button>
        <button aria-pressed={medida === 'total'} onClick={() => setMedida('total')}>Número de hechos</button>
      </div>
      <Grafica
        style={{ height: Math.max(420, filas.length * 30) }}
        onEvents={{ click: (e) => onSeleccion(filas[e.dataIndex].codigo) }}
        option={{
          ...base(t),
          tooltip: {
            trigger: 'axis', axisPointer: { type: 'shadow' },
            formatter: (ps) => {
              const f = filas[ps[0].dataIndex]
              const cambio = f.cambio == null ? '' : `<br/>Cambio en hechos: ${f.cambio > 0 ? '+' : ''}${fmt.format(f.cambio)} %`
              return `<b>${f.nombre}</b><br/>${anio}: ${fmt.format(f.a)}<br/>${comparar}: ${fmt.format(f.b)}${cambio}`
            },
          },
          grid: { left: 150, right: 16, top: 36, bottom: 24 },
          xAxis: ejeValor(t),
          yAxis: { ...ejeCategoria(t, filas.map((f) => f.nombre)), axisLabel: { color: t.texto, width: 140, overflow: 'truncate' } },
          series: [
            { name: String(comparar), type: 'bar', color: t.gris, data: filas.map((f) => barra(f, 'b', t.gris)), barGap: '10%' },
            { name: String(anio), type: 'bar', color: t.azul, data: filas.map((f) => barra(f, 'a', t.azul)) },
          ],
        }}
      />
    </>
  )
}

export function GraficaHorario({ datos }) {
  const t = useTema()
  const max = Math.max(1, ...datos.map((f) => f.total))
  return (
    <Grafica style={{ height: 300 }} option={{
      textStyle: { color: t.texto, fontFamily: 'inherit' },
      tooltip: { formatter: (p) => `${DIAS[p.value[1]]} ${String(p.value[0]).padStart(2, '0')}:00 · ${fmt.format(p.value[2])} hechos` },
      grid: { left: 44, right: 8, top: 8, bottom: 56 },
      xAxis: { ...ejeCategoria(t, Array.from({ length: 24 }, (_, h) => `${h}h`)), splitArea: { show: false } },
      yAxis: { ...ejeCategoria(t, DIAS), inverse: true },
      visualMap: {
        min: 0, max, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, calculable: false,
        inRange: { color: t.calor }, textStyle: { color: t.texto }, formatter: (v) => fmt.format(Math.round(v)),
      },
      series: [{
        type: 'heatmap',
        data: datos.map((f) => [f.hora, f.dia - 1, f.total]),
        itemStyle: { borderColor: 'transparent', borderWidth: 1 },
      }],
    }} />
  )
}
