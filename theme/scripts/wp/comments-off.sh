#!/usr/bin/env bash
# Turns WordPress comments off entirely: closes future comments/pings by
# default and closes comments/pings on every existing post. Idempotent.
# Local WordPress only. Run via `lando wp` from the project root.
# See CLAUDE.md > WordPress Settings.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: comments-off.sh

Sets default_comment_status and default_ping_status to "closed", then
closes comments and pings on every existing post across every post type.
Idempotent.

Local WordPress only (refuses to run against a non-local siteurl).
EOF
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    "") ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac

  require_local_wp

  "${WP[@]}" option update default_comment_status closed >/dev/null
  "${WP[@]}" option update default_ping_status closed >/dev/null

  # `any` post_type defaults to post_status=publish (drafts, private and
  # scheduled posts keep comment_status=open) and `any` itself excludes
  # attachments, whose status is `inherit` — a second pass covers those.
  local ids attachment_ids
  ids="$("${WP[@]}" post list --post_type=any --post_status=any --format=ids)"
  attachment_ids="$("${WP[@]}" post list --post_type=attachment --post_status=inherit --format=ids)"
  ids="$(printf '%s %s' "$ids" "$attachment_ids" | xargs)"
  if [[ -n "$ids" ]]; then
    # Word-split on purpose: wp-cli takes one ID per positional argument.
    # shellcheck disable=SC2086
    "${WP[@]}" post update $ids --comment_status=closed --ping_status=closed >/dev/null
  fi

  echo "comments-off: default statuses closed; existing posts closed."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
