import { InspectorControls } from '@wordpress/block-editor';
import {
  Button,
  PanelBody,
  SelectControl,
  TextControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
  DIRECTIONS,
  LIMITS,
  TRIGGERS,
  TYPES,
  UNITS,
  resolveEntrance,
} from './entranceCanvas.js';

// Used only before Site Settings > Motion prints its values as window.__PREFIX__EntranceDefaults (app/site.php).
const FALLBACK_SITE_DEFAULTS = { distance: 32, duration: 1000, delay: 250, stagger: 250 };

function printedSiteDefaults() {
  return globalThis.__PREFIX__EntranceDefaults ?? FALLBACK_SITE_DEFAULTS;
}

// The values live in entranceCanvas.js; only the labels are the panel's own.
const typeLabels = () => ({
  none: __('None', '__TEXT_DOMAIN__'),
  fade: __('Fade', '__TEXT_DOMAIN__'),
  slide: __('Slide', '__TEXT_DOMAIN__'),
  'fade-slide': __('Fade and slide', '__TEXT_DOMAIN__'),
});
// The value is the direction of travel; the label says where the part enters from.
const directionLabels = () => ({
  up: __('From below', '__TEXT_DOMAIN__'),
  down: __('From above', '__TEXT_DOMAIN__'),
  left: __('From the right', '__TEXT_DOMAIN__'),
  right: __('From the left', '__TEXT_DOMAIN__'),
});
const triggerLabels = () => ({
  section: __('All together, staggered', '__TEXT_DOMAIN__'),
  item: __('Each item as it scrolls in', '__TEXT_DOMAIN__'),
});
const options = (values, labels = {}) =>
  values.map((value) => ({ label: labels[value] ?? value, value }));

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
  const defaults = { ...printedSiteDefaults(), ...siteDefaults };
  const TYPE_OPTIONS = options(TYPES, typeLabels());
  const DIRECTION_OPTIONS = options(DIRECTIONS, directionLabels());
  const TRIGGER_OPTIONS = options(TRIGGERS, triggerLabels());
  const UNIT_OPTIONS = options(UNITS);
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
      <PanelBody
        title={__('Entrance animation', '__TEXT_DOMAIN__')}
        initialOpen={false}
      >
        <SelectControl
          __nextHasNoMarginBottom
          label={__('Type', '__TEXT_DOMAIN__')}
          value={type}
          options={TYPE_OPTIONS}
          onChange={(value) => write('type', value)}
        />

        {type !== 'none' && (
          <>
            <div style={{ marginTop: '16px' }}>
              <SelectControl
                __nextHasNoMarginBottom
                label={__('Trigger', '__TEXT_DOMAIN__')}
                value={entrance.trigger}
                options={TRIGGER_OPTIONS}
                onChange={(value) => write('trigger', value)}
              />
            </div>

            {slides && (
              <div style={{ marginTop: '16px' }}>
                <SelectControl
                  __nextHasNoMarginBottom
                  label={__('Direction', '__TEXT_DOMAIN__')}
                  value={entrance.direction}
                  options={DIRECTION_OPTIONS}
                  onChange={(value) => write('direction', value)}
                />

                <div
                  style={{ display: 'grid', gap: '16px', marginTop: '16px' }}
                >
                  {numberField('distance', __('Distance', '__TEXT_DOMAIN__'))}
                  <SelectControl
                    __nextHasNoMarginBottom
                    label={__('Unit', '__TEXT_DOMAIN__')}
                    value={entrance.unit}
                    options={UNIT_OPTIONS}
                    onChange={(value) => write('unit', value)}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
              {numberField('duration', __('Duration (ms)', '__TEXT_DOMAIN__'))}
              {numberField('delay', __('Delay (ms)', '__TEXT_DOMAIN__'))}
              {!singlePart &&
                entrance.trigger !== 'item' &&
                numberField('stagger', __('Stagger (ms)', '__TEXT_DOMAIN__'))}
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
              {__('Preview', '__TEXT_DOMAIN__')}
            </Button>
          </>
        )}
      </PanelBody>
    </InspectorControls>
  );
}
