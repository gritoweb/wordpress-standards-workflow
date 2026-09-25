{{--
  Shared by logo-wall and text-media: the marks of one row/panel of client or
  partner logos. $logos is a list of {image, url, new, style?, part?}:
  - image  Pre-rendered wp_get_attachment_image() markup.
  - url    Already esc_url_raw()'d in block.php; escaped again here at output.
  - new    Whether the link opens in a new tab. No rel: browsers treat
           target="_blank" as noopener.
  - style  Optional inline style for the <li> (per-logo cell sizing).
  - part   Optional @entrancePart index.
  $itemClass is the caller's own <li> class.
--}}
@foreach ($logos as $logo)
  <li class="{{ $itemClass }}"
    @if (isset($logo['part']))
      @entrancePart($logo['part'], $logo['style'] ?? '')
    @elseif (!empty($logo['style']))
      style="{{ $logo['style'] }}"
    @endif>
    @if ($logo['url'])
      <a href="{!! esc_url($logo['url']) !!}" @if ($logo['new']) target="_blank" @endif>{!! $logo['image'] !!}@include('partials.new-tab-hint', ['new' => $logo['new']])</a>
    @else
      {!! $logo['image'] !!}
    @endif
  </li>
@endforeach
