import { AutoGrowingTextarea } from "./AutoGrowingTextarea.jsx";
import {
  EDITOR_FIELD,
  EDITOR_TYPE,
  fieldLabel,
  fieldToneClass,
} from "./editorCanvas.js";

/**
 * A plain-string canvas field (TEXT-1, TEXT-4, TEXT-5, CANVAS-12): an
 * auto-growing textarea with the shared reset, its own text and placeholder
 * color, and an aria-label that names its position when it repeats.
 *
 * @param {object}  props
 * @param {string}  props.label     The aria-label ("Entry heading").
 * @param {number}  props.position  Zero-based index in a repeater, if any.
 * @param {boolean} props.onDark    On a dark ground or a photo.
 * @param {string}  props.value
 * @param {Function} props.onChange Receives the string, not the event.
 */
export function InlineField({
  label,
  position,
  onDark = false,
  value,
  onChange,
  className = "",
  ...rest
}) {
  return (
    <AutoGrowingTextarea
      {...rest}
      aria-label={fieldLabel(label, position)}
      value={value || ""}
      onChange={onChange}
      className={`${EDITOR_FIELD} ${fieldToneClass(onDark)} ${className}`.trim()}
    />
  );
}

// forms.css styles every textarea in @layer components, which beats the
// heading ramp in @layer base, so a heading field would draw in the body font
// at the input weight. The field states its level's face itself; the tier
// only compresses the size. A modifier that sets its own weight
// (`heading-regular`) keeps it.
// Written out in full: Tailwind only generates classes it finds in source.
const HEADING_WEIGHT = {
  1: "font-[weight:var(--text-h1--font-weight)]",
  2: "font-[weight:var(--text-h2--font-weight)]",
  3: "font-[weight:var(--text-h3--font-weight)]",
  4: "font-[weight:var(--text-h4--font-weight)]",
  5: "font-[weight:var(--text-h5--font-weight)]",
  6: "font-[weight:var(--text-h6--font-weight)]",
};

function headingFace(headingClass, className) {
  const level = /\bheading-([1-6])\b/.exec(headingClass)?.[1];
  if (!level) return "";
  if (/\bheading-regular\b/.test(className)) return "font-display";

  return `font-display ${HEADING_WEIGHT[level]}`;
}

/**
 * An InlineField at a heading tier: the front end's heading class paired with
 * a tier from EDITOR_TYPE (CANVAS-4).
 *
 * @param {string} props.tier          'statement' | 'section' | 'entry' | 'cardTitle'.
 * @param {string} props.headingClass  The front-end class, for example 'heading-2'.
 */
export function InlineHeading({
  tier = "section",
  headingClass = "heading-2",
  className = "",
  ...props
}) {
  return (
    <InlineField
      {...props}
      className={`${headingClass} ${EDITOR_TYPE[tier]} ${headingFace(headingClass, className)} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
    />
  );
}
