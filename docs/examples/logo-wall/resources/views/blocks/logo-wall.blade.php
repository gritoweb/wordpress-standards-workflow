<section @if ($anchor) id="{{ $anchor }}" @endif class="logo-wall @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container">
    @if ($title)
      <p @entrancePart(0) class="text-small text-muted mb-10 text-center">{{ $title }}</p>
    @endif

    @if ($logos)
      <ul class="m-0 grid list-none grid-cols-2 items-center gap-8 p-0 md:grid-cols-5">
        @foreach ($logos as $imageId)
          <li @entrancePart($loop->index + 1) class="flex h-20 items-center justify-center">
            {!! wp_get_attachment_image($imageId, 'medium', false, [
                'class' => 'max-h-full w-auto object-contain',
                'loading' => 'lazy',
                'decoding' => 'async',
            ]) !!}
          </li>
        @endforeach
      </ul>
    @endif
  </div>
</section>
