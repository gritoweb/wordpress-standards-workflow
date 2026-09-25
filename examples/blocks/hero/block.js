// Served from source (no import): Swiper is the vendor script registered in app/setup.php, enqueued by block.php.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.Swiper === 'undefined') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (number) => String(number).padStart(2, '0');

  document.querySelectorAll('[data-hero-slideshow]').forEach((hero) => {
    const frame = hero.querySelector('.hero__slides.swiper');
    if (!frame) return;

    const copies = [...hero.querySelectorAll('[data-hero-copy]')];
    const current = hero.querySelector('[data-hero-current]');
    const status = hero.querySelector('[data-hero-status]');
    const playPause = hero.querySelector('[data-hero-play-pause]');
    const transition = hero.dataset.heroTransition;
    const delay = Number(hero.dataset.heroDelay) || 5000;
    const autoplay = hero.dataset.heroAutoplay === 'true' && !reducedMotion;

    const show = (index) => {
      copies.forEach((copy, position) => {
        copy.classList.toggle('is-active', position === index);
        copy.toggleAttribute('aria-hidden', position !== index);
      });
      if (current) current.textContent = pad(index + 1);
      if (status) {
        const heading = copies[index]?.querySelector('.hero__heading')?.textContent.trim();
        const text = status.dataset.heroStatusTemplate.replace('%1$s', index + 1).replace('%2$s', copies.length);
        status.textContent = heading ? `${text}: ${heading}` : text;
      }
    };

    const swiper = new window.Swiper(frame, {
      effect: transition === 'slide' ? 'slide' : 'fade',
      fadeEffect: { crossFade: true },
      speed: transition === 'none' || reducedMotion ? 0 : Number(hero.dataset.heroSpeed) || 500,
      loop: hero.dataset.heroLoop === 'true',
      autoplay: autoplay ? { delay, pauseOnMouseEnter: true, disableOnInteraction: false } : false,
      navigation: { prevEl: hero.querySelector('[data-hero-prev]'), nextEl: hero.querySelector('[data-hero-next]') },
      a11y: { enabled: true },
      on: { slideChange: (instance) => show(instance.realIndex) },
    });

    if (playPause) {
      if (!autoplay) playPause.hidden = true;
      playPause.addEventListener('click', () => {
        const running = swiper.autoplay.running;
        running ? swiper.autoplay.stop() : swiper.autoplay.start();
        playPause.setAttribute('aria-label', running ? playPause.dataset.heroPlayLabel : playPause.dataset.heroPauseLabel);
        playPause.textContent = running ? '▶' : '❚❚';
      });
    }
  });
});
