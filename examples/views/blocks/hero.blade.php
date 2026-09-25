@php
  $slideCount = count($slides);
  $hasChrome = $slideCount > 1;
  $hasMedia = (bool) array_filter($slides, fn ($slide) => $slide['imageId'] || $slide['imageUrl'] !== '');
  $eyebrowFirst = $layout !== 'eyebrow-below';
  $showBody = $layout !== 'no-body' && $body !== '';
  $showCaption = $layout !== 'no-body' && $caption !== '';

  // An empty block draws nothing (VIEW-4): no copy in any slide, no body, no
  // caption, no photo.
  $hasContent = $hasMedia
      || $showBody || $showCaption
      || (bool) array_filter($slides, fn ($slide) => $slide['eyebrow'] !== '' || $slide['heading'] !== '');

  // The parts run in reading order: eyebrow and heading swap with the layout,
  // then body, caption and the image panel. A part that does not render takes
  // no index, so the stagger has no gap. Every slide's copy shares the eyebrow
  // and heading index, because only one is on screen at a time.
  $partIndex = array_flip(
      array_values(
          array_filter(
              [
                  $eyebrowFirst ? 'eyebrow' : 'heading',
                  $eyebrowFirst ? 'heading' : 'eyebrow',
                  'body',
                  'caption',
                  'slides',
              ],
              fn ($name) => match ($name) {
                  'eyebrow' => (bool) array_filter($slides, fn ($slide) => $slide['eyebrow']),
                  'heading' => (bool) array_filter($slides, fn ($slide) => $slide['heading']),
                  'body' => $showBody,
                  'caption' => $showCaption,
                  'slides' => $hasMedia,
              },
          ),
      ),
  );

  // The copy's fade reads this duration; @entrance merges it into its own style attribute.
  $sliderStyle = $hasChrome ? '--hero-transition-duration: '.$motionTransitionDuration.'ms' : '';
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="hero {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) [container-type:inline-size]"
  @if ($hasChrome) data-hero-slideshow data-hero-transition="{{ esc_attr($motionTransition) }}"
    data-hero-loop="{{ $motionLoop ? 'true' : 'false' }}" data-hero-autoplay="{{ $motionAutoplay ? 'true' : 'false' }}"
    data-hero-delay="{{ esc_attr((string) $motionDelay) }}" data-hero-speed="{{ esc_attr((string) $motionTransitionDuration) }}" @endif
  @entrance($entrance, $sliderStyle)>
  <div
    class="hero__inner container flex flex-col gap-10 pb-16 pt-24 xl:flex-row xl:items-center xl:gap-5 xl:pb-24 xl:pt-[9.375rem]">
    <div class="hero__content xl:w-[39.824%] xl:shrink-0">
      <div class="hero__text max-w-[30.4375rem]">
        {{-- Every slide's copy shares one grid cell; block.js marks the active one as Swiper changes slide. --}}
        <div class="hero__copies">
          @foreach ($slides as $index => $slide)
            <div data-hero-copy class="hero__copy {{ $index === 0 ? 'is-active' : '' }}"
              @if ($index !== 0) aria-hidden="true" @endif>
              @if ($eyebrowFirst && $slide['eyebrow'])
                <p class="hero__eyebrow mb-[1.0625rem] text-lead font-normal uppercase"
                  @entrancePart($partIndex['eyebrow'])>
                  {{ $slide['eyebrow'] }}</p>
              @endif

              @if ($slide['heading'])
                {{-- An h2: the page's h1 is its title, rendered by the page
                     layout. heading-1 carries the display type on the smaller tag. --}}
                <h2 class="hero__heading heading-1 mt-0"
                  @entrancePart($partIndex['heading'])>{{ $slide['heading'] }}
                </h2>
              @endif

              @if (!$eyebrowFirst && $slide['eyebrow'])
                <p class="hero__eyebrow mt-[1.0625rem] text-lead font-normal uppercase"
                  @entrancePart($partIndex['eyebrow'])>
                  {{ $slide['eyebrow'] }}</p>
              @endif
            </div>
          @endforeach
        </div>

        @if ($showBody)
          <div class="hero__body mt-6"
            @entrancePart($partIndex['body'])>{!! $body !!}</div>
        @endif

        @if ($showCaption)
          <p class="hero__caption text-lead mt-8 uppercase"
            @entrancePart($partIndex['caption'])>
            {{ $caption }}</p>
        @endif
      </div>
    </div>

    @if ($hasMedia || $hasChrome)
      <div class="hero__media bleed-x xl:bleed-end min-w-0 xl:flex-1">
        @if ($hasMedia)
          <div
            class="hero__slides {{ $hasChrome ? 'swiper' : '' }} bleed-media relative h-[22rem] overflow-hidden rounded-none xl:h-[36rem] xl:rounded-l-[var(--radius-card)]"
            @entrancePart($partIndex['slides'])>
            @if ($hasChrome)<div class="swiper-wrapper">@endif
            @foreach ($slides as $index => $slide)
              {{-- !m-0: base.css gives figure a bottom margin that survives inset-0 and
                   shortens the slide by 16px, exposing the image's own square corner
                   inside the rounded box. --}}
              <figure class="hero__slide {{ $hasChrome ? 'swiper-slide' : 'absolute inset-0' }} !m-0 h-full">
                @if ($slide['imageId'] || $slide['imageUrl'] !== '')
                  <picture>
                    @if ($slide['mobileSrc'])
                      <source media="(width < 80rem)" srcset="{{ $slide['mobileSrcset'] }}" sizes="100vw">
                    @endif
                    @if ($slide['imageId'])
                      {!! wp_get_attachment_image($slide['imageId'], 'full', false, [
                          'class' => 'h-full w-full object-cover',
                          'alt' => $slide['imageAlt'],
                          'loading' => $index === 0 ? 'eager' : 'lazy',
                          'decoding' => 'async',
                          ...($index === 0 ? ['fetchpriority' => 'high'] : []),
                          'style' => 'object-position: '.$slide['imagePosition'],
                      ]) !!}
                    @else
                      <img src="{!! esc_url($slide['imageUrl']) !!}" alt="" class="h-full w-full object-cover"
                        loading="{{ $index === 0 ? 'eager' : 'lazy' }}" decoding="async"
                        style="object-position: {{ $slide['imagePosition'] }}">
                    @endif
                  </picture>
                @endif
              </figure>
            @endforeach
            @if ($hasChrome)</div>@endif
          </div>
        @endif

        @if ($hasChrome)
          <div
            class="hero__chrome text-small mt-3 flex items-center justify-between">
            <p class="hero__counter tabular-nums">
              <span data-hero-current>01</span>
            </p>
            <p class="sr-only" data-hero-status
              data-hero-status-template=""{{ esc_attr(__('Slide %1$s of %2$s', '__TEXT_DOMAIN__')) }}" aria-live="polite"
              aria-atomic="true">{{ sprintf(__('Slide %1$s of %2$s', '__TEXT_DOMAIN__'), 1, $slideCount) }}@if ($slides[0]['heading'])
                : {{ $slides[0]['heading'] }}
              @endif
            </p>

            <div class="hero__arrows flex gap-4">
              <button type="button" class="hero__arrow" data-hero-prev
                aria-label="{{ __('Previous slide', '__TEXT_DOMAIN__') }}">&larr;</button>
              <button type="button" class="hero__arrow" data-hero-next
                aria-label="{{ __('Next slide', '__TEXT_DOMAIN__') }}">&rarr;</button>
              @if ($motionAutoplay)
                <button type="button" class="hero__arrow" data-hero-play-pause
                  data-hero-play-label=""{{ esc_attr(__('Play slideshow', '__TEXT_DOMAIN__')) }}"
                  data-hero-pause-label=""{{ esc_attr(__('Pause slideshow', '__TEXT_DOMAIN__')) }}"
                  aria-label="{{ __('Pause slideshow', '__TEXT_DOMAIN__') }}">&#10074;&#10074;</button>
              @endif
            </div>
          </div>
        @endif
      </div>
    @endif
  </div>
</section>
@endif
