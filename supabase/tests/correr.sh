#!/usr/bin/env bash
# ============================================================================
# Corre TODAS las pruebas repetibles, en orden, y dice al final si algo falló.
#
# Por qué un script y no pegar todo en el SQL Editor: el editor muestra el
# resultado de la ÚLTIMA consulta y nada más, así que pegando los dieciséis
# archivos juntos verías solo el último y creerías que corriste todo. psql
# imprime cada tabla.
#
# La dirección de la base NO vive acá. Sale de .env.local, que está en el
# .gitignore desde el primer día. Si este archivo tuviera la contraseña,
# subirla al repo sería cuestión de tiempo.
#
# CÓMO SE USA
#
#   1. En Supabase: Project Settings → Database → Connection string → URI.
#      Copiá esa línea y reemplazá [YOUR-PASSWORD] por la contraseña real.
#   2. Pegala en .env.local, en una línea así:
#
#        DATABASE_URL=postgresql://postgres:LACLAVE@db.XXXX.supabase.co:5432/postgres
#
#   3. npm run prueba:base
#
# Si no tenés psql: brew install libpq && brew link --force libpq
# ============================================================================
set -u

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$raiz"

if [ -f .env.local ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env.local; set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL en .env.local. Leé las instrucciones arriba de este archivo."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "No está instalado psql. Instalalo con:  brew install libpq && brew link --force libpq"
  exit 1
fi

# El orden importa: aislamiento.sql prepara los dos espacios de prueba y
# aislamiento_alumno.sql la ficha del alumno. Todo lo demás los necesita.
pruebas=(
  aislamiento.sql
  aislamiento_alumno.sql
  aislamiento_cargos.sql
  confirmar_pago.sql
  cargos_automaticos.sql
  clases_automaticas.sql
  invitaciones.sql
  forma_de_pago.sql
  saldo_a_favor.sql
  mantenimiento.sql
  comprobantes_viejos.sql
  ficha_del_alumno.sql
  medios_de_pago.sql
  logo_de_la_escuela.sql
  avatares.sql
  mi_correo.sql
  control_general.sql
)

salida="$(mktemp)"
fallaron=()
rotas=()

for p in "${pruebas[@]}"; do
  archivo="supabase/tests/$p"
  if [ ! -f "$archivo" ]; then
    echo "── $p  (no existe, salteada)"
    continue
  fi

  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  $p"
  echo "════════════════════════════════════════════════════════════"

  # ON_ERROR_STOP corta ESTE archivo si explota, no la tanda entera: una
  # prueba rota no tiene por qué esconder el resultado de las otras quince.
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$archivo" 2>&1 | tee "$salida"; then
    :
  else
    rotas+=("$p")
  fi

  if grep -qi 'FALLA\|FUGA DE DATOS' "$salida"; then
    fallaron+=("$p")
  fi
done

rm -f "$salida"

echo ""
echo "════════════════════════════════════════════════════════════"
if [ ${#fallaron[@]} -eq 0 ] && [ ${#rotas[@]} -eq 0 ]; then
  echo "  TODO PASA"
else
  [ ${#rotas[@]}    -gt 0 ] && echo "  NO PUDIERON CORRER: ${rotas[*]}"
  [ ${#fallaron[@]} -gt 0 ] && echo "  CON FALLAS:         ${fallaron[*]}"
  echo ""
  echo "  Subí en la pantalla para ver qué fila falló."
  exit 1
fi
echo "════════════════════════════════════════════════════════════"
