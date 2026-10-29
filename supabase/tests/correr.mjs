// ============================================================================
// Corre TODAS las pruebas repetibles, en orden, y dice al final si algo falló.
//
//   npm run prueba:base
//
// Por qué un corredor y no pegar todo en el SQL Editor: el editor muestra el
// resultado de la ÚLTIMA consulta y nada más, así que pegando los diecisiete
// archivos juntos verías solo el último y creerías que corriste todo.
//
// Por qué en Node y no un script de shell con psql: psql hay que instalarlo, y
// Node ya está acá porque es con lo que se construye la app. Una herramienta
// que exige instalar otra herramienta es una herramienta que no se usa.
//
// La dirección de la base NO vive acá: sale de .env.local, que está en el
// .gitignore desde el primer día. Un script con la contraseña adentro termina
// en GitHub; es cuestión de tiempo.
// ============================================================================
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const aca = dirname(fileURLToPath(import.meta.url));
const raiz = join(aca, '..', '..');

// ---------------------------------------------------------------------------
// El orden importa y no es alfabético: aislamiento.sql prepara los dos
// espacios de prueba y aislamiento_alumno.sql la ficha del alumno. Todo lo
// demás los necesita. Una prueba nueva se agrega acá.
// ---------------------------------------------------------------------------
const PRUEBAS = [
  'aislamiento.sql',
  'aislamiento_alumno.sql',
  'aislamiento_cargos.sql',
  'confirmar_pago.sql',
  'cargos_automaticos.sql',
  'pago_unico.sql',
  'clases_automaticas.sql',
  'clases_cada_tanto.sql',
  'invitaciones.sql',
  'forma_de_pago.sql',
  'saldo_a_favor.sql',
  'lo_que_vencio.sql',
  'mantenimiento.sql',
  'comprobantes_viejos.sql',
  'ficha_del_alumno.sql',
  'medios_de_pago.sql',
  'logo_de_la_escuela.sql',
  'avatares.sql',
  'mi_correo.sql',
  'lo_que_ensena.sql',
  'grupo_online.sql',
  'dejar_la_escuela.sql',
  'archivos_sueltos.sql',
  'control_general.sql',
];

// ---------------------------------------------------------------------------
// .env.local, a mano. Traer una librería para leer cinco líneas de texto sería
// una dependencia más para mantener.
// ---------------------------------------------------------------------------
function leerEnv() {
  const archivo = join(raiz, '.env.local');
  if (!existsSync(archivo)) return {};
  const valores = {};
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const corte = limpia.indexOf('=');
    if (corte < 1) continue;
    valores[limpia.slice(0, corte).trim()] =
      limpia.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
  }
  return valores;
}

// ---------------------------------------------------------------------------
// Imprimir una tabla sin librerías. Cada columna se ancha a su contenido.
// ---------------------------------------------------------------------------
function tabla(filas) {
  if (!filas.length) return;
  const cols = Object.keys(filas[0]);
  const texto = (v) => (v === null || v === undefined ? '' : String(v));
  const ancho = cols.map((c) =>
    Math.max(c.length, ...filas.map((f) => texto(f[c]).length)));

  const linea = (celdas) =>
    '  ' + celdas.map((v, i) => texto(v).padEnd(ancho[i])).join('  │  ');

  console.log(linea(cols));
  console.log('  ' + ancho.map((a) => '─'.repeat(a)).join('──┼──'));
  for (const f of filas) console.log(linea(cols.map((c) => f[c])));
}

const ROJO = '\x1b[31m';
const VERDE = '\x1b[32m';
const GRIS = '\x1b[90m';
const FIN = '\x1b[0m';

async function main() {
  const env = { ...leerEnv(), ...process.env };
  const url = env.DATABASE_URL;

  if (!url) {
    console.error(
      '\nFalta DATABASE_URL en .env.local.\n\n' +
      'En Supabase: Project Settings → Database → Connection string → URI,\n' +
      'cambiando [YOUR-PASSWORD] por la contraseña real de la base.\n',
    );
    process.exit(1);
  }

  // rejectUnauthorized en false porque Supabase usa un certificado propio y
  // bajarlo para esto sería un archivo más que mantener. Es una conexión a tu
  // propia base desde tu propia máquina, no un servicio expuesto.
  const cliente = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    await cliente.connect();
  } catch (e) {
    console.error(`\n${ROJO}No se pudo conectar a la base.${FIN}\n${e.message}\n`);
    console.error(
      'Lo más común:\n' +
      '  · La contraseña no es esa → reseteala en Supabase, misma pantalla.\n' +
      '  · "ENETUNREACH" o "ENOTFOUND" → usá la cadena del Session pooler\n' +
      '    en vez de la directa. Está en la misma pantalla, pestaña\n' +
      '    "Session pooler". La directa no siempre es alcanzable.\n',
    );
    process.exit(1);
  }

  const fallaron = [];
  const rotas = [];

  for (const nombre of PRUEBAS) {
    const archivo = join(aca, nombre);
    if (!existsSync(archivo)) {
      console.log(`${GRIS}── ${nombre} (no existe, salteada)${FIN}`);
      continue;
    }

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`  ${nombre}`);
    console.log('════════════════════════════════════════════════════════════');

    try {
      // Sin parámetros, node-postgres manda el archivo entero y devuelve un
      // resultado por sentencia. Se imprimen solo los que trajeron filas: lo
      // demás son los "begin", los "set" y el "rollback".
      const resultados = await cliente.query(readFileSync(archivo, 'utf8'));
      const tandas = Array.isArray(resultados) ? resultados : [resultados];

      let algo = false;
      for (const r of tandas) {
        if (!r || !r.rows || r.rows.length === 0) continue;
        tabla(r.rows);
        console.log('');
        algo = true;

        const crudo = JSON.stringify(r.rows);
        if (/FALLA|FUGA DE DATOS|NO CONCLUYENTE/i.test(crudo)) {
          if (!fallaron.includes(nombre)) fallaron.push(nombre);
        }
      }
      if (!algo) console.log(`${GRIS}  (sin filas)${FIN}\n`);
    } catch (e) {
      console.log(`${ROJO}  NO PUDO CORRER: ${e.message}${FIN}\n`);
      rotas.push(nombre);
      // Una prueba que explota puede dejar la transacción abierta. Se cierra
      // acá para que las que siguen arranquen limpias, en vez de ir cayendo
      // todas detrás de la primera.
      await cliente.query('rollback').catch(() => {});
    }
  }

  await cliente.end();

  console.log('════════════════════════════════════════════════════════════');
  if (!fallaron.length && !rotas.length) {
    console.log(`  ${VERDE}TODO PASA${FIN}`);
    console.log('════════════════════════════════════════════════════════════');
    return;
  }
  if (rotas.length) console.log(`  ${ROJO}NO PUDIERON CORRER:${FIN} ${rotas.join(', ')}`);
  if (fallaron.length) console.log(`  ${ROJO}CON FALLAS:${FIN}         ${fallaron.join(', ')}`);
  console.log('');
  console.log('  Subí en la pantalla para ver qué fila falló.');
  console.log('════════════════════════════════════════════════════════════');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
