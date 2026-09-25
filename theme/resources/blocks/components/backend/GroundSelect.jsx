import { SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { GROUND_OPTIONS } from "./ground.js";

/**
 * The ground options with Default first. '' is a real value (the normal
 * page), so a block on it shows Default as selected (INSP-6).
 */
export const groundOptions = () => [
  { label: __("Default", "__TEXT_DOMAIN__"), value: "" },
  ...GROUND_OPTIONS,
];

export function GroundSelect({
  value,
  onChange,
  label = __("Ground", "__TEXT_DOMAIN__"),
  ...rest
}) {
  return (
    <SelectControl
      {...rest}
      label={label}
      value={value || ""}
      options={groundOptions()}
      onChange={onChange}
    />
  );
}
