import { InspectorControls } from '@wordpress/block-editor';
import {
  Button,
  PanelBody,
  SelectControl,
  TextControl,
} from '@wordpress/components';
import {
  DIRECTIONS,
  LIMITS,
  TRIGGERS,
  TYPES,
  UNITS,
  resolveEntrance,
} from './entranceCanvas.js';

// What Site Settings > Motion falls back to, shown greyed in an empty field.
const SITE_DEFAULTS = { distance: 32, duration: 600, delay: 0, stagger: 120 };

// The values live in entranceCanvas.js; only the labels are the panel's own.
const TYPE_LABELS = {
  none: 'None',
  fade: 'Fade',
  slide: 'Slide',
  'fade-slide': 'Fade and slide',
};
// The value is the direction of travel (decision A19); the label says where
// the part enters from.
const DIRECTION_LABELS = {
  up: 'From below',
  down: 'From above',
  left: 'From the right',
  right: 'From the left',
};
const TRIGGER_LABELS = {
  section: 'All together, staggered',
  item: 'Each item as it scrolls in',
};
const options = (values, labels = {}) =>
  values.map((value) => ({ label: labels[value] ?? value, value }));
const TYPE_OPTIONS = options(TYPES, TYPE_LABELS);
const DIRECTION_OPTIONS = options(DIRECTIONS, DIRECTION_LABELS);
const TRIGGER_OPTIONS = options(TRIGGERS, TRIGGER_LABELS);
const UNIT_OPTIONS = options(UNITS);

// '' clears the field (null: use the site default); anything else is clamped.
function toNumber(raw, key) {
  if (raw === '' || raw === null || Number.isNaN(Number(raw))) return null;
  const [min, max] = LIMITS[key];

  return Math.max(min, Math.min(max, Math.round(Number(raw))));
}

// The cleanup of the replay in flight, per block root.
const replaying = new WeakMap();

// Plays a block's entrance once on the canvas, on that block alone. The replay
// hook (data-entrance-replay on the root) hides the block's own parts without
// a document-wide class, and the reveal is the one the visitor module runs:
// data-entered on the root for the section trigger, on each part for the item
// trigger. A visitor gets no stagger with the item trigger, so each part's
// index is zeroed for the replay and put back afterwards. `win` is injectable
// for tests.
export function replayEntrance(doc, clientId, win = globalThis) {
  const root = doc?.querySelector(
    `[data-block="${clientId}"] [data-entrance], [data-block="${clientId}"][data-entrance]`,
  );
  if (!root) return;

  // A second Preview must not capture the first one's temporary zero indexes.
  replaying.get(root)?.();

  const item = root.getAttribute('data-entrance-trigger') === 'item';
  const parts = item ? [...root.querySelectorAll('[data-entrance-part]')] : [];
  const indexes = parts.map((part) => part.style.getPropertyValue('--e-i'));

  root.setAttribute('data-entrance-replay', '');
  root.removeAttribute('data-entered');
  parts.forEach((part) => {
    part.removeAttribute('data-entered');
    part.style.setProperty('--e-i', '0');
  });
  void root.offsetWidth; // forces the reflow that restarts the transition
  if (item) parts.forEach((part) => part.setAttribute('data-entered', ''));
  else root.setAttribute('data-entered', '');

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    replaying.delete(root);
    root.removeAttribute('data-entrance-replay');
    root.setAttribute('data-entered', '');
    parts.forEach((part, at) =>
      indexes[at]
        ? part.style.setProperty('--e-i', indexes[at])
        : part.style.removeProperty('--e-i'),
    );
  };
  replaying.set(root, cleanup);
  win.setTimeout(cleanup, 4000);
}

// The block's own default entrance, so a partial saved object resolves as it
// does on the canvas and the page. Reading the registry writes nothing. It goes
// through the wp.data global because the block test bundles have no
// @wordpress/data to resolve.
function blockPreset(clientId) {
  const select = globalThis.wp?.data?.select;
  if (!select) return {};
  const name = select('core/block-editor').getBlockName(clientId);

  return (
    (name &&
      select('core/blocks').getBlockType(name)?.attributes?.entrance
        ?.default) ||
    {}
  );
}

