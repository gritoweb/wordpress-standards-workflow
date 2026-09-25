{{--
  Hidden text for a link that opens in a new tab. Put it inside the link, after
  the visible label, wherever the link carries target="_blank":

    <a href="..." @if ($new) target="_blank" @endif>{{ $label }}@include('partials.new-tab-hint', ['new' => $new])</a>

  $new is the link's opensInNewTab flag. Nothing prints when it is false.

  Prettier would break the line below into indented lines, and the indentation
  would print inside the link text, so it is left as one line.
--}}{{-- prettier-ignore --}}
@if (! empty($new))<span class="sr-only"> {{ __('(opens in a new tab)', '__TEXT_DOMAIN__') }}</span>@endif
