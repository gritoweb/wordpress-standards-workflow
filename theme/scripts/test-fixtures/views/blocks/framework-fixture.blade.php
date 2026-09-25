<section @if ($anchor) id="{{ $anchor }}" @endif
  class="framework-fixture {{ $groundClass }} @if ($sectionDivider === 'above') border-t-2 border-[color:var(--color-primary)] @endif @if ($sectionDivider === 'below') border-b-2 border-[color:var(--color-primary)] @endif @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)"
  @entrance($entrance)>
  @if ($heading)
    <h2 class="framework-fixture__heading" @entrancePart(0)>{{ $heading }}</h2>
  @endif

  @if (count($items))
    <ul class="framework-fixture__items">
      @foreach ($items as $index => $item)
        <li @entrancePart($index + 1)>{{ $item['label'] ?? '' }}</li>
      @endforeach
    </ul>
  @endif

  @if ($ctaText && $ctaUrl)
    <a
      class="framework-fixture__cta btn {{ $ctaIconClass }}"
      href="{!! esc_url($ctaUrl) !!}"
      @if ($ctaNew) target="_blank" @endif
    >{{ $ctaText }}</a>
  @endif
</section>
