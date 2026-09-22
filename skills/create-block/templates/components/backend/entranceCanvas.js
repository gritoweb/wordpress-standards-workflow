// The data attributes the front-end @entrance and @entrancePart directives
// print, for a block's canvas composition. The root is always data-entered so
// the canvas is visible at rest; EntranceControl's Preview removes and re-adds
// it to replay.
export const UNITS = ['px', 'vw'];
export const TYPES = ['none', 'fade', 'slide', 'fade-slide'];
export const DIRECTIONS = ['up', 'down', 'left', 'right'];
export const TRIGGERS = ['section', 'item'];
export const LIMITS = {
  distance: [0, 2000],
  duration: [0, 3000],
  delay: [0, 3000],
  stagger: [0, 1000],
};
const CUSTOM_PROPERTIES = {
  distance: '--e-distance',
  duration: '--e-duration',
  delay: '--e-delay',
  stagger: '--e-stagger',
};

const pick = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;

function clamp(value, [min, max]) {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }

  return Math.max(min, Math.min(max, Math.round(Number(value))));
}

// Same result as BlockEntrance::sanitize over the block's preset. A key the
// saved object leaves out takes the preset; an explicit null stays null.
export function resolveEntrance(saved, preset) {
  const raw = {
    ...preset,
    ...(saved && typeof saved === 'object' && !Array.isArray(saved)
      ? saved
      : {}),
  };
  const resolved = {
    type: pick(raw.type, TYPES, 'fade-slide'),
    direction: pick(raw.direction, DIRECTIONS, 'up'),
    unit: pick(raw.unit, UNITS, 'px'),
    trigger: pick(raw.trigger, TRIGGERS, 'section'),
  };
  for (const key of Object.keys(LIMITS)) {
    resolved[key] = clamp(raw[key], LIMITS[key]);
  }

  return resolved;
}

// Props for the canvas root; {} when the type is none.
export function entranceRootProps(entrance) {
  if (entrance.type === 'none') return {};

  const style = {};
  for (const [key, property] of Object.entries(CUSTOM_PROPERTIES)) {
    if (entrance[key] === null) continue;
    style[property] =
      key === 'distance'
        ? `${entrance.distance}${entrance.unit}`
        : `${entrance[key]}ms`;
  }

  return {
    'data-entrance': entrance.type,
    'data-entrance-dir': entrance.direction,
    ...(entrance.trigger === 'item' && { 'data-entrance-trigger': 'item' }),
    'data-entered': '',
    ...(Object.keys(style).length ? { style } : {}),
  };
}

// Props for one part. Index 0 carries no custom property, as on the front end.
export function entrancePartProps(entrance, index = 0) {
  if (entrance.type === 'none') return {};

  return {
    'data-entrance-part': '',
    ...(index > 0 ? { style: { '--e-i': index } } : {}),
  };
}
