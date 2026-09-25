@php
  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'heading' => $heading !== '',
    'body' => $body !== '',
    'image' => $imageId > 0,
    'items' => count($items) > 0,
    'cta' => $hasCta,
  ]);
  $hasContent = count(array_filter($parts, fn ($part) => $part !== null)) > 0;
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="conformance-pass {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance)>
  <div class="conformance-pass__inner container">
    @if ($heading !== '')
      <h2 class="conformance-pass__heading heading-2" @entrancePart($parts['heading'])>{{ $heading }}</h2>
    @endif

    @if ($body !== '')
      <div class="conformance-pass__body" @entrancePart($parts['body'])>{!! $body !!}</div>
    @endif

    @if ($imageId > 0)
      <figure class="conformance-pass__figure !m-0" @entrancePart($parts['image'])>
        {!! wp_get_attachment_image($imageId, 'large', false, ['class' => 'h-full w-full object-cover', 'loading' => 'lazy', 'decoding' => 'async']) !!}
      </figure>
    @endif

    @if (count($items))
      <ul class="conformance-pass__items" @entrancePart($parts['items'])>
        @foreach ($items as $item)
          <li class="conformance-pass__item"><h3 class="heading-4">{{ $item['heading'] }}</h3></li>
        @endforeach
      </ul>
    @endif

    @if ($hasCta)
      <a class="conformance-pass__cta btn {{ $ctaButtonClass }} {{ $ctaIconClass }}" href="{!! esc_url($ctaUrl) !!}"
        @if ($ctaNew) target="_blank" @endif
        @entrancePart($parts['cta'])>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
    @endif
  </div>
</section>
@endif
