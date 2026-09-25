@php
  $isFeature = $scale === 'feature';
  $isLogos = $mediaType === 'logos';
  $mediaFirst = $mediaPosition === 'left';
  $hasMedia = $isLogos ? count($logos) > 0 : ($imageId > 0 || $imageUrl !== '');
  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $hasCopy = $heading !== '' || $eyebrow !== '' || $body !== '';
  $hasContent = $hasCopy || count($items) > 0;
  // An empty block draws nothing (VIEW-4): no copy, items, button or media.
  $hasAnything = $hasContent || $hasCta || $hasMedia;
  $mobileRowGap = $hasMedia && $hasCta && !$mediaBleed ? 'gap-4' : 'gap-10';

  // The column split is a share of the container, never a fixed pixel width,
  // so it stays proportional above the container and the bleed can absorb
  // the extra viewport.
  $contentWidth = $mediaBleed
      ? ($isFeature ? 'xl:w-[46.635%]' : 'xl:w-[49.199%]')
      : ($isFeature ? 'xl:w-[50.9%]' : 'xl:w-[48.65%]');

  $rowGap = 'xl:gap-[var(--spacing-split-gap)]';

  // The bleed: a negative margin from the container's content edge to the
  // viewport edge, so the media keeps its container share and grows only by
  // the gutter it bleeds into.
  $bleedPull = $mediaFirst ? 'bleed-x xl:bleed-start' : 'bleed-x xl:bleed-end';

  // The frame owns its geometry and the photo crops to fill it; mediaRatio
  // overrides the scale/bleed defaults below.
  $mediaAspect = match ($mediaRatio) {
      'portrait' => 'aspect-[529/807]',
      'landscape' => 'aspect-[16/9]',
      'square' => 'aspect-square',
      default => $isLogos
          ? 'aspect-[723/692]'
          : ($mediaBleed
              ? 'aspect-[706/680]'
              : ($isFeature ? 'aspect-[530/561]' : 'aspect-[581/606]')),
  };

  // A corner on an edge that bleeds to the viewport never rounds; below xl a
  // bleeding panel spans both walls, so no corner rounds there either.
  $mediaRounded = match (true) {
      !$mediaBleed => 'rounded-[var(--radius-card)]',
      $mediaFirst => 'bleed-media rounded-none xl:rounded-r-[var(--radius-card)]',
      default => 'bleed-media rounded-none xl:rounded-l-[var(--radius-card)]',
  };

  $headGap = $mediaBleed ? 'mt-12' : 'mt-6';
  $bodyGap = $eyebrow !== '' ? 'mt-8' : ($isFeature ? $headGap : 'mt-8');
  $ctaGap = !$hasContent ? '' : ($isFeature ? 'xl:mt-12' : 'xl:mt-8');
@endphp

