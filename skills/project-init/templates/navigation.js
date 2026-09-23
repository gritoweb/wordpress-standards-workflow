// Mobile menu toggle for sections/header.blade.php.
export function initNavigation() {
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('[data-nav-toggle]');
  if (!toggle) return;

  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () =>
    setOpen(!header.classList.contains('is-open')),
  );

  // An in-page anchor link would otherwise leave the panel covering the target.
  header
    .querySelector('[data-nav]')
    ?.addEventListener('click', (event) => event.target.closest('a') && setOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !header.classList.contains('is-open')) return;
    setOpen(false);
    toggle.focus();
  });

  // Growing past the breakpoint must not leave a stale open state behind.
  window
    .matchMedia('(min-width: 64rem)')
    .addEventListener('change', (event) => event.matches && setOpen(false));
}
