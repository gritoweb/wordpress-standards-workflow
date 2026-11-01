@if ($isPlain())
  <div class="container pb-8 md:pb-16">
    <div class="e-content">
      @php(the_content())
    </div>
  </div>
@else
  @php(the_content())
@endif

@if ($pagination())
  <nav class="container" aria-label="{{ __('Page', '__TEXT_DOMAIN__') }}">
    {!! $pagination !!}
  </nav>
@endif
