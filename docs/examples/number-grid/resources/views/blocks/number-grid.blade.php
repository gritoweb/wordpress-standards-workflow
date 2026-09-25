<section @if ($anchor) id="{{ $anchor }}" @endif
  class="number-grid @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface" @entrance($entrance)>
  <div class="container">
    @if ($title)
      <h2 @entrancePart(0) class="heading-2 mb-12 text-center">{{ $title }}</h2>
    @endif

    <dl class="grid grid-cols-2 gap-8 md:grid-cols-4">
      @foreach ($items as $item)
        <div @entrancePart($loop->index + 1) class="flex flex-col-reverse text-center">
          <dt class="text-small text-muted mt-2">{{ $item['label'] }}</dt>
          <dd class="heading-1 text-primary m-0">{{ $item['value'] }}</dd>
        </div>
      @endforeach
    </dl>
  </div>
</section>
