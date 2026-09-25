<section @if ($anchor) id="{{ $anchor }}" @endif class="hero @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface"
  @entrance($entrance)>
  <div class="container grid items-center gap-10 md:grid-cols-2">
    <div>
      @if ($title)
        <h1 @entrancePart(0) class="heading-1">{{ $title }}</h1>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-lead text-muted mt-6">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <x-button-link :text="$ctaText" :url="$ctaUrl" :new-tab="$ctaNew" variant="primary" />
        </div>
      @endif
    </div>

    @if ($imageId)
      <div @entrancePart(3)>
        {!! wp_get_attachment_image($imageId, 'large', false, [
            'class' => 'aspect-[4/3] w-full rounded-card object-cover',
            'loading' => 'eager',
            'decoding' => 'async',
        ]) !!}
      </div>
    @endif
  </div>
</section>
