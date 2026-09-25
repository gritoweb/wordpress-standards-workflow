@php
  $isCentered = $align === 'center';
  $isStatement = $bodyScale === 'statement';
  $stackAlign = $isCentered ? 'items-center text-center' : 'items-start text-left';

  $headingMeasure = $isStatement ? 'max-w-full' : ($measure === 'wide' ? 'max-w-full' : 'max-w-[min(57.5rem,100%)]');
  $bodyMeasure = $isStatement
      ? 'max-w-[65.25rem]'
      : ($measure === 'wide' ? 'max-w-[min(68.625rem,100%)]' : 'max-w-[min(55.75rem,100%)]');
  $bodyTypeClass = $isStatement
      ? 'heading-4 heading-regular text-[length:var(--text-h5)] leading-[var(--text-h5--line-height)] xl:text-[length:var(--text-h4)] xl:leading-[var(--text-h4--line-height)]'
      : 'text-lead';

  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'heading' => $heading !== '',
    'body' => $body !== '',
    'cta' => $hasCta,
  ]);
  $hasContent = count(array_filter($parts, fn ($part) => $part !== null)) > 0;
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="section-intro {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance)>

  <div class="section-intro__inner container">
    <div class="section-intro__stack {{ $stackAlign }} flex flex-col gap-8">
      @if ($heading !== '')
        <h2 class="section-intro__heading heading-2 {{ $headingMeasure }} mt-0 text-[color:var(--color-ink)]"
          @entrancePart($parts['heading'])>{{ $heading }}</h2>
      @endif

      @if ($body !== '')
        <div class="section-intro__body {{ $bodyTypeClass }} {{ $bodyMeasure }} mt-0 text-[color:var(--color-ink)]"
          @entrancePart($parts['body'])>{!! $body !!}</div>
      @endif

      @if ($hasCta)
        <a class="section-intro__cta btn {{ $ctaButtonClass }} {{ $ctaIconClass }} w-full sm:w-auto"
          href="{!! esc_url($ctaUrl) !!}"
          @if ($ctaNew) target="_blank" @endif
          @entrancePart($parts['cta'])>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
      @endif
    </div>
  </div>
</section>
@endif
