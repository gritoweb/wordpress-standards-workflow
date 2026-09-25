import { __ } from "@wordpress/i18n";
import { ctaIconClass } from "./ActionEditor.jsx";
import { ctaButtonClass } from "./ground.js";

/**
 * What the canvas button preview reads (CTA-3): the label when both parts are
 * set, "Complete button" when one is, "Add button" when neither is.
 */
export function ctaPreviewLabel(text, link) {
  const hasText = Boolean(text);
  const hasUrl = Boolean(link?.url);

  if (hasText && hasUrl) return text;
  if (hasText || hasUrl) return __("Complete button", "__TEXT_DOMAIN__");

  return __("Add button", "__TEXT_DOMAIN__");
}

/**
 * The canvas preview of a section button: a span with the front end's
 * classes that never navigates. Hidden when the button is empty and the block
 * isn't selected. Extra props (entrancePartProps) go on the span.
 *
 * @param {object}  props
 * @param {string}  props.text
 * @param {object}  props.link
 * @param {string}  props.icon
 * @param {string}  props.iconPosition
 * @param {string}  props.ground
 * @param {string}  props.tone        Optional text-tone override for a photo backdrop.
 * @param {boolean} props.isSelected
 */
export function CtaPreview({
  text,
  link,
  icon,
  iconPosition,
  ground = "",
  tone = null,
  isSelected = false,
  className = "",
  style,
  ...rest
}) {
  if (!text && !link?.url && !isSelected) return null;

  return (
    <span
      {...rest}
      role="group"
      aria-label={__("Button preview", "__TEXT_DOMAIN__")}
      className={`btn ${ctaButtonClass(ground, tone)} ${ctaIconClass(icon, iconPosition)} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
      style={{ ...style, pointerEvents: "none" }}
    >
      {ctaPreviewLabel(text, link)}
    </span>
  );
}
