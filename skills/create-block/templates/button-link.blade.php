{{-- A section button: prints nothing until it has both text and a link. --}}
@props(['text' => '', 'url' => '', 'newTab' => false, 'variant' => 'primary'])

@if ($text && $url)
  <a href="{{ esc_url($url) }}" @if ($newTab) target="_blank" @endif
    {{ $attributes->merge(['class' => "btn btn-{$variant}"]) }}>{{ $text }}</a>
@endif
