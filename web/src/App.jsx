// ---------------------------------------------------------------------------
// Fase B · Clase "Un tablero, dos temas"
//
// Delitos y seguridad vial tienen marts con el MISMO diseño (año × mes ×
// categoría × comuna, y año × categoría × comuna × día × hora). Por eso un
// solo componente <Tablero> sirve para ambos: solo cambia la configuración
// (qué tablas, qué columna es la categoría, cómo se llaman las cosas).
// Es la misma idea de dbt de no repetir lógica: aquí en vez de una macro es
// un componente con parámetros.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { consultar } from './db.js'
import { Tablero } from './Tablero.jsx'

const TEMAS = {
  delitos: {
    pestana: 'Delitos',
    tablaMes: 'agg_delitos_mes_comuna',
    tablaHora: 'agg_delitos_hora_dia',
    colCategoria: 'tipo_delito',
    colTotal: 'total_delitos',
    etiquetaCategoria: 'Delito',
    categorias: ['Hurto a persona', 'Hurto de moto', 'Hurto de carro', 'Hurto a residencia', 'Homicidio', 'Extorsión'],
    todas: 'Todos los delitos',
    porDefecto: 'Hurto a persona',
    sustantivo: 'hechos',
    titulo: (cat, lugar) => `${cat ?? 'Delitos'} en ${lugar}`,
    fuente: 'Hechos reportados a la Policía (SISC / Policía Nacional)',
    notaComunas: 'Ojo: el centro (La Candelaria) recibe a diario mucha más gente de la que vive allí, por eso su tasa por habitante sale tan alta.',
  },
  vial: {
    pestana: 'Seguridad vial',
    tablaMes: 'agg_incidentes_viales_mes_comuna',
    tablaHora: 'agg_incidentes_viales_hora_dia',
    colCategoria: 'gravedad',
    colTotal: 'total_incidentes',
    etiquetaCategoria: 'Gravedad',
    categorias: ['Con muertos', 'Con heridos', 'Solo daños'],
    todas: 'Todas las gravedades',
    porDefecto: null,
    sustantivo: 'incidentes',
    titulo: (cat, lugar) => `Incidentes viales${cat ? ` ${cat.toLowerCase()}` : ''} en ${lugar}`,
    fuente: 'Incidentes de tránsito reportados a la Secretaría de Movilidad',
    notaComunas: 'Se cuentan incidentes, no personas: un choque con 3 heridos suma 1. La tasa usa a los residentes, pero por el centro y las vías principales pasa tráfico de toda la ciudad.',
  },
}

export default function App() {
  const [tema, setTema] = useState('delitos')
  const [comunas, setComunas] = useState(null)
  const [error, setError] = useState(null)

  // Las comunas (nombres y población) son comunes a ambas pestañas: una sola consulta.
  useEffect(() => {
    consultar(`select codigo_comuna::int as codigo, nombre_comuna as nombre, poblacion_2020::int as poblacion
               from dim_comunas order by codigo`)
      .then(setComunas)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <main>
      <p className="eyebrow">Datos abiertos · Alcaldía de Medellín</p>
      <nav className="pestanas" role="tablist" aria-label="Tema">
        {Object.entries(TEMAS).map(([id, t]) => (
          <button key={id} role="tab" aria-selected={tema === id} onClick={() => setTema(id)}>{t.pestana}</button>
        ))}
      </nav>

      {error && <p className="error">No se pudieron cargar los datos: {error}</p>}
      {!error && !comunas && <p className="cargando">Cargando el motor de datos… (la primera vez tarda unos segundos)</p>}
      {/* key={tema}: al cambiar de pestaña el tablero arranca limpio, con sus propios filtros. */}
      {comunas && <Tablero key={tema} config={TEMAS[tema]} comunas={comunas} />}

      <footer>
        Fuente: <a href="https://medata.gov.co">MEData</a>, Alcaldía de Medellín. Procesado con dbt ·{' '}
        <a href="docs/">Documentación técnica</a> ·{' '}
        <a href="https://github.com/luismiguelro/medellin-seguridad-dbt">Código</a>
      </footer>
    </main>
  )
}
