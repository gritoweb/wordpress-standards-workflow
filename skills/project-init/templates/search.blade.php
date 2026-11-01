@extends('layouts.app')

@section('content')
  <section class="container py-16 md:py-24">
    <h1 class="heading-1">{{ sprintf(__('Search: %s', '__TEXT_DOMAIN__'), get_search_query()) }}</h1>

    @if (! have_posts())
      <p class="mt-4 text-lead text-muted">{{ __('Nothing matched that search. Try different words.', '__TEXT_DOMAIN__') }}</p>
      <div class="mt-8">{!! get_search_form(false) !!}</div>
    @endif

    @while (have_posts())
      @php(the_post())
      <article class="mt-10">
        <h2 class="heading-4"><a href="{!! esc_url(get_permalink()) !!}">{{ get_the_title() }}</a></h2>
        <p class="mt-2 text-body text-muted">{{ get_the_excerpt() }}</p>
      </article>
    @endwhile

    <div class="mt-12">{!! get_the_posts_navigation() !!}</div>
  </section>
@endsection
