// Served from source (no import): Splide is the vendor script registered in app/setup.php.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.Splide === 'undefined') return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  document.querySelectorAll('[data-testimonial-carousel]').forEach((slider) => {
    if (slider.dataset.splideMounted) return;
    slider.dataset.splideMounted = '1';
    const delay = Number(slider.dataset.autoplay) || 0;

    new window.Splide(slider, {
      perPage: 1,
      // One position per slide, the same page count the editor canvas shows.
      perMove: 1,
      gap: '24px',
      mediaQuery: 'min',
      breakpoints: { 768: { perPage: 2 } },
      // Rewind instead of loop: loop clones slides and needs more than are visible.
      rewind: true,
      arrows: false,
      pagination: true,
      autoplay: delay > 0 && !reducedMotion,
      interval: delay || 5000,
      pauseOnHover: true,
    }).mount();
  });
});
