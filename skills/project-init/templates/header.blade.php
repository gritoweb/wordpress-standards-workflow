@php
  // WordPress prints the menu's <li>/<a>, so they are styled from the <ul> with Tailwind variants.
  $menuClass = implode(' ', [
      'm-0 list-none p-0 lg:flex lg:items-center lg:gap-1',
      '[&_ul]:m-0 [&_ul]:list-none [&_ul]:p-0 [&_ul]:pl-4',
      '[&_a]:block [&_a]:rounded-button [&_a]:px-3 [&_a]:py-3 [&_a]:font-medium [&_a]:text-ink [&_a]:no-underline',
      '[&_a]:transition-colors [&_a]:duration-150 motion-reduce:[&_a]:transition-none lg:[&_a]:py-2',
      '[&_a:hover]:bg-primary-light [&_a:hover]:text-primary [&_a:focus-visible]:bg-primary-light [&_a:focus-visible]:text-primary',
      '[&_.current-menu-item>a]:text-primary [&_.current_page_item>a]:text-primary',
      'lg:[&_li]:relative lg:[&_ul]:invisible lg:[&_ul]:absolute lg:[&_ul]:top-full lg:[&_ul]:left-0 lg:[&_ul]:min-w-48',
      'lg:[&_ul]:rounded-button lg:[&_ul]:bg-light lg:[&_ul]:p-2 lg:[&_ul]:shadow-card',
      'lg:[&_ul]:opacity-0 lg:[&_ul]:transition-opacity lg:[&_ul]:duration-150',
      'lg:[&_li:hover>ul]:visible lg:[&_li:hover>ul]:opacity-100 lg:[&_li:focus-within>ul]:visible lg:[&_li:focus-within>ul]:opacity-100',
  ]);

  // With no menu assigned yet, list the pages so a fresh install never ships an empty header.
  $pageList = fn () => '<ul class="'.$menuClass.'">'
      .wp_list_pages(['title_li' => '', 'depth' => 2, 'echo' => false])
      .'</ul>';
@endphp

{{-- navigation.js toggles .is-open on .site-header; the group-[.is-open] variants react to it. --}}
<header class="site-header group sticky top-0 z-50 border-b border-border bg-light [.admin-bar_&]:top-[var(--wp-admin--admin-bar--height,0px)]">
  <div class="container relative flex min-h-18 items-center justify-between gap-6">
    {{-- The logo comes from Appearance › Customize › Site Identity; the site name stands in until one is set. --}}
    @if (has_custom_logo())
      <div class="[&_img]:block [&_img]:max-h-12 [&_img]:w-auto">{!! get_custom_logo() !!}</div>
    @else
      <a class="heading-5 text-ink no-underline" href="{{ home_url('/') }}">{!! $siteName !!}</a>
    @endif

    <button class="relative size-11 cursor-pointer rounded-button border-0 bg-transparent p-0 text-ink lg:hidden"
      type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
      <span class="sr-only">{{ __('Menu', '__TEXT_DOMAIN__') }}</span>
      @foreach (['-translate-y-[7px] group-[.is-open]:translate-y-0 group-[.is-open]:rotate-45', 'group-[.is-open]:opacity-0', 'translate-y-[7px] group-[.is-open]:translate-y-0 group-[.is-open]:-rotate-45'] as $bar)
        <span aria-hidden="true"
          class="absolute top-1/2 left-1/2 -mt-px -ml-[11px] h-0.5 w-[22px] bg-current transition duration-200 motion-reduce:transition-none {{ $bar }}"></span>
      @endforeach
    </button>

    <nav id="site-nav" aria-label="{{ __('Primary', '__TEXT_DOMAIN__') }}" data-nav
      class="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-border bg-light px-5 pt-3 pb-5 group-[.is-open]:block lg:static lg:block lg:max-h-none lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0">
      {!! wp_nav_menu([
          'theme_location' => 'primary_navigation',
          'container' => false,
          'menu_class' => $menuClass,
          'fallback_cb' => $pageList,
          'echo' => false,
      ]) !!}
    </nav>
  </div>
</header>
