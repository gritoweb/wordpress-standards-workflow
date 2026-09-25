@php
  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $parts = \App\Blocks\BlockEntrance::partIndexes([
      'heading' => $heading !== '',
      'intro' => $intro !== '',
      'items' => count($items) > 0,
      'cta' => $hasCta,
  ]);
  $hasContent = count(array_filter($parts, fn($part) => $part !== null)) > 0;
@endphp

@if ($hasContent)
  <section @if ($anchor) id="{{ $anchor }}" @endif
    class="faq {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
    @entrance($entrance)>
    <div class="faq__inner container">
      <div class="faq__stack flex flex-col items-start gap-10 md:gap-12">
        @if ($heading !== '' || $intro !== '')
          <div class="faq__head flex max-w-3xl flex-col gap-6">
            @if ($heading !== '')
              <h2 class="faq__heading heading-2" @entrancePart($parts['heading'])>{{ $heading }}</h2>
            @endif
            @if ($intro !== '')
              <div class="faq__intro" @entrancePart($parts['intro'])>{!! $intro !!}</div>
            @endif
          </div>
        @endif

        @if (count($items))
          <div class="faq__list w-full max-w-4xl" @entrancePart($parts['items'])>
            @foreach ($items as $item)
              <details class="faq__item">
                <summary class="faq__summary">
                  <h3 class="faq__question heading-5">{{ $item['heading'] }}</h3>
                </summary>
                <div class="faq__answer">{!! $item['body'] !!}</div>
              </details>
            @endforeach
          </div>
        @endif

        @if ($hasCta)
          <a class="faq__cta btn {{ $ctaButtonClass }} {{ $ctaIconClass }}" href="{!! esc_url($ctaUrl) !!}"
            @if ($ctaNew) target="_blank" @endif
            @entrancePart($parts['cta'])>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
        @endif
      </div>
    </div>
  </section>
@endif
