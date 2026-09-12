#!/usr/bin/env bash
#
# Compara un export nuevo de Lovable contra el baseline del repo (multas-export/)
# y avisa si ha cambiado algo que ya hemos portado a los servicios.
#
#   ./scripts/comparar-lovable.sh "ruta/al/Control de Multas.zip"
#
# Sin argumento, usa el .zip más reciente de la carpeta del repo o de ~/Downloads.
# Solo lee: no modifica el repo ni el ZIP.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="$RAIZ/multas-export"

ZIP="${1:-}"
if [ -z "$ZIP" ]; then
  ZIP=$(ls -t "$RAIZ"/*.zip "$HOME/Downloads"/*.zip 2>/dev/null | head -1 || true)
fi
[ -n "$ZIP" ] && [ -f "$ZIP" ] || { echo "No encuentro ningún ZIP. Pásalo como argumento."; exit 1; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
unzip -q -o "$ZIP" -d "$TMP"

echo "Export nuevo : $ZIP"
echo "Baseline     : $BASE"
echo "Fecha ZIP    : $(date -r "$ZIP" +'%d/%m/%Y %H:%M')"
echo

# El .env nunca se compara: contiene claves y no está versionado.
EXCL=(-x ".env" -x "node_modules/*" -x ".output/*" -x ".wrangler/*" -x "bun.lock")

echo "=== 1. Archivos añadidos, borrados o modificados ==="
diff -rq "${EXCL[@]}" "$BASE" "$TMP" 2>/dev/null | sed \
  -e "s|$BASE|BASELINE|g" -e "s|$TMP|NUEVO|g" || true
echo

echo "=== 2. ⚠️  Archivos YA PORTADOS a servicios ==="
echo "Si alguno aparece como modificado, hay que replicar el cambio a mano."
echo
# plazos.ts  -> services/deadlines-service/src/plazos.ts
# expediente.server.ts (prompts) -> packages/ai-provider/src/prompts.ts
for f in src/lib/plazos.ts src/lib/expediente.server.ts src/lib/expediente.functions.ts; do
  if [ ! -f "$TMP/$f" ]; then
    echo "  [BORRADO EN ORIGEN] $f"
  elif diff -q "$BASE/$f" "$TMP/$f" >/dev/null 2>&1; then
    echo "  [sin cambios]       $f"
  else
    echo "  [CAMBIADO]          $f"
    echo "    -> destino: $(case $f in
         *plazos*) echo 'services/deadlines-service/src/plazos.ts (+ sus tests)';;
         *server*) echo 'packages/ai-provider/src/prompts.ts (REVISIÓN JURÍDICA)';;
         *)        echo 'sin portar todavía; solo referencia';; esac)"
    diff -u "$BASE/$f" "$TMP/$f" | head -40 | sed 's/^/    /'
    echo
  fi
done
echo

echo "=== 3. Migraciones SQL nuevas ==="
NUEVAS=$(comm -13 \
  <(ls "$BASE/supabase/migrations" 2>/dev/null | sort) \
  <(ls "$TMP/supabase/migrations" 2>/dev/null | sort))
if [ -z "$NUEVAS" ]; then
  echo "  ninguna"
else
  for m in $NUEVAS; do
    echo "  + $m"
    sed 's/^/      /' "$TMP/supabase/migrations/$m" | head -25
    echo
  done
  echo "  El esquema ha cambiado: revisa si afecta a SPEC.md §4 (modelo de dominio)."
fi
echo

echo "=== 4. Dependencias ==="
diff <(grep -E '"[^"]+": "\^?[0-9]' "$BASE/package.json" | sort) \
     <(grep -E '"[^"]+": "\^?[0-9]' "$TMP/package.json" | sort) \
  && echo "  sin cambios" || true
echo

echo "=== 5. Rutas ==="
diff <(cd "$BASE" && find src/routes -type f 2>/dev/null | sort) \
     <(cd "$TMP"  && find src/routes -type f 2>/dev/null | sort) \
  && echo "  sin cambios" || true
