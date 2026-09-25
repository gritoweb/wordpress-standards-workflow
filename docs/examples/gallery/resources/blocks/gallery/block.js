// Served from source (no import): Splide is the vendor script registered in app/blocks.php.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.Splide === 'undefined') return;

  document.querySelectorAll('[data-gallery]').forEach((slider) => {
    if (slider.dataset.splideMounted) return;
    slider.dataset.splideMounted = '1';

    new window.Splide(slider, {
      perPage: 1,
      // One position per image, the same page count the editor canvas shows.
      perMove: 1,
      gap: '24px',
      mediaQuery: 'min',
      breakpoints: { 768: { perPage: 2 } },
      rewind: true,
      arrows: false,
      pagination: true,
    }).mount();
  });
});
