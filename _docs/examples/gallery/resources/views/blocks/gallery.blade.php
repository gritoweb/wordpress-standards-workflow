<section @if ($anchor) id="{{ $anchor }}" @endif class="gallery @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container">
    @if ($title)
      <h2 @entrancePart(0) class="heading-2 mb-10 text-center">{{ $title }}</h2>
    @endif

    @if ($images)
      {{-- The anchor id stays on the section; Splide only needs the data hook. --}}
      <div @entrancePart(1) class="gallery__slider splide" data-gallery
        aria-label="{{ $title ?: __('Gallery', '<text-domain>') }}">
        <div class="splide__track">
          <ul class="splide__list">
            @foreach ($images as $image)
              <li class="splide__slide">
                <figure class="m-0">
                  {!! wp_get_attachment_image($image['imageId'], 'large', false, [
                      'class' => 'aspect-[3/2] w-full rounded-card object-cover',
                      'loading' => 'lazy',
                      'decoding' => 'async',
                  ]) !!}
                  @if ($image['caption'])
                    <figcaption class="text-small text-muted mt-3">{{ $image['caption'] }}</figcaption>
                  @endif
                </figure>
              </li>
            @endforeach
          </ul>
        </div>
      </div>
    @endif
  </div>
</section>
