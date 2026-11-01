#!/usr/bin/env bash
# Shared helpers for the kit's local-only wp-cli scripts (scripts/wp/*.sh).
# Sourced by each script, never run directly.

# wp-cli invocation, overridable via WP_CLI (space-separated) for tests.
# Default assumes these scripts run from the project root, where Lando's
# own `wp` wrapper proxies into the container.
read -ra WP <<< "${WP_CLI:-lando wp}"

# True (exit 0) when $1 is a *.lndo.site or localhost siteurl.
is_local_siteurl() {
  [[ "$1" =~ ^https?://([a-zA-Z0-9-]+\.)*lndo\.site(:[0-9]+)?(/.*)?$ ]] \
    || [[ "$1" =~ ^https?://localhost(:[0-9]+)?(/.*)?$ ]]
}

# Exits with an error unless the current wp-cli target's siteurl is local.
# Every script in this folder calls this before touching anything.
require_local_wp() {
  local url

  if ! url="$("${WP[@]}" option get siteurl 2>/dev/null)"; then
    echo "error: could not reach wp-cli (${WP[*]} option get siteurl failed)" >&2
    exit 1
  fi

  if ! is_local_siteurl "$url"; then
    echo "error: refusing to run against a non-local site ($url). These scripts are local-only." >&2
    exit 1
  fi
}

# Exits with a clear error unless `php` is on the host PATH. Lando only
# guarantees PHP inside the container; a script that also needs to run PHP
# on the host (to parse wp-cli's JSON output, for example) calls this first
# so a missing host PHP fails loudly instead of silently skipping work.
require_php() {
  if ! command -v php >/dev/null 2>&1; then
    echo "error: php not found on the host PATH. Install PHP locally, or run this script from inside \`lando ssh\`." >&2
    exit 1
  fi
}
