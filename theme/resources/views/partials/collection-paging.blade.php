{{-- The paging control under a collection block. $paging comes from
     App\Content\Paging::paginate(). Behavior/styles:
     resources/blocks/components/frontend/collection-paging.{js,css} --}}
@if ($paging['more'])
    <div class="collection-paging" data-paging="{{ $paging['key'] }}"
        data-paging-timeout-message="{{ __('This is taking too long. Try again.', '__TEXT_DOMAIN__') }}">
        <a class="collection-paging__step btn-link" href="{!! esc_url($paging['more']) !!}" data-paging-more>
            {{ $paging['label'] }}
        </a>
    </div>
@elseif ($paging['pages'])
    <nav class="collection-paging collection-paging--pager" data-paging="{{ $paging['key'] }}"
        aria-label="{{ __('Pages', '__TEXT_DOMAIN__') }}">
        <ul class="collection-paging__pages">
            @if ($paging['prev'])
                <li>
                    <a class="collection-paging__step" href="{!! esc_url($paging['prev']) !!}"
                        rel="prev">{{ __('Previous', '__TEXT_DOMAIN__') }}</a>
                </li>
            @endif

            @foreach ($paging['pages'] as $page)
                <li>
                    @if ($page['current'])
                        <span class="collection-paging__page" aria-current="page">{{ $page['number'] }}</span>
                    @else
                        <a class="collection-paging__page" href="{!! esc_url($page['url']) !!}"
                            aria-label="{{ sprintf(__('Page %d', '__TEXT_DOMAIN__'), $page['number']) }}">{{ $page['number'] }}</a>
                    @endif
                </li>
            @endforeach

            @if ($paging['next'])
                <li>
                    <a class="collection-paging__step" href="{!! esc_url($paging['next']) !!}"
                        rel="next">{{ __('Next', '__TEXT_DOMAIN__') }}</a>
                </li>
            @endif
        </ul>
    </nav>
@endif
