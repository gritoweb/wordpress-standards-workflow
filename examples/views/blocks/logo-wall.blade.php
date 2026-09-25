@php
  // The ink rule on a light ground, where the primary color wouldn't show (DIV-1).
  $ruleColor = $isLightGround ? 'border-[color:var(--color-ink)]' : 'border-[color:var(--color-primary)]';
  $hasContent = $heading !== '' || count($brandRows) > 0;
  $parts = \App\Blocks\BlockEntrance::partIndexes(['heading' => $heading !== '']);
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="logo-wall {{ $isLightGround ? 'logo-wall--light' : 'logo-wall--dark' }} {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) @if ($sectionDivider === 'above') border-t-2 {{ $ruleColor }} @endif @if ($sectionDivider === 'below') border-b-2 {{ $ruleColor }} @endif"
  @entrance($entrance)>
  <div class="logo-wall__inner container">
    <div class="logo-wall__stack flex flex-col items-center gap-16">
      @if ($heading !== '')
        <h2 class="logo-wall__heading heading-2 {{ $isLightGround ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-primary)]' }} mt-0 max-w-[55.75rem] text-center" @entrancePart($parts['heading'])>
          {{ $heading }}</h2>
      @endif

      @if (count($brandRows))
        <div class="logo-wall__brand-rows">
          @foreach ($brandRows as $row)
            <ul class="logo-wall__brand-row" style="--brand-gap: {{ $row['gap'] }}px">
              @include('blocks.partials.logo-row', ['logos' => $row['logos'], 'itemClass' => 'logo-wall__brand-logo'])
            </ul>
          @endforeach
        </div>
      @endif

      {{-- A right-arrow "read more" link in the stack, so its gap and
           centring come from the same flex column as the heading and the
           logos. --}}
      @if ($ctaUrl !== '')
        <a class="logo-wall__cta btn btn-link" href="{!! esc_url($ctaUrl) !!}"
          @if ($ctaNew) target="_blank" @endif>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
      @endif
    </div>
  </div>
</section>
@endif
