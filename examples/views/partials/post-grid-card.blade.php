{{-- One post-grid card. $item comes from a ContentType adapter's card()
     method: id, title, meta, excerpt, url, photoId, photoAlt. --}}
<article class="post-card">
  @if ($item['photoId'])
    <div class="post-card__photo">
      {!! wp_get_attachment_image($item['photoId'], 'medium', false, [
          'class' => 'post-card__photo-img aspect-square w-full rounded-[var(--radius-card)] object-cover',
          'alt' => $item['photoAlt'],
          'loading' => 'lazy',
          'decoding' => 'async',
      ]) !!}
    </div>
  @endif

  <div class="post-card__body">
    <h3 class="post-card__title heading-4 mt-0">{{ $item['title'] }}</h3>

    @if ($item['meta'])
      <p class="post-card__meta mt-0">{{ $item['meta'] }}</p>
    @endif

    @if ($item['excerpt'])
      <p class="post-card__excerpt mt-0">{{ $item['excerpt'] }}</p>
    @endif

    @if ($item['url'] && $linkText)
      <a class="post-card__cta btn-link" href="{!! esc_url($item['url']) !!}">
        <span>{{ $linkText }}</span>
        <span class="sr-only">&mdash; {{ $item['title'] }}</span>
      </a>
    @endif
  </div>
</article>
