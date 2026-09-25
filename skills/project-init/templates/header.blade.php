@php
  // With no menu assigned yet, list the pages so a fresh install never ships an empty header.
  $pageList = fn () => '<ul class="site-nav__menu">'
      .wp_list_pages(['title_li' => '', 'depth' => 2, 'echo' => false])
      .'</ul>';
@endphp

<header class="site-header">
  <div class="site-header__inner">
    {{-- The logo comes from Appearance › Customize › Site Identity; the site name stands in until one is set. --}}
    @if (has_custom_logo())
      <div class="site-header__brand">{!! get_custom_logo() !!}</div>
    @else
      <a class="site-header__brand" href="{{ home_url('/') }}">{!! $siteName !!}</a>
    @endif

    <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav"
      data-nav-toggle>
      <span class="sr-only">{{ __('Menu', '__TEXT_DOMAIN__') }}</span>
      <span class="site-header__toggle-bar" aria-hidden="true"></span>
    </button>

    <nav id="site-nav" class="site-nav" aria-label="{{ __('Primary', '__TEXT_DOMAIN__') }}" data-nav>
      {!! wp_nav_menu([
          'theme_location' => 'primary_navigation',
          'container' => false,
          'menu_class' => 'site-nav__menu',
          'fallback_cb' => $pageList,
          'echo' => false,
      ]) !!}
    </nav>
  </div>
</header>
