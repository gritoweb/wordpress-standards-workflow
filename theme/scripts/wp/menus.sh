#!/usr/bin/env bash
# Creates the theme's registered menu locations' menus (if missing) and
# assigns them. Idempotent. Local WordPress only. Run via `lando wp` from
# the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: menus.sh

For every menu location the active theme registers (`wp menu location
list`), creates a menu named after the location (if none exists) and
assigns it to that location. Idempotent: skips a location that already has
a menu assigned, and reuses an existing menu whose name matches.

Local WordPress only (refuses to run against a non-local siteurl).
EOF
}

# footer_column_1 -> Footer Column 1
humanize() {
  local s="${1//_/ }" out="" word
  s="${s//-/ }"
  for word in $s; do
    out="$out${out:+ }$(tr '[:lower:]' '[:upper:]' <<< "${word:0:1}")${word:1}"
  done
  printf '%s' "$out"
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    "") ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac

  require_local_wp
  require_php

  local location assigned name existing_id menu_id made=0
  # `menu list` has no --locations or --field filter; wp-cli would reject
  # either one before the command runs. Fetch every menu once and let PHP
  # pick out an assignment or a name match instead.
  local menus_json
  menus_json="$("${WP[@]}" menu list --fields=term_id,name,locations --format=json 2>/dev/null)"

  while IFS= read -r location; do
    [[ -z "$location" ]] && continue

    assigned="$(php -r '
      $menus = json_decode(stream_get_contents(STDIN), true) ?: [];
      foreach ($menus as $menu) {
          $locations = is_array($menu["locations"] ?? null) ? $menu["locations"] : [];
          if (in_array($argv[1], $locations, true)) {
              echo $menu["name"];
              exit;
          }
      }
    ' "$location" <<< "$menus_json")"

    if [[ -n "$assigned" ]]; then
      echo "skip: $location already has \"$assigned\""
      continue
    fi

    name="$(humanize "$location")"
    existing_id="$(php -r '
      $menus = json_decode(stream_get_contents(STDIN), true) ?: [];
      foreach ($menus as $menu) {
          if (($menu["name"] ?? null) === $argv[1]) {
              echo $menu["term_id"];
              exit;
          }
      }
    ' "$name" <<< "$menus_json")"

    if [[ -n "$existing_id" ]]; then
      menu_id="$existing_id"
    else
      menu_id="$("${WP[@]}" menu create "$name" --porcelain)"
    fi

    "${WP[@]}" menu location assign "$menu_id" "$location"
    echo "assigned: \"$name\" -> $location"
    made=$((made + 1))
  done < <("${WP[@]}" menu location list --format=csv | tail -n +2 | cut -d, -f1)

  echo "menus: $made location(s) assigned."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