@if ($hasAnything)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="text-media text-media--{{ $scale }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }} [container-type:inline-size]"
  @entrance($entrance)>
  <div class="text-media__inner container">
    {{-- STACK ORDER ON MOBILE IS THE BLEED, NOT $mediaFirst: a bleeding panel
         leads on mobile (order:-1 below), an inset one follows the copy. --}}
    <div class="text-media__row {{ $rowGap }} {{ $mediaFirst ? 'xl:flex-row-reverse' : '' }} @if ($mediaBleed) is-bleed @endif {{ $mobileRowGap }} flex flex-col xl:flex-row xl:items-center">

      @if ($hasContent || $hasCta)
        <div class="text-media__col {{ $contentWidth }} min-w-0 xl:shrink-0">
          @if ($hasContent)
            <div class="text-media__content min-w-0">
              @if ($heading)
                <h2 @entrancePart($headingPart)
                  class="text-media__heading {{ $isFeature ? 'heading-2' : 'heading-4' }} mt-0 text-[color:var(--color-ink)]">
                  {{ $heading }}</h2>
              @endif

              @if ($eyebrow)
                <p @entrancePart($eyebrowPart)
                  class="text-media__eyebrow text-lead mt-6 text-[color:var(--color-ink)]">{{ $eyebrow }}</p>
              @endif

              @if ($body)
                <div @entrancePart($bodyPart)
                  class="text-media__body {{ $isFeature ? 'text-lead' : '' }} {{ $heading || $eyebrow ? $bodyGap : '' }} text-[color:var(--color-ink)]">
                  {!! $body !!}</div>
              @endif

              @if (count($items))
                <div class="text-media__items {{ $hasCopy ? 'mt-8' : '' }}">
                  @foreach ($items as $index => $item)
                    <div @entrancePart($itemParts[$index])
                      class="text-media__item {{ $index > 0 ? 'mt-[2.1875rem]' : '' }}">
                      @if ($item['heading'])
                        <h3 class="text-media__item-heading heading-4 mt-0 text-[color:var(--color-ink)]">
                          {{ $item['heading'] }}</h3>
                      @endif

                      @if ($item['body'])
                        <div
                          class="text-media__item-body {{ $item['heading'] ? 'mt-8' : '' }} text-[color:var(--color-ink)]">
                          {!! $item['body'] !!}</div>
                      @endif

                      {{-- Every row's link can read the same label (e.g. "Read
                           More"), so the hidden span carries the row's own
                           heading, so a screen reader announces "Read More
                           about Scale." (WCAG 2.4.4). --}}
                      @if ($item['linkText'] && $item['linkUrl'])
                        <a class="btn-link mt-8" href="{!! esc_url($item['linkUrl']) !!}"
                          @if ($item['linkNew']) target="_blank" @endif>{{ $item['linkText'] }}@if ($item['heading'])
                            {{-- translators: %s: the item's heading, read after a shared link label. --}}
                            <span class="sr-only"> {{ sprintf(__('about %s', '__TEXT_DOMAIN__'), $item['heading']) }}</span>
                          @endif
                          @include('partials.new-tab-hint', ['new' => $item['linkNew']])
                        </a>
                      @endif

                      <hr class="text-media__item-rule mt-8 border-0 border-t border-[color:var(--color-ink)]">
                    </div>
                  @endforeach
                </div>
              @endif
            </div>
          @endif

          @if ($hasCta)
            <a class="text-media__cta btn {{ $ctaButtonClass }} {{ $ctaIconClass }} {{ $ctaGap }} w-full sm:w-auto"
              href="{!! esc_url($ctaUrl) !!}" @entrancePart($ctaPart)
              @if ($ctaNew) target="_blank" @endif>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
          @endif
        </div>
      @endif

      @if ($hasMedia)
        <div class="text-media__media {{ $mediaBleed ? $bleedPull : '' }} min-w-0 xl:flex-1">
          @if ($isLogos)
            <div class="text-media__panel {{ $mediaAspect }} {{ $mediaRounded }} {{ $groundClass }} flex items-center justify-center px-6 py-12 xl:px-12 xl:py-0">
              <ul class="text-media__logos">
                @include('blocks.partials.logo-row', ['logos' => $logos, 'itemClass' => 'text-media__logo'])
              </ul>
            </div>
          @else
            {{-- !m-0: base.css gives figure a bottom margin that a plain m-0 utility loses to. --}}
            <figure @entrancePart($imagePart)
              class="text-media__figure {{ $mediaAspect }} {{ $mediaRounded }} !m-0 overflow-hidden">
              @if ($imageId)
                {!! wp_get_attachment_image($imageId, 'full', false, [
                    'class' => 'block h-full w-full object-cover',
                    'loading' => 'lazy',
                    'decoding' => 'async',
                    'style' => 'object-position: ' . $imagePosition,
                ]) !!}
              @else
                <img src="{!! esc_url($imageUrl) !!}" alt="" class="block h-full w-full object-cover" loading="lazy"
                  decoding="async" style="object-position: {{ $imagePosition }}">
              @endif
            </figure>
          @endif
        </div>
      @endif
    </div>
  </div>
</section>
@endif
