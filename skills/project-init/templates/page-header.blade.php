{{-- A block-built page has its own <h1> in its hero, so the title prints only over plain content. --}}
@if ($isPlain())
  <div class="container pt-8 md:pt-16">
    <h1 class="heading-1 mb-8">{!! $title !!}</h1>
  </div>
@endif
