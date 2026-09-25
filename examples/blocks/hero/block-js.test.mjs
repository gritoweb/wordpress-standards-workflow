// block.js wires Swiper, the slide copy, the counter, the live status and play/pause (Swiper faked).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('./block.js', import.meta.url), 'utf8');
const el = (props = {}) => ({ dataset: {}, classList: { toggle(c, on) { (this._c ??= {})[c] = on; } }, toggleAttribute(n, on) { (this._a ??= {})[n] = on; }, setAttribute(n, v) { (this._s ??= {})[n] = v; }, addEventListener(e, f) { this._click = f; }, ...props });
const copies = [el({ querySelector: () => ({ textContent: ' One ' }) }), el({ querySelector: () => ({ textContent: 'Two' }) })];
const current = el(); const status = el({ dataset: { heroStatusTemplate: 'Slide %1$s of %2$s' } });
const play = el({ dataset: { heroPlayLabel: 'Play', heroPauseLabel: 'Pause' } });
const frame = {};
const hero = el({ dataset: { heroTransition: 'fade', heroDelay: '4000', heroAutoplay: 'true', heroLoop: 'true', heroSpeed: '700' },
  querySelector: (s) => ({ '.hero__slides.swiper': frame, '[data-hero-current]': current, '[data-hero-status]': status, '[data-hero-play-pause]': play }[s] ?? {}),
  querySelectorAll: () => copies });
let config; let autoplayRunning = true;
globalThis.window = { matchMedia: () => ({ matches: false }), Swiper: class { constructor(f, c) { config = c; this.autoplay = { get running() { return autoplayRunning; }, stop() { autoplayRunning = false; }, start() { autoplayRunning = true; } }; } } };
globalThis.document = { addEventListener: (e, f) => f(), querySelectorAll: () => [hero] };
test('block.js drives Swiper and keeps the copy, counter, status and play/pause in step', () => {
  new Function(code)();
  assert.equal(config.effect, 'fade'); assert.equal(config.speed, 700); assert.equal(config.loop, true); assert.equal(config.autoplay.delay, 4000);
  config.on.slideChange({ realIndex: 1 });
  assert.equal(copies[1].classList._c['is-active'], true); assert.equal(copies[0].classList._c['is-active'], false);
  assert.equal(current.textContent, '02'); assert.equal(status.textContent, 'Slide 2 of 2: Two');
  play._click(); assert.equal(autoplayRunning, false); assert.equal(play._s['aria-label'], 'Play');
});
