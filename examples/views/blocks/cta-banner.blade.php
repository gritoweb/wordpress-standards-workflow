@php
  $isPanel = $layout === 'panel';
  $isLight = $textTone === 'light';
  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $hasImage = $bgImageId > 0 || $bgImageUrl !== '';

  $toneClass = $isLight ? 'text-[color:var(--color-surface)]' : 'text-[color:var(--color-ink)]';

  // With no photo and no configured ground, the block still needs a readable
  // panel: a flat tone-matched fallback keeps the copy legible.
  $fallbackGround = $hasImage || $groundClass !== '' ? '' : ($isLight ? 'bg-[color:var(--color-ink)]' : 'bg-[color:var(--color-surface)]');

  // A photo band or panel needs the wash to boost the copy's contrast over
  // whatever the photo happens to be: light copy gets a dark wash, dark copy
  // a light one, built from the same ground tokens every block reads (never
  // an "earth" ramp value) — each fading from transparent to the tone colour
  // at the bottom edge of the lower half.
  $washGradient = $isLight
      ? 'linear-gradient(to bottom, color-mix(in srgb, var(--color-ink) 0%, transparent) 0%, color-mix(in srgb, var(--color-ink) 60%, transparent) 100%)'
      : 'linear-gradient(to bottom, color-mix(in srgb, var(--color-surface) 0%, transparent) 0%, color-mix(in srgb, var(--color-surface) 85%, transparent) 100%)';

  $heightClass = $isPanel ? 'min-h-[40.5rem] lg:min-h-[72.375rem]' : '';
  $anchorClass = $isPanel ? 'justify-end' : 'justify-center';

  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'heading' => $heading !== '',
    'subtitle' => $subtitle !== '',
    'cta' => $hasCta,
  ]);
  $hasContent = $hasImage || count(array_filter($parts, fn ($part) => $part !== null)) > 0;
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="cta-banner {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ $heightClass }} {{ $anchorClass }} {{ $fallbackGround }} relative isolate flex flex-col"
  @entrance($entrance)>

  @if ($hasImage)
    @if ($bgImageId)
      {!! wp_get_attachment_image($bgImageId, 'full', false, [
          'class' => 'absolute inset-0 -z-10 h-full w-full object-cover',
          'style' => 'object-position: '.$bgObjectPosition,
          'alt' => '',
          'loading' => 'lazy',
          'decoding' => 'async',
      ]) !!}
    @else
      <img src="{!! esc_url($bgImageUrl) !!}" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover"
        style="object-position: {{ $bgObjectPosition }}" loading="lazy" decoding="async">
    @endif
  @endif

  @if ($scrim)
    <div class="cta-banner__scrim pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2"
      style="background-image: {{ $washGradient }};"></div>
  @endif

  <div class="cta-banner__inner container">
    <div class="cta-banner__stack {{ $toneClass }} mx-auto flex max-w-[57.5rem] flex-col items-center gap-8 text-center">
      @if ($heading !== '')
        <h2 class="cta-banner__heading heading-2 mt-0"
          @entrancePart($parts['heading'])>{{ $heading }}</h2>
      @endif

      @if ($subtitle !== '')
        <p class="cta-banner__subtitle text-lead mt-0 max-w-[55.75rem]"
          @entrancePart($parts['subtitle'])>{{ $subtitle }}</p>
      @endif

      @if ($hasCta)
        <a class="cta-banner__cta btn {{ $ctaButtonClass }} {{ $ctaIconClass }} w-full sm:w-auto" href="{!! esc_url($ctaUrl) !!}"
          @if ($ctaNew) target="_blank" @endif
          @entrancePart($parts['cta'])>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
      @endif
    </div>
  </div>
</section>
@endif
