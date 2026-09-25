/**
 * The scroll cue: a button that eases to the next section rather than moving a
 * fixed distance, so it stays correct whatever block sits underneath. A block
 * wires its own markup to the data-attribute contract below; this file knows
 * no block's class names.
 *
 * Contract:
 *   [data-scroll-cue]                    a <button> inside the section it
 *                                        leaves. It ships `hidden`; this
 *                                        script reveals it only once a next
 *                                        section exists, and removes it
 *                                        otherwise.
 *     data-scroll-header-selector        the sticky header, default ".header"
 *
 * The landing point is offset by the fixed chrome actually on screen (the
 * WordPress admin bar, a sticky header), measured at click time. Focus moves
 * to the target so a keyboard user continues from where they landed.
 * prefers-reduced-motion turns the glide into a jump.
 */
(function () {
  if (window.__PREFIX__ScrollCue) {
    return;
  }

  window.__PREFIX__ScrollCue = true;

  // Walk past anything with no box of its own, so the cue lands on real
  // content rather than on a wrapper that happens to be next in the DOM.
  function findTarget(section) {
    var target = section.nextElementSibling;

    while (target && target.getBoundingClientRect().height === 0) {
      target = target.nextElementSibling;
    }

    return target;
  }

  function fixedOffset(button) {
    var offset = 0;
    var adminBar = document.getElementById("wpadminbar");

    if (adminBar) {
      offset += adminBar.getBoundingClientRect().height;
    }

    var header = document.querySelector(
      button.getAttribute("data-scroll-header-selector") || ".header",
    );

    if (header) {
      var position = window.getComputedStyle(header).position;

      // Anything fixed or sticky at the top of the viewport would otherwise
      // cover the top of the target.
      if (position === "fixed" || position === "sticky") {
        offset += header.getBoundingClientRect().height;
      }
    }

    return offset;
  }

  function bindCue(button) {
    var section = button.closest("section");
    var target = section ? findTarget(section) : null;

    if (!target) {
      button.remove();
      return;
    }

    button.hidden = false;

    button.addEventListener("click", function () {
      var top =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        fixedOffset(button);
      var reduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });

      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }

      target.focus({ preventScroll: true });
    });
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-scroll-cue]"),
      bindCue,
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // A test sets window.__PREFIX__TestHooks before it loads this file, to reach
  // the internals. A page never does, so nothing is left on window.
  if (window.__PREFIX__TestHooks) {
    window.__PREFIX__TestHooks.scrollCue = {
      bindCue: bindCue,
      findTarget: findTarget,
    };
  }
})();
