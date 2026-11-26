// Fase B · Clase "Sitio liviano": en vez de importar TODO ECharts (~1 MB),
// se registran solo las piezas que usa el tablero. El navegador descarga menos.
import * as echarts from 'echarts/core'
import { BarChart, HeatmapChart, LineChart, MapChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'

echarts.use([BarChart, HeatmapChart, LineChart, MapChart, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

export { echarts }

export function Grafica(props) {
  return <ReactEChartsCore echarts={echarts} notMerge {...props} />
}
