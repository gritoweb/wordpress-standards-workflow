{{--
  Template Name: Styleguide
--}}
{{-- Dev-only page (private): the design system rendered from the live tokens through StyleGuide.php. --}}
@extends('layouts.app')

@section('content')
  <style>
    /* Page layout only, scoped to .styleguide; specimens use the theme's own tokens and classes. */
    .styleguide .sg-header {
      padding-block: 4rem 2rem;
      border-bottom: 1px solid var(--color-border);
    }

    .styleguide .sg-header>*+* {
      margin-top: 1rem;
    }

    .styleguide .sg-section {
      padding-block: 2rem;
    }

    .styleguide .sg-section-header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    .styleguide .sg-eyebrow {
      display: block;
      margin-bottom: 0.5rem;
      font-size: var(--text-small);
      line-height: var(--text-small--line-height);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-muted);
    }

    .styleguide .sg-subheading {
      margin-block: 2rem 1rem;
    }

    /* min(<fixed>, 100%) lets a track collapse when the container is narrower. */
    .styleguide .sg-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
    }

    .styleguide .sg-grid-wide {
      grid-template-columns: repeat(auto-fill, minmax(min(24rem, 100%), 1fr));
    }

    /* A 384px Figma field plus the tile's 1.5rem padding. */
    .styleguide .sg-grid-forms {
      grid-template-columns: repeat(auto-fill, minmax(min(27rem, 100%), 1fr));
    }

    .styleguide .sg-grid-swatches {
      grid-template-columns: repeat(auto-fill, minmax(min(8.5rem, 100%), 1fr));
      gap: 1rem;
    }

    .styleguide .sg-tile {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
    }

    .styleguide .sg-tile-span {
      grid-column: 1 / -1;
    }

    .styleguide .sg-specimen {
      flex: 1;
      min-width: 0;
    }

    .styleguide .sg-label {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: var(--text-small);
      line-height: var(--text-small--line-height);
      color: var(--color-muted);
      word-break: break-word;
    }

    .styleguide .sg-label small {
      font-size: 0.6875rem;
      word-break: normal;
    }

    .styleguide .sg-name {
      color: var(--color-ink);
      font-weight: 600;
    }

    .styleguide .sg-swatch {
      aspect-ratio: 4 / 3;
      border-radius: var(--radius-button);
      border: 1px solid var(--color-border);
    }

    .styleguide .sg-list {
      display: grid;
      gap: 0.75rem;
      padding: 0;
      list-style: none;
    }

    /* Specimens keep their width and scroll instead of squeezing. */
    .styleguide .sg-scroll {
      overflow-x: auto;
    }
  </style>

  <div class="styleguide">
    <div class="container">
      <header class="sg-header">
        <h1>{{ get_bloginfo('name') }} {{ __('design system', '__TEXT_DOMAIN__') }}</h1>
        <p class="text-lead">
          {{ __('The theme foundation and components, rendered with the real tokens and classes, so what you see here is what the site uses.', '__TEXT_DOMAIN__') }}
        </p>
        <p class="text-small">
          {{ __('Tokens in', '__TEXT_DOMAIN__') }} <code>resources/css/global/</code>
          · {{ __('display font', '__TEXT_DOMAIN__') }}: {{ $fontFamilies['display'] ?? '' }}
          · {{ __('body font', '__TEXT_DOMAIN__') }}: {{ $fontFamilies['body'] ?? '' }}
          · {{ __('dev page, not for production', '__TEXT_DOMAIN__') }}
        </p>
      </header>


      <section class="sg-section" id="typography" aria-labelledby="typography-title">
        <div class="sg-section-header">
          <span class="sg-eyebrow">01</span>
          <h2 id="typography-title">{{ __('Typography', '__TEXT_DOMAIN__') }}</h2>
        </div>

        @foreach ($typeGroups as $group => $rows)
          <h3 class="heading-6 sg-subheading">{{ $group }}</h3>
          <div class="sg-grid sg-grid-wide">
            @foreach ($rows as $row)
              <div class="sg-tile {{ $row['level'] && $row['level'] <= 2 ? 'sg-tile-span' : '' }}">
                <div class="sg-specimen">
                  @if ($row['level'])
                    <h{{ $row['level'] }}>{{ __('The quick brown fox', '__TEXT_DOMAIN__') }}</h{{ $row['level'] }}>
                    @else
                      <p
                        style="font-family: var(--font-body); font-size: var({{ $row['token'] }}); line-height: var({{ $row['token'] }}--line-height, normal); font-weight: {{ $row['fontWeight'] ?? 'normal' }}; letter-spacing: var({{ $row['token'] }}--letter-spacing, normal); margin: 0;">
                        {{ __('The quick brown fox jumps over the lazy dog', '__TEXT_DOMAIN__') }}
                      </p>
                  @endif
                </div>
                <p class="sg-label">
                  <span class="sg-name">{{ $row['level'] ? 'h' . $row['level'] : $row['step'] }}</span>
                  · {{ $row['token'] }}
                  <br>{{ $row['size'] ?? '' }} / {{ $row['lineHeight'] ?? '' }} / {{ $row['fontWeight'] ?? '' }} /
                  {{ $row['letterSpacing'] ?? '' }}
                  @if ($row['mobile'])
                    <br>{{ __('mobile', '__TEXT_DOMAIN__') }} {{ $row['mobile']['size'] ?? '' }} /
                    {{ $row['mobile']['lineHeight'] ?? '' }} / {{ $row['mobile']['letterSpacing'] ?? '' }}
                  @endif
                </p>
              </div>
            @endforeach
          </div>
        @endforeach
      </section>

      <section class="sg-section" id="color" aria-labelledby="color-title">
        <div class="sg-section-header">
          <span class="sg-eyebrow">02</span>
          <h2 id="color-title">{{ __('Color', '__TEXT_DOMAIN__') }}</h2>
        </div>

        @foreach ($colorGroups as $group => $swatches)
          <h3 class="heading-6 sg-subheading">{{ $group }}</h3>
          <div class="sg-grid sg-grid-swatches">
            @foreach ($swatches as $swatch)
              <div class="sg-tile" title="{{ $swatch['token'] ?? '' }}">
                <div class="sg-swatch" style="background-color: var({{ $swatch['token'] }});"></div>
                <p class="sg-label">
                  <span class="sg-name">{{ $swatch['name'] ?? $swatch['token'] }}</span>
                  <br>{{ $swatch['value'] }}
                  @if (!empty($swatch['figma']))
                    <br><small>{!! str_replace('/', '/<wbr>', e($swatch['figma'])) !!}</small>
                  @endif
                </p>
              </div>
            @endforeach
          </div>
        @endforeach
      </section>

      <section class="sg-section" id="spacing" aria-labelledby="spacing-title">
        <div class="sg-section-header">
          <span class="sg-eyebrow">03</span>
          <h2 id="spacing-title">{{ __('Spacing', '__TEXT_DOMAIN__') }}</h2>
        </div>

        <h3 class="heading-6 sg-subheading">{{ __('Layout', '__TEXT_DOMAIN__') }}</h3>
        <ul class="sg-list">
          @foreach ($spacingTokens as $token)
            <li class="sg-label"><span class="sg-name">{{ $token['token'] }}</span> {{ $token['value'] }}</li>
          @endforeach
        </ul>

        <h3 class="heading-6 sg-subheading">{{ __('Radius', '__TEXT_DOMAIN__') }}</h3>
        <div class="sg-grid sg-grid-swatches">
          @foreach ($radiusTokens as $token)
            <div class="sg-tile">
              <div class="sg-swatch"
                style="border: 2px solid var(--color-ink); border-radius: var({{ $token['token'] }});"></div>
              <p class="sg-label"><span class="sg-name">{{ $token['token'] }}</span><br>{{ $token['value'] }}</p>
            </div>
          @endforeach
        </div>

        <h3 class="heading-6 sg-subheading">{{ __('Shadow', '__TEXT_DOMAIN__') }}</h3>
        <div class="sg-grid sg-grid-swatches">
          @foreach ($shadowTokens as $token)
            <div class="sg-tile">
              <div class="sg-swatch"
                style="background-color: var(--color-light); box-shadow: var({{ $token['token'] }});"></div>
              <p class="sg-label"><span class="sg-name">{{ $token['token'] }}</span></p>
            </div>
          @endforeach
        </div>
      </section>

      <section class="sg-section" id="buttons" aria-labelledby="buttons-title">
        <div class="sg-section-header">
          <span class="sg-eyebrow">04</span>
          <h2 id="buttons-title">{{ __('Buttons', '__TEXT_DOMAIN__') }}</h2>
        </div>

        <div class="sg-grid">
          <div class="sg-tile sg-tile-span">
            <div class="sg-specimen" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
              <a class="btn btn-primary" href="#buttons">{{ __('Primary', '__TEXT_DOMAIN__') }}</a>
              <a class="btn btn-secondary" href="#buttons">{{ __('Secondary', '__TEXT_DOMAIN__') }}</a>
              <button class="btn btn-primary" type="button" disabled>{{ __('Disabled', '__TEXT_DOMAIN__') }}</button>
            </div>
            <p class="sg-label">.btn-primary · .btn-secondary · :disabled</p>
          </div>
        </div>
      </section>

      <section class="sg-section" id="forms" aria-labelledby="forms-title">
        <div class="sg-section-header">
          <span class="sg-eyebrow">05</span>
          <h2 id="forms-title">{{ __('Forms', '__TEXT_DOMAIN__') }}</h2>
        </div>

        <div class="sg-tile">
          <div style="display: grid; gap: 1rem; max-width: 30rem;">
            <label>{{ __('Text', '__TEXT_DOMAIN__') }} <input type="text"
                placeholder="{{ __('Placeholder', '__TEXT_DOMAIN__') }}"></label>
            <label>{{ __('Email', '__TEXT_DOMAIN__') }} <input type="email"></label>
            <label>{{ __('Message', '__TEXT_DOMAIN__') }}
              <textarea rows="3"></textarea>
            </label>
            <label>{{ __('Choice', '__TEXT_DOMAIN__') }}
              <select>
                <option>{{ __('One', '__TEXT_DOMAIN__') }}</option>
                <option>{{ __('Two', '__TEXT_DOMAIN__') }}</option>
              </select>
            </label>
            <label><input type="checkbox" checked> {{ __('Checkbox', '__TEXT_DOMAIN__') }}</label>
            <label><input type="radio" name="styleguide-radio" checked> {{ __('Radio', '__TEXT_DOMAIN__') }}</label>
            <label>{{ __('Disabled', '__TEXT_DOMAIN__') }} <input type="text" disabled></label>
          </div>
        </div>
      </section>

      <section class="sg-section" id="components" aria-labelledby="components-title">
        <div class="sg-section-header">
          <span class="sg-eyebrow">06</span>
          <h2 id="components-title">{{ __('Components', '__TEXT_DOMAIN__') }}</h2>
        </div>

        <x-alert>{{ __('Default alert.', '__TEXT_DOMAIN__') }}</x-alert>
        <x-alert type="success">{{ __('Success alert.', '__TEXT_DOMAIN__') }}</x-alert>
        <x-alert type="caution">{{ __('Caution alert.', '__TEXT_DOMAIN__') }}</x-alert>
        <x-alert type="warning">{{ __('Warning alert.', '__TEXT_DOMAIN__') }}</x-alert>
      </section>
    </div>
  </div>
@endsection
