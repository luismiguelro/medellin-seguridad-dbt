// ---------------------------------------------------------------------------
// Fase B · Clase "DuckDB en el navegador"
//
// DuckDB-WASM es el mismo motor que usa dbt en tu PC, compilado a
// WebAssembly para que corra DENTRO del navegador. Por eso el tablero no
// necesita servidor: la página descarga los Parquet exportados desde los
// marts y cada filtro ejecuta SQL ahí mismo, en la máquina de quien lo mira.
// ---------------------------------------------------------------------------
import * as duckdb from '@duckdb/duckdb-wasm'

let conexion = null

async function iniciar() {
  // El motor (~7 MB) se descarga de jsDelivr y queda en caché del navegador.
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles())
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
  )
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), new Worker(workerUrl))
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(workerUrl)

  const conn = await db.connect()

  // tablas.json lo escribe scripts/exportar_marts.py con los marts de la
  // exposure. Cada Parquet queda como una vista con el mismo nombre del mart,
  // así el SQL del frontend se lee igual que en dbt: select ... from dim_comunas
  const base = new URL('data/', document.baseURI)
  const tablas = await (await fetch(new URL('tablas.json', base))).json()
  for (const tabla of tablas) {
    await db.registerFileURL(`${tabla}.parquet`, new URL(`${tabla}.parquet`, base).href, duckdb.DuckDBDataProtocol.HTTP, false)
    await conn.query(`create view ${tabla} as select * from read_parquet('${tabla}.parquet')`)
  }
  return conn
}

// Ejecuta SQL y devuelve una lista de objetos JS: [{ anio: 2022, total: 123 }, ...]
// DuckDB entrega los enteros grandes (BIGINT, el tipo de sum/count) como BigInt
// de JavaScript, que las gráficas no entienden; aquí se pasan a Number.
export async function consultar(sql) {
  conexion ??= iniciar()
  const resultado = await (await conexion).query(sql)
  return resultado.toArray().map((fila) =>
    Object.fromEntries(
      Object.entries(fila.toJSON()).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]),
    ),
  )
}
