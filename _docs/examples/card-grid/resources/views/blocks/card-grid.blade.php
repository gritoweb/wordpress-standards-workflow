<section @if ($anchor) id="{{ $anchor }}" @endif class="card-grid @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container">
    @if ($title || $description)
      <div class="mx-auto mb-12 max-w-2xl text-center">
        @if ($title)
          <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
        @endif

        @if ($description)
          <div @entrancePart(1) class="text-body text-muted mt-4">{!! $description !!}</div>
        @endif
      </div>
    @endif

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      @foreach ($cards as $card)
        <article @entrancePart($loop->index + 2) class="card-grid__card card flex flex-col overflow-hidden">
          @if ($card['imageId'])
            {!! wp_get_attachment_image($card['imageId'], 'large', false, [
                'class' => 'aspect-[4/3] w-full object-cover',
                'loading' => 'lazy',
                'decoding' => 'async',
            ]) !!}
          @endif

          <div class="flex flex-1 flex-col p-6">
            @if ($card['title'])
              <h3 class="heading-5">{{ $card['title'] }}</h3>
            @endif

            @if ($card['body'])
              <div class="text-small text-muted mt-3">{!! $card['body'] !!}</div>
            @endif

            @if ($card['linkText'] && $card['linkUrl'])
              <a href="{{ esc_url($card['linkUrl']) }}" @if ($card['linkNew']) target="_blank" @endif
                class="link text-small text-primary mt-auto inline-flex pt-5 font-semibold hover:underline">{{ $card['linkText'] }}</a>
            @endif
          </div>
        </article>
      @endforeach
    </div>
  </div>
</section>
