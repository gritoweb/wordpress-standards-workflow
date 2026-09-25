<section @if ($anchor) id="{{ $anchor }}" @endif class="media-text @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container grid items-center gap-10 md:grid-cols-2">
    <div @if ($imageFirst) class="md:order-2" @endif>
      @if ($title)
        <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-body text-muted mt-4">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <x-button-link :text="$ctaText" :url="$ctaUrl" :new-tab="$ctaNew" variant="secondary" />
        </div>
      @endif
    </div>

    @if ($imageId)
      <div @entrancePart(3) @if ($imageFirst) class="md:order-1" @endif>
        {!! wp_get_attachment_image($imageId, 'large', false, [
            'class' => 'aspect-[4/3] w-full rounded-card object-cover',
            'loading' => 'lazy',
            'decoding' => 'async',
        ]) !!}
      </div>
    @endif
  </div>
</section>
