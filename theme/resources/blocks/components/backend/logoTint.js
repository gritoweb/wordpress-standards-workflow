// Twin of BlockLogos::tintClass() in PHP. A single-color mark is redrawn dark
// on a light ground and light on a dark one; a multi-color mark is left
// alone. The CSS lives in resources/css/global/helpers.css.
export function logoTintClass(singleColor, lightGround) {
  if (!singleColor) return "";

  return lightGround ? "logo-tint-dark" : "logo-tint-light";
}
