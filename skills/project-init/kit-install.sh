#!/usr/bin/env bash
# Copies the kit into a Sage theme in one run, never overwriting a file or editing Sage's own; see SKILL.md › kit-install.sh.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: kit-install.sh --theme <path> --namespace <ns> --text-domain <td> [--theme-slug <slug>] [--pantheon] [--wp "lando wp"]

  --theme        Sage theme root (wp-content/themes/<theme>)
  --namespace    block namespace (kit.config / create-block check 0.1)
  --text-domain  the theme's Text Domain
  --theme-slug   theme folder name (default: basename of --theme)
  --pantheon     also copy mu-plugins/acorn-pantheon-storage.php
  --wp CMD       run the WordPress steps with CMD (e.g. "lando wp"), from the
                 directory where CMD works: clear install defaults, check the
                 counts, create the private Styleguide page
EOF
}

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
THEME="" NS="" TD="" SLUG="" PANTHEON=0 WP=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --theme) THEME="$2"; shift 2 ;;
    --namespace) NS="$2"; shift 2 ;;
    --text-domain) TD="$2"; shift 2 ;;
    --theme-slug) SLUG="$2"; shift 2 ;;
    --pantheon) PANTHEON=1; shift ;;
    --wp) WP="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done
[[ -n "$THEME" && -n "$NS" && -n "$TD" ]] || { usage >&2; exit 1; }
[[ -f "$THEME/style.css" && -f "$THEME/functions.php" ]] || { echo "error: $THEME is not a Sage theme root" >&2; exit 1; }
THEME="$(cd "$THEME" && pwd)"
SLUG="${SLUG:-$(basename "$THEME")}"

COPIED=() SKIPPED=()

fill() {
  sed -i "s#__TEXT_DOMAIN__#${TD}#g; s#__BLOCK_NAMESPACE__#${NS}#g; s#__THEME_SLUG__#${SLUG}#g" "$1"
}

# Copies one file unless the target exists; fills the placeholders.
put() {
  local src="$1" dest="$THEME/$2"
  if [[ -e "$dest" ]]; then SKIPPED+=("$2"); return; fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  [[ "$dest" == *.svg ]] || fill "$dest"
  COPIED+=("$2")
}

# Copies a folder file by file, so existing files are kept and listed.
put_dir() {
  local src="$1" dest="$2" file
  while IFS= read -r -d '' file; do
    put "$file" "$dest/${file#"$src"/}"
  done < <(find "$src" -type f -print0)
}

# Replaces a Sage stock file only while it is still stock (it carries the marker).
put_over_stock() {
  local src="$1" rel="$2" marker="$3" dest="$THEME/$2"
  if [[ -e "$dest" ]] && ! grep -qF "$marker" "$dest"; then SKIPPED+=("$rel (not Sage's stock)"); return; fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  fill "$dest"
  COPIED+=("$rel")
}

# project-init Phase 1
put "$KIT/CLAUDE.md" CLAUDE.md
for skill in create-block html-qa-smoketest css-standards css-foundation-wizard blade-standards project-init fotos site-settings-wizard figma-design-system; do
  put_dir "$KIT/skills/$skill" ".claude/skills/$skill"
done
put_dir "$KIT/docs/examples" docs/examples
for doc in launch-list kit-log site-settings-pattern editor-fidelity-checklist; do
  put "$KIT/docs/$doc.md" "docs/$doc.md"
done
put "$KIT/gitignore.example" .gitignore
put "$KIT/prettier.config.example.js" prettier.config.js
put "$KIT/prettierignore.example" .prettierignore
put "$KIT/install-git-hooks.example.mjs" scripts/install-git-hooks.mjs
if (( PANTHEON )); then
  mu="$THEME/../../mu-plugins/acorn-pantheon-storage.php"
  if [[ -e "$mu" ]]; then SKIPPED+=("wp-content/mu-plugins/acorn-pantheon-storage.php"); else mkdir -p "$(dirname "$mu")"; cp "$KIT/mu-plugins/acorn-pantheon-storage.php" "$mu"; COPIED+=("wp-content/mu-plugins/acorn-pantheon-storage.php"); fi
fi

