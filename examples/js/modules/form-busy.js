/*
 * Gravity Forms submits every form over AJAX and marks the button busy
 * itself. Coming back with the back button restores the page from cache
 * mid-submit, so this clears a busy state that no request is running any
 * more.
 */
export function initFormBusy() {
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      document
        .querySelectorAll('.gform_button[aria-busy]')
        .forEach((button) => button.removeAttribute('aria-busy'));
    }
  });
}

/*
 * Gravity Forms focuses the FIRST [data-js="gform-focus-validation-error"] on
 * the page, not the one in the form that just rendered. With a second form
 * elsewhere on the page, a second form's error would pull focus (and scroll)
 * away from the one a visitor just submitted. Every container outside the
 * rendered form is disarmed, and the form's own is focused after Gravity
 * Forms' deferred focus has run.
 */
export function initValidationFocus(jq = window.jQuery) {
  if (!jq) return;

  jq(document).on('gform_post_render', (event, formId) => {
    const own = document.querySelector(
      `#gform_wrapper_${formId} [data-js="gform-focus-validation-error"]`,
    );

    document
      .querySelectorAll('[data-js="gform-focus-validation-error"]')
      .forEach((container) => {
        if (container !== own) {
          container.removeAttribute('data-js');
          container.removeAttribute('autofocus');
        }
      });

    if (own) {
      setTimeout(() => own.focus(), 0);
    }
  });
}
