@php
  // Details that share a name form an exclusive group: opening one closes the others.
  $group = 'accordion-' . wp_unique_id();
@endphp

<section @if ($anchor) id="{{ $anchor }}" @endif class="accordion @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface"
  @entrance($entrance)>
  <div class="container grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
    <div class="lg:col-span-5">
      @if ($title)
        <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
      @endif

      @if ($description)
        <div @entrancePart(1) class="text-body text-muted mt-4">{!! $description !!}</div>
      @endif
    </div>

    <div class="space-y-3 lg:col-span-7">
      @foreach ($items as $item)
        <details name="{{ $group }}" @if ($loop->first) open @endif @entrancePart($loop->index + 2)
          class="accordion__item card open:border-primary/30 group">
          <summary
            class="heading-6 group-open:text-primary flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left [&::-webkit-details-marker]:hidden">
            <span>{{ $item['title'] }}</span>
            <svg class="text-muted h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-180"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          @if ($item['body'])
            <div class="border-border text-small text-muted border-t px-5 pb-5 pt-3">{!! $item['body'] !!}</div>
          @endif
        </details>
      @endforeach
    </div>
  </div>
</section>
