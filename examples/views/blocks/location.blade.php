@php
  $mediaFirst = $mediaPosition === 'left';

  $hasOffice = $officeLabel !== '' || $addressLine1 !== '' || $addressLine2 !== '' || $phone !== '' || $fax !== '';
  $hasContact = $contactName !== '' || $contactRole !== '' || $contactPhone !== '' || $email !== '';
  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'city' => $city !== '',
    'office' => $hasOffice,
    'contact' => $hasContact,
    'cta' => $hasCta,
    'media' => $hasMap,
  ]);
  $hasAnything = count(array_filter($parts, fn ($part) => $part !== null)) > 0;

  // The theme draws icons as a CSS mask on a span coloured by currentColor.
  // block.css is served from source, so its mask urls are relative to the
  // block folder, not the @images alias.
  $icon = fn (string $name) => '<span class="location__icon location__icon--'.$name.'" aria-hidden="true"></span>';
@endphp

@if ($hasAnything)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="location {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance, "--location-pt-d: {$paddingVertDesktop}px")>

  <div class="location__inner container">
    <div class="location__row {{ $mediaFirst ? 'xl:flex-row-reverse' : '' }} flex flex-col items-stretch gap-10 xl:flex-row xl:items-start xl:gap-16">

      <div class="location__content min-w-0 max-w-full xl:flex-[0_1_36rem]">
        @if ($city !== '')
          <h2 class="location__city heading-2" @entrancePart($parts['city'])>{{ $city }}</h2>
        @endif

        @if ($hasOffice || $hasContact || $hasCta)
          <div class="location__details {{ $city ? 'mt-12' : '' }} flex flex-col gap-8">

            @if ($hasOffice)
              <div class="location__group" @entrancePart($parts['office'])>
                @if ($officeLabel)
                  <p class="location__group-label m-0 font-bold text-[color:var(--color-ink)]">{{ $officeLabel }}</p>
                @endif

                <div class="location__lines {{ $officeLabel ? 'mt-3' : '' }}">
                  @if ($addressLine1)
                    <p class="location__line m-0 flex gap-3 text-[color:var(--color-ink)]">
                      {!! $icon('location-marker') !!}
                      <span>{{ $addressLine1 }}</span>
                    </p>
                  @endif

                  @if ($addressLine2)
                    <p class="location__line location__line--indent m-0 text-[color:var(--color-ink)]">{{ $addressLine2 }}</p>
                  @endif

                  @if ($phone)
                    <p class="location__line m-0 flex gap-3 text-[color:var(--color-ink)]">
                      {!! $icon('phone') !!}
                      <span>{{ $phone }}</span>
                    </p>
                  @endif

                  @if ($fax)
                    <p class="location__line m-0 flex gap-3 text-[color:var(--color-ink)]">
                      {!! $icon('newspaper') !!}
                      <span>{{ $fax }}</span>
                    </p>
                  @endif
                </div>
              </div>
            @endif

            @if ($hasContact)
              <div class="location__group" @entrancePart($parts['contact'])>
                @if ($contactLabel)
                  <p class="location__group-label m-0 font-bold text-[color:var(--color-ink)]">{{ $contactLabel }}</p>
                @endif

                <div class="location__lines {{ $contactLabel ? 'mt-3' : '' }}">
                  @if ($contactName)
                    <p class="location__line m-0 flex gap-3 text-[color:var(--color-ink)]">
                      {!! $icon('user-circle') !!}
                      <span>{{ $contactName }}</span>
                    </p>
                  @endif

                  @if ($contactRole)
                    <p class="location__line location__line--indent location__line--role m-0 text-[color:var(--color-ink)]">{{ $contactRole }}</p>
                  @endif

                  @if ($contactPhone)
                    <p class="location__line m-0 flex gap-3 text-[color:var(--color-ink)]">
                      {!! $icon('phone') !!}
                      <span>{{ $contactPhone }}</span>
                    </p>
                  @endif

                  @if ($email)
                    <p class="location__line location__line--mail m-0 flex gap-3 text-[color:var(--color-ink)]">
                      {!! $icon('mail') !!}
                      <a class="underline" href="{!! esc_url($emailUrl) !!}">{{ $email }}</a>
                    </p>
                  @endif
                </div>
              </div>
            @endif

            @if ($hasCta)
              <a
                class="location__cta btn btn-primary {{ $ctaIconClass }} self-start"
                href="{!! esc_url($ctaUrl) !!}"
                @entrancePart($parts['cta'])
                @if ($ctaNew) target="_blank" @endif
              >{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
            @endif
          </div>
        @endif
      </div>

      {{-- No key or no coordinates renders NOTHING here, not an empty box: an
           unfilled frame reads as a broken map. The address, the contact
           block and the CTA all stand on their own above. --}}
      @if ($hasMap)
        <div class="location__media min-w-0 max-w-full xl:flex-[0_1_37rem]" @entrancePart($parts['media'])>
          {{-- The text equivalent is a SIBLING, not role="img" on the frame:
               Google injects its own logo and its mandatory Terms link into
               that container, and role="img" would drop every descendant
               from the accessibility tree while leaving them in the tab
               order. Those two links are a licence condition and stay
               reachable. --}}
          {{-- translators: %s: the office address, or its city. --}}
          <p class="location__map-label">
            {{ $mapLabel !== '' ? sprintf(__('Map of %s', '__TEXT_DOMAIN__'), $mapLabel) : __('Office location map', '__TEXT_DOMAIN__') }}
          </p>

          <div
            class="location__map"
            data-lat="{{ $latitude }}"
            data-lng="{{ $longitude }}"
            data-zoom="{{ $zoom }}"
            data-label="{{ $mapLabel }}"
          ></div>
        </div>
      @endif
    </div>
  </div>
</section>
@endif
