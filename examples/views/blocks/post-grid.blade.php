@if (count($items))
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="post-grid {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance)>

  <div class="post-grid__inner container">
    <div class="post-grid__stack">
      {{-- Column classes stay literal per count so Tailwind's scanner finds them. --}}
      <ul class="post-grid__grid grid grid-cols-1 gap-8 @if ($columns >= 2) sm:grid-cols-2 @endif @if ($columns >= 4) lg:grid-cols-4 @elseif ($columns === 3) lg:grid-cols-3 @elseif ($columns === 1) lg:grid-cols-1 @else lg:grid-cols-2 @endif"
        id="{{ $paging['key'] }}">
        @foreach ($items as $item)
          {{-- The part is the <li>, never the card's stretched link (ENT-3). Capped at 8, the same ROW_CAP collection-paging.js uses, so a long page never waits seconds for its last card. --}}
          <li @entrancePart(min($loop->index, 8))>
            @include('partials.post-grid-card', ['item' => $item, 'linkText' => $linkText])
          </li>
        @endforeach
      </ul>

      @include('partials.collection-paging', ['paging' => $paging])
    </div>
  </div>
</section>
@endif
