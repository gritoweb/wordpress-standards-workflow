@php
  $hasImage = $imageId > 0 || $imageUrl !== '';
  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'heading' => $heading !== '',
    'intro' => $intro !== '',
    'form' => $form !== '',
    'media' => $hasImage,
  ]);
  $hasContent = count(array_filter($parts, fn ($part) => $part !== null)) > 0;
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="contact-form {{ $groundClass }} @if ($mediaPosition === 'left') contact-form--media-left @endif @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)"
  @entrance($entrance)>
  <div class="contact-form__inner container">
    <div class="contact-form__grid">
      <div class="contact-form__copy">
        @if ($heading !== '')
          <h2 class="contact-form__heading heading-1" @entrancePart($parts['heading'])>{{ $heading }}</h2>
        @endif

        @if ($intro !== '')
          <div class="contact-form__intro" @entrancePart($parts['intro'])>{!! $intro !!}</div>
        @endif

        @if ($form !== '')
          <div class="contact-form__form" @entrancePart($parts['form'])>{!! $form !!}</div>
        @endif
      </div>

      @if ($hasImage)
        <div class="contact-form__media" @entrancePart($parts['media'])>
          @if ($imageId)
            {!! wp_get_attachment_image($imageId, 'large', false, [
                'class' => 'contact-form__img',
                'loading' => 'lazy',
                'decoding' => 'async',
                'style' => 'object-position: ' . $imagePosition,
            ]) !!}
          @else
            <img class="contact-form__img" src="{!! esc_url($imageUrl) !!}" alt="" loading="lazy" decoding="async"
              style="object-position: {{ $imagePosition }}">
          @endif
        </div>
      @endif
    </div>
  </div>
</section>
@endif
