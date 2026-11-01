#!/usr/bin/env bash
# Creates one "Kit sample" page per block group (grouped by each block's
# block.json `category`, built from its `example.attributes`) plus a style
# guide page. Idempotent by page slug. Local WordPress only. Run via
# `lando wp` from the project root.
#
# Written against the block.json `example` convention only — it doesn't
# depend on any specific block, so it works before, during, and after any
# given block is built.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEME_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<EOF
Usage: sample-pages.sh [--blocks-dir DIR] [--styleguide-template FILE]

Creates a "Kit sample" page per block group (grouped by each block.json's
\`category\`), with content built from that block's \`example.attributes\`,
plus a private "Styleguide" page on the styleguide template. Idempotent by page
slug (safe to re-run).

Options:
  --blocks-dir DIR             Directory to scan for */block.json
                                (default: <theme>/resources/blocks)
  --styleguide-template FILE   _wp_page_template value for the style guide
                                page (default: template-styleguide.blade.php)
  -h, --help                   Show this help

Local WordPress only (refuses to run against a non-local siteurl).
EOF
}

upsert_page() {
  local slug="$1" title="$2" content="$3" template="${4:-}" status="${5:-}" id

  # --name is ignored once --post_status=any is set, so match the slug here.
  # any is needed to find a private page again on a re-run.
  id="$("${WP[@]}" post list --post_type=page --post_status=any --fields=ID,post_name --format=csv 2>/dev/null |
    awk -F, -v slug="$slug" '$2 == slug { print $1; exit }')"

  if [[ -n "$id" ]]; then
    "${WP[@]}" post update "$id" --post_title="$title" --post_content="$content" \
      ${status:+--post_status="$status"} >/dev/null
    echo "updated: $title (#$id)"
  else
    id="$("${WP[@]}" post create --post_type=page --post_status="${status:-publish}" \
      --post_title="$title" --post_name="$slug" --post_content="$content" --porcelain)"
    echo "created: $title (#$id)"
  fi

  if [[ -n "$template" ]]; then
    "${WP[@]}" post meta update "$id" _wp_page_template "$template" >/dev/null
  fi
}

main() {
  local blocks_dir="$THEME_ROOT/resources/blocks"
  local styleguide_template="template-styleguide.blade.php"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --blocks-dir) blocks_dir="$2"; shift 2 ;;
      --styleguide-template) styleguide_template="$2"; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
    esac
  done

  require_local_wp
  require_php

  if [[ ! -d "$blocks_dir" ]]; then
    echo "error: blocks dir not found: $blocks_dir" >&2
    exit 1
  fi

  # A record's fields can hold arbitrary bytes (including embedded NULs, via
  # base64), which bash command substitution can't carry reliably — piping
  # into `< <(...)` used to hide a php failure from `set -e` entirely.  A
  # temp file gets both: an explicit exit-code check and byte-safe records.
  local records_file
  records_file="$(mktemp)"
  trap 'rm -f "$records_file"' RETURN

  if ! php "$SCRIPT_DIR/sample-pages-blocks.php" "$blocks_dir" > "$records_file"; then
    echo "error: sample-pages-blocks.php failed" >&2
    exit 1
  fi

  local slug title markup_b64 made=0
  # fd 3: lando reads stdin, and on stdin it would swallow the remaining records.
  while IFS=$'\x1f' read -r -u 3 -d '' slug title markup_b64; do
    upsert_page "$slug" "$title" "$(printf '%s' "$markup_b64" | base64 --decode)"
    made=$((made + 1))
  done 3< "$records_file"

  upsert_page "styleguide" "Styleguide" "" "$styleguide_template" private

  echo "sample-pages: $made block-group page(s) + the style guide page."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