# create-block Phase 0 files (the Sage wiring stays with the agent)
T="$KIT/skills/create-block/templates"
for f in BlockManager BlockCategories BlockPadding BlockImagePosition BlockEntrance BlockMotion; do put "$T/$f.php" "app/Blocks/$f.php"; done
put "$T/blocks.php" app/blocks.php
put "$T/entrance.css" resources/css/components/entrance.css
put "$T/hover.css" resources/css/components/hover.css
put "$T/entrance.js" resources/js/modules/entrance.js
put "$T/editor-fidelity.mjs" scripts/editor-fidelity.mjs
put "$T/button-link.blade.php" resources/views/components/button-link.blade.php
put_dir "$T/components/backend" resources/blocks/components/backend
put "$KIT/skills/css-foundation-wizard/templates/check-css-foundation.mjs" scripts/check-css-foundation.mjs

# project-init Phase 1c: header, footer, navigation, front page
P="$KIT/skills/project-init/templates"
put_over_stock "$P/header.blade.php" resources/views/sections/header.blade.php 'class="banner"'
put_over_stock "$P/footer.blade.php" resources/views/sections/footer.blade.php "dynamic_sidebar('sidebar-footer')"
put "$P/navigation.js" resources/js/modules/navigation.js
put "$P/front-page.blade.php" resources/views/front-page.blade.php

# css-foundation-wizard Step 9: the Styleguide page's template and composer
W="$KIT/skills/css-foundation-wizard/templates"
put "$W/template-styleguide.blade.php" resources/views/template-styleguide.blade.php
put "$W/StyleGuide.php" app/View/Composers/StyleGuide.php

echo "kit-install: copied ${#COPIED[@]} file(s)."
if (( ${#SKIPPED[@]} )); then
  echo "Already there, left untouched (compare with the kit and decide):"
  printf '  %s\n' "${SKIPPED[@]}"
fi

# A placeholder left in a copied file breaks it at runtime.
left=$(for f in "${COPIED[@]}"; do [[ -f "$THEME/$f" && "$f" != .claude/* && "$f" != docs/* ]] && grep -lE '__(TEXT_DOMAIN|BLOCK_NAMESPACE|THEME_SLUG)__' "$THEME/$f" 2>/dev/null; done || true)
if [[ -n "$left" ]]; then echo "error: placeholders left in:" >&2; echo "$left" >&2; exit 1; fi

[[ -z "$WP" ]] && exit 0
read -ra WPC <<< "$WP"

# project-init › Clear install defaults (after the theme is active)
"${WPC[@]}" widget reset --all >/dev/null
"${WPC[@]}" option update default_comment_status closed >/dev/null
"${WPC[@]}" option update default_ping_status closed >/dev/null
"${WPC[@]}" comment list --format=ids | tr -d '\r' | xargs -r "${WPC[@]}" comment delete --force >/dev/null
"${WPC[@]}" post list --post_type=any --post_status=any --comment_status=open --format=ids | tr -d '\r' \
  | xargs -r "${WPC[@]}" post update --comment_status=closed --ping_status=closed >/dev/null

# project-init Phase 1b step 4: the private Styleguide page, created once
if ! "${WPC[@]}" post list --post_type=page --name=styleguide --post_status=any --format=ids | tr -d '\r' | grep -q .; then
  "${WPC[@]}" post create --post_type=page --post_status=private --post_title='Styleguide' --post_name=styleguide \
    --meta_input='{"_wp_page_template":"template-styleguide.blade.php"}' >/dev/null
fi

fail=0
for check in "widget list sidebar-primary" "widget list sidebar-footer" "post list --post_type=any --post_status=any --comment_status=open"; do
  read -ra args <<< "$check"
  n=$("${WPC[@]}" "${args[@]}" --format=count | tr -d '\r')
  echo "  $check: $n"
  [[ "$n" == "0" ]] || fail=1
done
# wp-cli's --field comes back empty with --name, so read the status by ID.
id=$("${WPC[@]}" post list --post_type=page --name=styleguide --post_status=any --format=ids | tr -d '\r')
status=$([[ -n "$id" ]] && "${WPC[@]}" post get "$id" --field=post_status | tr -d '\r' || true)
echo "  styleguide page: ${status:-missing}"
[[ "$status" == "private" ]] || fail=1
exit "$fail"
