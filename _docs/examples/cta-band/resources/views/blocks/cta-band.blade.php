<section @if ($anchor) id="{{ $anchor }}" @endif
  class="cta-band @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-ink text-light relative isolate overflow-hidden" @entrance($entrance)>
  @if ($bgImageId)
    {!! wp_get_attachment_image($bgImageId, 'full', false, [
        'class' => 'absolute inset-0 -z-10 h-full w-full object-cover opacity-40 ' . $bgPosition,
        'alt' => '',
        'loading' => 'lazy',
        'decoding' => 'async',
    ]) !!}
  @endif

  <div class="container">
    <div class="mx-auto max-w-2xl text-center">
      @if ($title)
        <h2 @entrancePart(0) class="heading-2 text-light">{{ $title }}</h2>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-lead text-light mt-4">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <x-button-link :text="$ctaText" :url="$ctaUrl" :new-tab="$ctaNew" variant="primary" />
        </div>
      @endif
    </div>
  </div>
</section>
