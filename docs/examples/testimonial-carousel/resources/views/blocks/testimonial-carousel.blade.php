<section @if ($anchor) id="{{ $anchor }}" @endif
  class="testimonial-carousel @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface" @entrance($entrance)>
  <div class="container">
    @if ($title)
      <h2 @entrancePart(0) class="heading-2 mb-10 text-center">{{ $title }}</h2>
    @endif

    @if ($items)
      {{-- The anchor id stays on the section; Splide only needs the data hook. --}}
      <div @entrancePart(1) class="testimonial-carousel__slider splide" data-testimonial-carousel
        data-autoplay="{{ $autoplayMs }}" aria-label="{{ $title ?: __('Testimonials', '<text-domain>') }}">
        <div class="splide__track">
          <ul class="splide__list">
            @foreach ($items as $item)
              <li class="splide__slide">
                <figure class="card m-0 flex h-full flex-col p-8">
                  <blockquote class="flex-1 text-lead">{!! $item['quote'] !!}</blockquote>

                  <figcaption class="mt-6 flex items-center gap-4">
                    @if ($item['avatarId'])
                      {!! wp_get_attachment_image($item['avatarId'], 'thumbnail', false, [
                          'class' => 'h-12 w-12 rounded-full object-cover',
                          'loading' => 'lazy',
                      ]) !!}
                    @endif
                    <span>
                      <span class="block font-bold">{{ $item['author'] }}</span>
                      @if ($item['role'])
                        <span class="block text-small text-muted">{{ $item['role'] }}</span>
                      @endif
                    </span>
                  </figcaption>
                </figure>
              </li>
            @endforeach
          </ul>
        </div>
      </div>
    @endif
  </div>
</section>