function canvasDocument() {
  return (
    document.querySelector('iframe[name="editor-canvas"]')?.contentDocument ??
    document
  );
}

/**
 * The "Entrance animation" inspector panel. Mount it once at the end of a
 * block's <InspectorControls> siblings; it renders its own InspectorControls.
 *
 * Props:
 * - attributes, setAttributes: the block's. Reads attributes.entrance. A change
 *   writes the existing object with the one changed key, and nothing writes on
 *   mount, selection or opening the panel.
 * - clientId: the block's client ID, so Preview can find its canvas root. The
 *   root must carry data-entrance and data-entered in block.jsx.
 * - preset (optional): the block's default entrance. Defaults to the one
 *   registered in block.json.
 * - singlePart (default false): hides Stagger for a block with one part. The
 *   item trigger hides it too; the saved value stays for switching back.
 * - siteDefaults (optional): { distance, duration, delay, stagger } shown as the
 *   placeholder while a field is null.
 * - onPreview (optional): replaces the default canvas replay.
 */
export function EntranceControl({
  attributes,
  setAttributes,
  value,
  onChange,
  clientId,
  preset,
  singlePart = false,
  siteDefaults = {},
  onPreview,
}) {
  // `saved` is what gets written back; `entrance` is what the block shows.
  // Supports both { attributes, setAttributes } and { value, onChange } seamlessly.
  const saved = attributes?.entrance ?? value ?? {};
  const entrance = resolveEntrance(saved, preset ?? blockPreset(clientId));
  const defaults = { ...SITE_DEFAULTS, ...siteDefaults };
  const type = entrance.type;
  const slides = type === 'slide' || type === 'fade-slide';

  const write = (key, val) => {
    const next = { ...saved, [key]: val };
    if (setAttributes) {
      setAttributes({ entrance: next });
    }
    if (onChange) {
      onChange(next);
    }
  };
  const numberField = (key, label) => (
    <TextControl
      __nextHasNoMarginBottom
      label={label}
      type="number"
      min={LIMITS[key][0]}
      max={LIMITS[key][1]}
      value={entrance[key] ?? ''}
      placeholder={String(defaults[key])}
      onChange={(raw) => write(key, toNumber(raw, key))}
    />
  );
  return (
    <InspectorControls>
      <PanelBody title="Entrance animation" initialOpen={false}>
        <SelectControl
          __nextHasNoMarginBottom
          label="Type"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(value) => write('type', value)}
        />

        {type !== 'none' && (
          <>
            <div style={{ marginTop: '16px' }}>
              <SelectControl
                __nextHasNoMarginBottom
                label="Trigger"
                value={entrance.trigger}
                options={TRIGGER_OPTIONS}
                onChange={(value) => write('trigger', value)}
              />
            </div>

            {slides && (
              <div style={{ marginTop: '16px' }}>
                <SelectControl
                  __nextHasNoMarginBottom
                  label="Direction"
                  value={entrance.direction}
                  options={DIRECTION_OPTIONS}
                  onChange={(value) => write('direction', value)}
                />

                <div
                  style={{ display: 'grid', gap: '16px', marginTop: '16px' }}
                >
                  {numberField('distance', 'Distance')}
                  <SelectControl
                    __nextHasNoMarginBottom
                    label="Unit"
                    value={entrance.unit}
                    options={UNIT_OPTIONS}
                    onChange={(value) => write('unit', value)}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
              {numberField('duration', 'Duration (ms)')}
              {numberField('delay', 'Delay (ms)')}
              {!singlePart &&
                entrance.trigger !== 'item' &&
                numberField('stagger', 'Stagger (ms)')}
            </div>

            <Button
              variant="secondary"
              style={{ marginTop: '16px' }}
              onClick={() =>
                (
                  onPreview ??
                  (() => replayEntrance(canvasDocument(), clientId))
                )()
              }
            >
              Preview
            </Button>
          </>
        )}
      </PanelBody>
    </InspectorControls>
  );
}
