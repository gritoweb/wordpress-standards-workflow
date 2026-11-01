<article @php(post_class('h-entry'))>
  <div @class(['container py-8 md:py-16' => $isPlain()])>
    <header>
      <h1 class="p-name heading-1">
        {!! $title !!}
      </h1>

      @include('partials.entry-meta')
    </header>

    <div class="e-content">
      @php(the_content())
    </div>
  </div>

  @if ($pagination())
    <footer class="container">
      <nav aria-label="{{ __('Page', '__TEXT_DOMAIN__') }}">
        {!! $pagination !!}
      </nav>
    </footer>
  @endif
</article>
