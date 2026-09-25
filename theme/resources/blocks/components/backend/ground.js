// One entry per kit.config.json `grounds` array item — the config is the
// only source of ground names (see docs/install.md "Per-project config"), so nothing
// here is project-specific. BlockAttributes.php reads the same file at
// render time; ground.test.mjs asserts the two agree.
import config from "../../../../kit.config.json";

function groundLabel(name) {
  return name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const GROUNDS = (config.grounds ?? []).map(({ name, token, light }) => ({
  value: name,
  label: groundLabel(name),
  background: `var(${token})`,
  light: Boolean(light),
}));

export const GROUND_OPTIONS = GROUNDS.map(({ value, label }) => ({
  value,
  label,
}));

// Twin of BlockAttributes::groundClass() in PHP. An unknown/stale value
// (a ground removed from kit.config.json since the block was saved) prints
// no class, the same as the PHP side.
export function groundClass(ground) {
  if (!GROUNDS.some((entry) => entry.value === ground)) return "";
  return isLightGround(ground)
    ? `ground-${ground}`
    : `ground-${ground} on-dark`;
}

// '' (no ground chosen) and an unknown/stale ground both mean "the normal
// page," which is light — not dark. Only a ground actually configured with
// light: false counts as dark.
export function isLightGround(ground) {
  return GROUNDS.find((entry) => entry.value === ground)?.light ?? true;
}

// Twin of BlockAttributes::ctaButtonClass() in PHP.
export function ctaButtonClass(ground, tone = null) {
  const isLight = tone !== null ? tone !== "light" : isLightGround(ground);
  return isLight ? "btn-primary" : "btn-on-dark";
}
