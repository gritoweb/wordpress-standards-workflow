const SELECTOR = '[data-entrance]';

// Any failure here must leave the page readable: dropping the class that
// hides the parts is the whole fallback.
function showEverything() {
  document.documentElement.classList.remove('entrance');
}

export function initEntrance() {
  try {
    // The head snippet gives up on its own if this attribute never appears.
    document.documentElement.setAttribute('data-entrance-ready', '');

    const sections = document.querySelectorAll(SELECTOR);
    if (!sections.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      showEverything();
      return;
    }

    // The observer only reports a threshold crossing, so a section that jumps
    // from below the viewport to above it in one frame is never delivered.
    // Sweep the sections still waiting for those.
    // With the item trigger the parts are what wait. The observer reads the
    // transformed rectangle, so a part the hidden state moved off screen is
    // never delivered; the sweep judges parts by layout position instead.
    const isItem = (section) =>
      section.getAttribute('data-entrance-trigger') === 'item';
    const observed = [...sections].filter((section) => !isItem(section));
    const itemParts = new Map(
      [...sections]
        .filter(isItem)
        .map((section) => [
          section,
          [...section.querySelectorAll('[data-entrance-part]')],
        ]),
    );
    const pending = new Set([...observed, ...[...itemParts.values()].flat()]);
    let queued = false;

    // transitionend is the fast path. It never fires when nothing changes
    // (reduced motion, a late bundle, identical states), so the part is also
    // released once its own declared time has passed. That time can be zero.
    const release = (part) => part.setAttribute('data-entrance-done', '');
    const releaseOnTiming = (part) => {
      const style = window.getComputedStyle(part);
      const ms = (list) =>
        list
          .split(',')
          .map((v) =>
            v.trim().endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000,
          );
      const delays = ms(style.transitionDelay);
      const total = Math.max(
        0,
        ...ms(style.transitionDuration).map(
          (duration, i) => duration + delays[i % delays.length],
        ),
      );
      if (total <= 0) release(part);
      else window.setTimeout(() => release(part), total + 50);
    };

    // A finished item section ends the hidden state for any part added later,
    // including a section that started with no parts at all.
    const finishSections = () => {
      for (const [section, parts] of itemParts) {
        if (parts.every((part) => part.hasAttribute('data-entered')))
          section.setAttribute('data-entered', '');
      }
    };

    // An item part animates on its own entry, so it takes no stagger index
    // and ignores the one printed in the markup.
    const enter = (target) => {
      const isPart = target.hasAttribute('data-entrance-part');
      if (isPart) target.style.setProperty('--e-i', '0');
      target.setAttribute('data-entered', '');
      pending.delete(target);
      if (observed.includes(target)) observer.unobserve(target);

      if (isPart) releaseOnTiming(target);
      else
        target
          .querySelectorAll('[data-entrance-part]')
          .forEach(releaseOnTiming);
      finishSections();
    };

    // Layout top in document space: offsetTop ignores transforms.
    const layoutTop = (node) => {
      let top = 0;
      for (let n = node; n; n = n.offsetParent) top += n.offsetTop;
      return top;
    };

    const sweep = (partsOnly = false) => {
      // Same 10 percent margin the observer uses.
      const fold = window.scrollY + window.innerHeight * 0.9;
      for (const target of [...pending]) {
        if (target.hasAttribute('data-entered')) pending.delete(target);
        else if (target.hasAttribute('data-entrance-part')) {
          if (layoutTop(target) < fold) enter(target);
        } else if (
          // A section is not transformed, so its painted top is its layout
          // top. Reaching the fold counts however little of it shows, which
          // the observer's ratio misses for a tall section.
          !partsOnly &&
          target.getBoundingClientRect().top < window.innerHeight * 0.9
        )
          enter(target);
      }
      if (!pending.size) {
        window.removeEventListener('scroll', onViewport);
        window.removeEventListener('resize', onViewport);
      }
    };

    // Resizing moves the fold like scrolling does.
    const onViewport = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        try {
          sweep();
        } catch {
          showEverything();
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        try {
          for (const entry of entries) {
            const { target, boundingClientRect, rootBounds } = entry;
            // A section the viewport already passed (deep link, restored
            // scroll, fast fling) never intersects, so it enters at once.
            const passed =
              boundingClientRect &&
              boundingClientRect.bottom <= (rootBounds?.top ?? 0);
            if (
              !(entry.isIntersecting || passed) ||
              target.hasAttribute('data-entered')
            )
              continue;

            enter(target);
          }
          sweep();
        } catch {
          showEverything();
        }
      },
      { rootMargin: '0px 0px -10%', threshold: 0.15 },
    );

    window.addEventListener('scroll', onViewport, { passive: true });
    window.addEventListener('resize', onViewport, { passive: true });

    for (const section of sections) {
      // A finished part goes back to its own transitions (a button's hover).
      section.addEventListener('transitionend', ({ target, propertyName }) => {
        if (
          target.hasAttribute('data-entrance-part') &&
          (propertyName === 'opacity' || propertyName === 'transform')
        ) {
          target.setAttribute('data-entrance-done', '');
        }
      });
    }

    for (const target of observed) observer.observe(target);

    finishSections();

    // Parts already on screen enter on load.
    sweep(true);
  } catch {
    showEverything();
  }
}
