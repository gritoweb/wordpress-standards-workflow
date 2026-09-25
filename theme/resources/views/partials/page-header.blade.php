{{-- The page title is the page's h1, on every page, with no exception.

     On a page built from blocks it renders visually hidden: sr-only is the
     theme's clip-based visually-hidden utility, out of flow, so it takes no
     layout space and the first block stays flush under the site header,
     while the title stays in the accessibility tree.

     On the templates that render a query (the blog index, an archive) it is
     the page's only heading, so it renders as a real header. --}}
@if ($visibleTitle)
    <div class="page-header">
        <div class="page-header__inner container">
            <h1 class="page-header__title heading-1 m-0">{!! wp_kses($title, ['span' => []]) !!}</h1>

            @if ($subtitle)
                <p class="page-header__subtitle text-lead m-0">{{ $subtitle }}</p>
            @endif
        </div>
    </div>
@else
    @if (filled($title))
        <h1 class="sr-only">{!! wp_kses($title, ['span' => []]) !!}</h1>
    @endif
@endif
