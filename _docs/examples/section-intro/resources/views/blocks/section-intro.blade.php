<section @if ($anchor) id="{{ $anchor }}" @endif
  class="section-intro @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light" @entrance($entrance)>
  <div class="container">
    <div class="@if ($align === 'center') mx-auto text-center @endif max-w-3xl">
      @if ($title)
        <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-lead text-muted mt-4">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <x-button-link :text="$ctaText" :url="$ctaUrl" :new-tab="$ctaNew" variant="primary" />
        </div>
      @endif
    </div>
  </div>
</section>
