@php
  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'heading' => $heading !== '',
    'panel' => $body !== '' || $hasCta,
  ]);
  $hasContent = count(array_filter($parts, fn ($part) => $part !== null)) > 0;
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="cta-split {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance)>

  <div class="cta-split__inner container">
    <div class="cta-split__row mx-auto flex max-w-[60.4375rem] flex-col gap-8 xl:flex-row xl:items-center xl:justify-between xl:gap-0">
      @if ($heading !== '')
        <h2 class="cta-split__heading heading-1 mt-0 text-[color:var(--color-ink)] xl:w-[45.2947%]"
          @entrancePart($parts['heading'])>{{ $heading }}</h2>
      @endif

      @if ($parts['panel'] !== null)
        <div class="cta-split__panel flex flex-col items-start gap-8 xl:w-[48.0868%]"
          @entrancePart($parts['panel'])>
          @if ($body !== '')
            <div class="cta-split__body text-small xl:text-body mt-0 text-[color:var(--color-ink)]">
              {!! $body !!}
            </div>
          @endif

          @if ($hasCta)
            <a class="cta-split__cta btn {{ $ctaButtonClass }} {{ $ctaIconClass }} w-full sm:w-auto" href="{!! esc_url($ctaUrl) !!}"
              @if ($ctaNew) target="_blank" @endif>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
          @endif
        </div>
      @endif
    </div>
  </div>
</section>
@endif
