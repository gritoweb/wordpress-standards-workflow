#!/usr/bin/env bash
# Imports every image directly inside a folder into the media library.
# Local WordPress only. Run via `lando wp` from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: media-import.sh <folder>

Imports every image file (jpg, jpeg, png, gif, webp, svg) directly inside
<folder> into the media library via `wp media import`.

Local WordPress only (refuses to run against a non-local siteurl).
EOF
}

# WordPress derives a new attachment's post_name from its file name the same
# way it derives any post slug: lowercase, non-alphanumerics collapsed to a
# single hyphen. Good enough to recognize the same file on a second run;
# it doesn't need to reproduce sanitize_title()'s unicode remapping.
slugify() {
  local base="${1%.*}"
  base="$(tr '[:upper:]' '[:lower:]' <<< "$base")"
  sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' <<< "$base"
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    "") echo "error: missing <folder>" >&2; usage >&2; exit 1 ;;
  esac

  local folder="$1"
  if [[ ! -d "$folder" ]]; then
    echo "error: not a directory: $folder" >&2
    exit 1
  fi

  # `wp media import` runs inside the Lando container, which only sees the
  # project root's own tree — never a host path outside it. These scripts
  # are documented to run from the project root, so that root is $PWD.
  local abs_folder abs_root
  abs_folder="$(cd "$folder" && pwd)"
  abs_root="$(pwd)"
  case "$abs_folder" in
    "$abs_root") folder="." ;;
    "$abs_root"/*) folder="${abs_folder#"$abs_root"/}" ;;
    *)
      echo "error: $folder is outside the project root ($abs_root). Run this script from the project root and pass a folder under it." >&2
      exit 1
      ;;
  esac

  require_local_wp

  shopt -s nullglob nocaseglob
  local all_files=("$folder"/*.jpg "$folder"/*.jpeg "$folder"/*.png "$folder"/*.gif "$folder"/*.webp "$folder"/*.svg)
  shopt -u nullglob nocaseglob

  if [[ ${#all_files[@]} -eq 0 ]]; then
    echo "media-import: no images found in $folder"
    exit 0
  fi

  # Idempotent: skip a file whose basename is already an attachment, so a
  # second run doesn't duplicate every image in the library.
  local files=() skipped=0 file slug existing
  for file in "${all_files[@]}"; do
    slug="$(slugify "$(basename "$file")")"
    existing="$("${WP[@]}" post list --post_type=attachment --post_status=inherit --name="$slug" --field=ID --posts_per_page=1 2>/dev/null | head -n1)"
    if [[ -n "$existing" ]]; then
      skipped=$((skipped + 1))
    else
      files+=("$file")
    fi
  done

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "media-import: no new images to import from $folder ($skipped already present)"
    exit 0
  fi

  "${WP[@]}" media import "${files[@]}"
  echo "media-import: imported ${#files[@]} file(s) from $folder ($skipped already present)"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
