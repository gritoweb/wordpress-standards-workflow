@php
  $showMedia = $media === 'logo' || ($media === 'image' && $image !== '');
  $hasContent = $heading !== '' || $showMedia;
  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'media' => $showMedia,
    'heading' => $heading !== '',
    'cue' => $showScrollCue,
  ]);
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="statement-hero {{ $groundClass }} relative flex min-h-[36.1875rem] flex-col lg:min-h-[63.3125rem] @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)"
  @entrance($entrance)>
  <div class="statement-hero__inner container flex flex-1 flex-col">
    @if ($media === 'logo')
      <span class="statement-hero__logo mt-[5.625rem] lg:mt-32" role="img" aria-label="{{ $siteName }}"
        @entrancePart($parts['media'])></span>
    @elseif ($media === 'image' && $image !== '')
      <div class="statement-hero__media mt-[5.625rem] lg:mt-32"
        @entrancePart($parts['media'])>
        {!! $image !!}
      </div>
    @endif

    @if ($heading !== '')
      {{-- An h2, not the page's h1 (rendered by the page layout): the
           statement is the section's own headline. heading-1 carries the
           display type on the smaller tag. --}}
      <h2 class="statement-hero__heading heading-1 heading-regular mx-auto mt-[3.625rem] max-w-[58.25rem] text-center lg:mt-[12.5rem]"
        @entrancePart($parts['heading'])>{!! $heading !!}</h2>
    @endif

    @if ($showScrollCue)
      {{-- A control, not an ornament: it eases to whatever section follows.
           It ships hidden and the shared scroll-cue script reveals it only
           when there is something below to scroll to, so it can never point
           at nothing. --}}
      <div class="mt-auto flex justify-center pb-4 pt-12 lg:pb-12">
        <button type="button" class="statement-hero__cue"
          aria-label="{{ __('Scroll to the next section', '__TEXT_DOMAIN__') }}"
          data-scroll-cue data-scroll-header-selector="{{ $headerSelector }}"
          @entrancePart($parts['cue']) hidden></button>
      </div>
    @endif
  </div>
</section>
@endif
