{{-- Logo and menu are WordPress's own: Customize › Site Identity, and Appearance › Menus › "Footer". --}}
<footer class="border-t border-border bg-surface">
  <div class="container flex flex-wrap items-center justify-between gap-6 py-12">
    <div class="[&_img]:block [&_img]:max-h-10 [&_img]:w-auto">
      @if (has_custom_logo())
        {!! get_custom_logo() !!}
      @else
        <a href="{{ home_url('/') }}" class="heading-5 text-ink no-underline">{!! $siteName !!}</a>
      @endif
    </div>

    @if (has_nav_menu('footer_navigation'))
      <nav aria-label="{{ __('Footer', '__TEXT_DOMAIN__') }}">
        {!! wp_nav_menu([
            'theme_location' => 'footer_navigation',
            'container' => false,
            'menu_class' => 'm-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 [&_a]:text-ink [&_a]:no-underline [&_a:hover]:text-primary',
            'depth' => 1,
            'echo' => false,
        ]) !!}
      </nav>
    @endif

    <p class="m-0 basis-full text-small text-muted">&copy; {{ date('Y') }} {!! $siteName !!}</p>
  </div>
</footer>
